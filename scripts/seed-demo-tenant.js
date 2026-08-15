/**
 * Cria (ou recria) o tenant de DEMONSTRAÇÃO usado na gravação do vídeo do
 * produto. Tudo aqui é fictício de propósito: nenhum nome, telefone ou
 * negócio real de cliente aparece no vídeo.
 *
 *   node scripts/seed-demo-tenant.js
 *
 * Idempotente: se o tenant já existir, apaga os dados de demo e recria, pra
 * poder regravar quantas vezes precisar sempre do mesmo estado.
 */
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
require("dotenv").config({ path: ".env.local" });

const SLUG = "demo-plasticos";
const TENANT_NAME = "Plásticos Demonstração";
const OWNER_EMAIL = "demo@vorlo.com.br";
const OWNER_PASSWORD = "DemoVorlo2026!";
const OWNER_NAME = "Marina Duarte";

const uuid = () => crypto.randomUUID();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

/** Etapas do funil — mesma configuração que um CRM novo recebe. */
const STAGES = [
  { name: "Atendimento SDR", position: 1, color: "#6366f1", is_won: false, is_lost: false },
  { name: "Qualificado", position: 2, color: "#0ea5e9", is_won: false, is_lost: false },
  { name: "Não Qualificado", position: 3, color: "#ef4444", is_won: false, is_lost: true },
  { name: "Proposta", position: 4, color: "#f59e0b", is_won: false, is_lost: false },
  { name: "Fechamento", position: 5, color: "#a855f7", is_won: false, is_lost: false },
  { name: "Fechado", position: 6, color: "#22c55e", is_won: true, is_lost: false },
  { name: "Inativo", position: 7, color: "#64748b", is_won: false, is_lost: false },
];

/** Leads fictícios espalhados pelo funil, pra tela não parecer vazia. */
const LEADS = [
  { name: "Ricardo Almeida", company: "Embalagens Serra Azul", phone: "+5511988770011", stage: "Fechado", value: 18400, days: 22 },
  { name: "Juliana Prado", company: "Distribuidora Vale Verde", phone: "+5511988770022", stage: "Proposta", value: 9750, days: 6 },
  { name: "Marcos Tavares", company: "Indústria Nova Aurora", phone: "+5511988770033", stage: "Fechamento", value: 27300, days: 11 },
  { name: "Beatriz Nunes", company: "Comercial Ponto Certo", phone: "+5511988770044", stage: "Qualificado", value: 4200, days: 3 },
  { name: "Eduardo Lima", company: "Atacado Sul Minas", phone: "+5511988770055", stage: "Proposta", value: 15600, days: 8 },
  { name: "Camila Rocha", company: "Mercado Bom Preço", phone: "+5511988770066", stage: "Atendimento SDR", value: 0, days: 0 },
  { name: "Fernando Dias", company: "Log Transportes", phone: "+5511988770077", stage: "Fechado", value: 31200, days: 35 },
  { name: "Patrícia Gomes", company: "Casa & Cia", phone: "+5511988770088", stage: "Qualificado", value: 6800, days: 4 },
];

/** Catálogo plausível de uma indústria de plásticos. */
const PRODUTOS = [
  { name: "Caixa plástica organizadora 30L", sku: "CX-30L", unit: "un", custo: 1850, venda: 3490, qtd: 320 },
  { name: "Caixa plástica organizadora 50L", sku: "CX-50L", unit: "un", custo: 2640, venda: 4890, qtd: 180 },
  { name: "Balde industrial 20L com tampa", sku: "BLD-20", unit: "un", custo: 1120, venda: 2190, qtd: 540 },
  { name: "Bandeja plástica 40x60", sku: "BDJ-4060", unit: "un", custo: 890, venda: 1790, qtd: 760 },
  { name: "Pallet plástico 1000x1200", sku: "PLT-1012", unit: "un", custo: 12900, venda: 22500, qtd: 95 },
  { name: "Engradado vazado 20kg", sku: "ENG-20", unit: "un", custo: 2380, venda: 4150, qtd: 210 },
  { name: "Tampa universal 20L", sku: "TP-20", unit: "un", custo: 310, venda: 690, qtd: 1200 },
  { name: "Cesto telado 60L", sku: "CST-60", unit: "un", custo: 1990, venda: 3790, qtd: 140 },
];

/** Conversa do SDR com um lead novo — é o que aparece na aba Leads. */
const CONVERSA = [
  { dir: "inbound", body: "Oi, boa tarde! Vi o site de vocês", min: 14 },
  { dir: "outbound", body: "Boa tarde! Que bom que chegou até aqui 😊 Sou a assistente da Plásticos Demonstração. Como posso te ajudar?", min: 13 },
  { dir: "inbound", body: "Preciso de caixa organizadora pra um centro de distribuição", min: 12 },
  { dir: "outbound", body: "Perfeito! Trabalhamos com caixas de 30L e 50L, empilháveis e com tampa. Qual volume aproximado você precisaria?", min: 11 },
  { dir: "inbound", body: "Uns 400 unidades pra começar, das de 50 litros", min: 9 },
  { dir: "outbound", body: "Ótimo volume! Pra eu já deixar tudo certo e passar pro nosso vendedor, me confirma seu nome completo e o CNPJ da empresa?", min: 8 },
  { dir: "inbound", body: "Camila Rocha, CNPJ 12.345.678/0001-90", min: 6 },
  { dir: "outbound", body: "Anotado, Camila! Cadastro concluído ✅ Vou passar seu contato pro Rafael, nosso vendedor da região, que já te manda a proposta com o preço para 400 unidades. Obrigada!", min: 5 },
];

(async () => {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    // ── Limpa uma execução anterior (idempotência) ──────────────────────
    const { rows: existing } = await client.query("select id from tenants where slug = $1", [SLUG]);
    if (existing.length) {
      const old = existing[0].id;
      for (const t of [
        "erp_proposta_itens", "erp_propostas", "erp_produtos", "erp_empresas",
        "whatsapp_messages", "activities", "contact_tags", "deals", "contacts",
        "pipeline_stages", "ai_agents", "tenant_products", "profiles",
      ]) {
        await client.query(`delete from public.${t} where tenant_id = $1`, [old]).catch(() => {});
      }
      await client.query("delete from public.tenants where id = $1", [old]);
      console.log("tenant de demo anterior removido");
    }
    await client.query("delete from public.app_users where email = $1", [OWNER_EMAIL]).catch(() => {});

    // ── Tenant + dono ───────────────────────────────────────────────────
    const { rows: planRows } = await client.query("select id from billing_plans order by base_price_cents limit 1");
    const planId = planRows[0]?.id ?? null;

    const tenantId = uuid();
    await client.query(
      `insert into tenants (id, name, slug, seller_limit, manager_limit, billing_plan_id, monthly_amount_cents)
       values ($1,$2,$3,10,3,$4,0)`,
      [tenantId, TENANT_NAME, SLUG, planId],
    );

    const userId = uuid();
    await client.query(
      `insert into app_users (id, email, password_hash, full_name, email_verified_at)
       values ($1,$2,$3,$4, now())`,
      [userId, OWNER_EMAIL, await bcrypt.hash(OWNER_PASSWORD, 10), OWNER_NAME],
    );
    await client.query(
      `insert into profiles (id, full_name, tenant_id, role) values ($1,$2,$3,'owner')`,
      [userId, OWNER_NAME, tenantId],
    );

    // ERP ativo (o vídeo mostra o ERP).
    await client.query(
      `insert into tenant_products (tenant_id, product, status, monthly_amount_cents, activated_at)
       values ($1,'erp','active',0, now())`,
      [tenantId],
    );

    // ── Funil ───────────────────────────────────────────────────────────
    const stageId = {};
    for (const s of STAGES) {
      const id = uuid();
      stageId[s.name] = id;
      await client.query(
        `insert into pipeline_stages (id, tenant_id, name, position, color, is_won, is_lost)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [id, tenantId, s.name, s.position, s.color, s.is_won, s.is_lost],
      );
    }

    // ── Empresa do ERP ──────────────────────────────────────────────────
    await client.query(
      `insert into erp_empresas (tenant_id, name, cnpj, regime_tributario, is_matriz, city, state)
       values ($1,$2,$3,'simples',true,'São Paulo','SP')`,
      [tenantId, TENANT_NAME + " LTDA", "12345678000190"],
    );

    // ── Leads + negócios ────────────────────────────────────────────────
    let sdrContactId = null;
    for (const lead of LEADS) {
      const contactId = uuid();
      await client.query(
        `insert into contacts (id, tenant_id, name, phone, email, lead_source, created_by, needs_registration, created_at)
         values ($1,$2,$3,$4,$5,'Site',$6,false,$7)`,
        [contactId, tenantId, lead.name, lead.phone,
         lead.name.toLowerCase().replace(/[^a-z]/g, ".") + "@exemplo.com.br", userId, daysAgo(lead.days + 2)],
      );
      if (lead.stage === "Atendimento SDR") sdrContactId = contactId;

      await client.query(
        `insert into deals (tenant_id, title, contact_id, stage_id, owner_id, value, status, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [tenantId, `${lead.company} — pedido`, contactId, stageId[lead.stage], userId, lead.value,
         lead.stage === "Fechado" ? "won" : "open", daysAgo(lead.days)],
      );
    }

    // ── Conversa do SDR (aba Leads) ─────────────────────────────────────
    if (sdrContactId) {
      for (const m of CONVERSA) {
        await client.query(
          `insert into whatsapp_messages (tenant_id, contact_id, direction, from_number, to_number, body, status, created_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [tenantId, sdrContactId, m.dir,
           m.dir === "inbound" ? "+5511988770066" : "+5511999990000",
           m.dir === "inbound" ? "+5511999990000" : "+5511988770066",
           m.body, m.dir === "inbound" ? "received" : "delivered",
           new Date(Date.now() - m.min * 60000).toISOString()],
        );
      }
    }

    // ── Catálogo do ERP ─────────────────────────────────────────────────
    for (const p of PRODUTOS) {
      await client.query(
        `insert into erp_produtos (tenant_id, name, sku, unit, cost_price_cents, sale_price_cents, quantity, min_stock)
         values ($1,$2,$3,$4,$5,$6,$7,20)`,
        [tenantId, p.name, p.sku, p.unit, p.custo, p.venda, p.qtd],
      );
    }

    await client.query("COMMIT");

    console.log("\n=== TENANT DE DEMONSTRAÇÃO PRONTO ===");
    console.log("URL    : https://vorlo.com.br/" + SLUG + "/dashboard");
    console.log("Login  : " + OWNER_EMAIL);
    console.log("Senha  : " + OWNER_PASSWORD);
    console.log(`Dados  : ${LEADS.length} leads, ${PRODUTOS.length} produtos, ${CONVERSA.length} mensagens (tudo fictício)`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("falhou, rollback:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
