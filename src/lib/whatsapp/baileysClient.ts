import "server-only";
import path from "node:path";
import pino from "pino";
import QRCode from "qrcode";
import type { Boom } from "@hapi/boom";
import makeWASocket, {
  useMultiFileAuthState as loadMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  jidDecode,
  isJidGroup,
  isJidBroadcast,
  isJidStatusBroadcast,
  type WASocket,
  type WAMessage,
  type BaileysEventMap,
} from "@whiskeysockets/baileys";
import { recordInboundMessage } from "@/lib/whatsapp/recordInboundMessage";
import { findOrCreateContact } from "@/lib/whatsapp/findOrCreateContact";
import { createAdminClient } from "@/lib/supabase/admin";

export type BaileysStatus = "connecting" | "qr" | "connected";

interface BaileysState {
  status: BaileysStatus;
  qrDataUrl: string | null;
  phoneNumber: string | null;
  sock: WASocket | null;
  starting: boolean;
}

declare global {
  var __baileysStates: Map<string, BaileysState> | undefined;
}

function getStatesMap(): Map<string, BaileysState> {
  if (!globalThis.__baileysStates) {
    globalThis.__baileysStates = new Map();
  }
  return globalThis.__baileysStates;
}

function getState(tenantId: string): BaileysState {
  const states = getStatesMap();
  let state = states.get(tenantId);
  if (!state) {
    state = { status: "connecting", qrDataUrl: null, phoneNumber: null, sock: null, starting: false };
    states.set(tenantId, state);
  }
  return state;
}

export function getBaileysState(tenantId: string) {
  return getState(tenantId);
}

export function getBaileysSocket(tenantId: string) {
  return getState(tenantId).sock;
}

function authFolderFor(tenantId: string) {
  return path.join(process.cwd(), ".baileys_auth", tenantId);
}

const logger = pino({ level: "silent" });

// Serializa o processamento dos pedaços de messaging-history.set por tenant —
// o evento pode disparar várias vezes em sequência, e processá-los em
// paralelo poderia criar contatos duplicados pro mesmo número (contacts.phone
// não tem constraint unique).
const historyImportQueues = new Map<string, Promise<void>>();

export async function startBaileysConnection(tenantId: string) {
  const state = getState(tenantId);
  if (state.starting || state.sock) return;
  state.starting = true;

  const { state: authState, saveCreds } = await loadMultiFileAuthState(authFolderFor(tenantId));
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: authState,
    logger,
    version,
  });

  state.sock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      state.qrDataUrl = await QRCode.toDataURL(qr);
      state.status = "qr";
    }

    if (connection === "open") {
      const decoded = jidDecode(sock.user?.id);
      state.phoneNumber = decoded ? `+${decoded.user}` : null;
      state.status = "connected";
      state.qrDataUrl = null;
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      state.sock = null;
      state.status = "connecting";
      state.qrDataUrl = null;
      state.starting = false;

      if (loggedOut) {
        state.phoneNumber = null;
        console.error(
          `Baileys (tenant ${tenantId}): sessão desconectada pelo celular — escaneie um novo QR code`,
        );
      } else {
        setTimeout(() => {
          void startBaileysConnection(tenantId);
        }, 3000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      try {
        await handleInboundMessage(tenantId, sock, msg, state.phoneNumber);
      } catch (err) {
        console.error(`Baileys (tenant ${tenantId}): falha ao registrar mensagem recebida`, err);
      }
    }
  });

  sock.ev.on("messaging-history.set", (payload) => {
    const queue = historyImportQueues.get(tenantId) ?? Promise.resolve();
    historyImportQueues.set(
      tenantId,
      queue
        .then(() => processHistorySync(tenantId, sock, payload, state.phoneNumber))
        .catch((err) => console.error(`Baileys (tenant ${tenantId}): falha ao importar histórico`, err)),
    );
  });

  state.starting = false;
}

/**
 * WhatsApp vem migrando conversas individuais para endereçamento "LID"
 * (Linked ID) em vez do JID clássico baseado no número de telefone — nesse
 * caso `remoteJid` chega como `...@lid`, não `...@s.whatsapp.net`. Sem
 * resolver isso de volta pro número de telefone, mensagens recebidas eram
 * silenciosamente descartadas (o filtro só aceitava `s.whatsapp.net`),
 * enquanto mensagens enviadas continuavam aparecendo normalmente (são
 * gravadas direto pela rota de envio, não dependem desse resolvedor).
 */
async function resolvePhoneJid(sock: WASocket, jid: string): Promise<string | null> {
  const decoded = jidDecode(jid);
  if (!decoded) return null;

  if (decoded.server === "s.whatsapp.net") return jid;

  if (decoded.server === "lid" || decoded.server === "hosted.lid") {
    try {
      return await sock.signalRepository.lidMapping.getPNForLID(jid);
    } catch (err) {
      console.error("Baileys: falha ao resolver LID para número de telefone", err);
      return null;
    }
  }

  return null;
}

async function handleInboundMessage(
  tenantId: string,
  sock: WASocket,
  msg: WAMessage,
  myPhoneNumber: string | null,
) {
  if (msg.key.fromMe) return;

  const remoteJid = msg.key.remoteJid;
  if (!remoteJid || isJidGroup(remoteJid) || isJidBroadcast(remoteJid) || isJidStatusBroadcast(remoteJid)) {
    return;
  }

  const phoneJid = await resolvePhoneJid(sock, remoteJid);
  const decoded = phoneJid ? jidDecode(phoneJid) : null;
  if (!decoded) return;

  const body = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text;
  if (!body) return;

  await recordInboundMessage({
    tenantId,
    fromNumber: `+${decoded.user}`,
    toNumber: myPhoneNumber ?? "",
    externalMessageId: msg.key.id ?? null,
    body,
    contactName: msg.pushName,
  });
}

function toIsoTimestamp(ts: number | { toNumber?: () => number } | null | undefined): string {
  if (ts == null) return new Date().toISOString();
  const seconds = typeof ts === "number" ? ts : (ts.toNumber?.() ?? 0);
  return new Date(seconds * 1000).toISOString();
}

const HISTORY_BATCH_SIZE = 200;

type HistoryMessageRow = {
  tenant_id: string;
  contact_id: string;
  twilio_sid: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  body: string;
  status: "sent" | "received";
  created_at: string;
};

/**
 * Importa o sync de histórico "recente" que o WhatsApp manda ao conectar
 * (não pedimos syncFullHistory de propósito — esse é o número pessoal do
 * usuário, não vamos despejar anos de conversa pessoal no CRM de vendas).
 * Idempotente entre reconexões via upsert on-conflict em twilio_sid.
 */
async function processHistorySync(
  tenantId: string,
  sock: WASocket,
  payload: BaileysEventMap["messaging-history.set"],
  myPhoneNumber: string | null,
) {
  const supabase = createAdminClient();

  // Nome preferido por número, a partir da lista de contatos do próprio sync
  // (mais completa que o pushName, que só vem em mensagens inbound). O id
  // do contato também pode vir em formato LID, então resolve igual às mensagens.
  const nameByUser = new Map<string, string>();
  for (const c of payload.contacts) {
    const phoneJid = await resolvePhoneJid(sock, c.phoneNumber ?? c.id);
    const decoded = phoneJid ? jidDecode(phoneJid) : null;
    if (!decoded) continue;
    const name = c.name ?? c.notify;
    if (name) nameByUser.set(decoded.user, name);
  }

  const contactIdByUser = new Map<string, string | null>();
  const rows: HistoryMessageRow[] = [];

  for (const msg of payload.messages) {
    if (!msg.key.id) continue; // sem id não dá pra deduplicar — descarta

    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || isJidGroup(remoteJid) || isJidBroadcast(remoteJid) || isJidStatusBroadcast(remoteJid)) {
      continue;
    }

    const phoneJid = await resolvePhoneJid(sock, remoteJid);
    const decoded = phoneJid ? jidDecode(phoneJid) : null;
    if (!decoded) continue;

    const body = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text;
    if (!body) continue;

    const user = decoded.user;
    const theirNumber = `+${user}`;

    if (!contactIdByUser.has(user)) {
      const name = nameByUser.get(user) ?? msg.pushName ?? undefined;
      const contact = await findOrCreateContact(supabase, tenantId, theirNumber, name);
      contactIdByUser.set(user, contact?.id ?? null);
    }

    const contactId = contactIdByUser.get(user);
    if (!contactId) continue;

    const fromMe = !!msg.key.fromMe;

    rows.push({
      tenant_id: tenantId,
      contact_id: contactId,
      twilio_sid: msg.key.id,
      direction: fromMe ? "outbound" : "inbound",
      from_number: fromMe ? (myPhoneNumber ?? "") : theirNumber,
      to_number: fromMe ? theirNumber : (myPhoneNumber ?? ""),
      body,
      status: fromMe ? "sent" : "received",
      created_at: toIsoTimestamp(msg.messageTimestamp),
    });
  }

  if (!rows.length) return;

  for (let i = 0; i < rows.length; i += HISTORY_BATCH_SIZE) {
    const chunk = rows.slice(i, i + HISTORY_BATCH_SIZE);

    const { data: inserted, error } = await supabase
      .from("whatsapp_messages")
      .upsert(chunk, { onConflict: "twilio_sid", ignoreDuplicates: true })
      .select("id, contact_id, body, direction");

    if (error) {
      console.error(`Baileys (tenant ${tenantId}): falha ao importar lote de histórico`, error);
      continue;
    }

    console.log(
      `Baileys (tenant ${tenantId}): histórico — lote de ${chunk.length}, ${inserted?.length ?? 0} novas mensagens`,
    );

    if (!inserted?.length) continue;

    await supabase.from("activities").insert(
      inserted.map((m) => ({
        tenant_id: tenantId,
        contact_id: m.contact_id,
        type: "whatsapp" as const,
        direction: m.direction,
        body: m.body,
        whatsapp_message_id: m.id,
      })),
    );
  }
}
