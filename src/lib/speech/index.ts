import "server-only";

/**
 * Camada de fala (ouvir e falar) do SDR, separada do LLM.
 *
 * A OpenAI Chat Completions não faz síntese de voz aqui, então isto fala com um
 * endpoint compatível com a API de áudio da OpenAI (Whisper pra transcrever,
 * TTS pra gerar voz). É BYO-key igual ao resto: se SPEECH_API_KEY (ou
 * OPENAI_API_KEY) não estiver configurada, tudo aqui vira no-op silencioso — o
 * SDR continua funcionando só com texto e imagem, sem quebrar.
 *
 * SPEECH_API_BASE permite apontar pra qualquer serviço compatível (self-hosted
 * de Whisper, etc.), sem prender ninguém a um fornecedor.
 */

/**
 * Chave usada pra falar com a API de áudio.
 *
 * Prioridade: a chave passada pelo chamador (a do PRÓPRIO tenant, vinda de
 * tenant_integrations) e só depois as env vars. Isso importa: antes só existia
 * o caminho da env var, que o deploy nunca gravou — na prática ouvir/falar
 * ficava desligado em produção sem ninguém perceber. Com a chave do tenant, o
 * áudio passa a funcionar com a MESMA chave da OpenAI que o dono já colou em
 * Configurações, sem configuração extra nenhuma.
 */
function speechApiKey(explicitKey?: string | null): string | null {
  return explicitKey || process.env.SPEECH_API_KEY || process.env.OPENAI_API_KEY || null;
}

function speechApiBase(): string {
  return (process.env.SPEECH_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
}

/** true quando há chave configurada — pra decidir se vale tentar. */
export function isSpeechEnabled(explicitKey?: string | null): boolean {
  return speechApiKey(explicitKey) !== null;
}

/**
 * Transcreve um áudio (voz do lead) em texto. Devolve null se não houver chave
 * ou se a transcrição falhar — o chamador trata a ausência com elegância.
 */
export async function transcribeAudio(
  audio: Buffer,
  mimetype = "audio/ogg",
  explicitKey?: string | null,
): Promise<string | null> {
  const key = speechApiKey(explicitKey);
  if (!key) return null;

  const model = process.env.SPEECH_TRANSCRIBE_MODEL || "whisper-1";
  const ext = mimetype.includes("mpeg") ? "mp3" : mimetype.includes("wav") ? "wav" : "ogg";

  try {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audio)], { type: mimetype }), `audio.${ext}`);
    form.append("model", model);
    // Deixa o serviço detectar o idioma; a base costuma ser PT-BR mas não só.

    const res = await fetch(`${speechApiBase()}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (!res.ok) {
      console.error("transcribeAudio: HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch (err) {
    console.error("transcribeAudio falhou (ignorado):", err);
    return null;
  }
}

/**
 * Gera um áudio de voz (Ogg/Opus, pronto pra nota de voz do WhatsApp) a partir
 * de um texto. Devolve null se não houver chave ou se falhar.
 */
export async function synthesizeSpeech(text: string, explicitKey?: string | null): Promise<Buffer | null> {
  const key = speechApiKey(explicitKey);
  if (!key) return null;

  const clean = text.trim();
  if (!clean) return null;

  const model = process.env.SPEECH_TTS_MODEL || "gpt-4o-mini-tts";
  const voice = process.env.SPEECH_TTS_VOICE || "alloy";

  try {
    const res = await fetch(`${speechApiBase()}/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      // "opus" já sai em contêiner Ogg/Opus, que é o formato de nota de voz.
      body: JSON.stringify({ model, voice, input: clean.slice(0, 4000), response_format: "opus" }),
    });

    if (!res.ok) {
      console.error("synthesizeSpeech: HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error("synthesizeSpeech falhou (ignorado):", err);
    return null;
  }
}
