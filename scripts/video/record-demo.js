/**
 * Grava o vídeo de demonstração do Vorlo navegando pelo app DE VERDADE.
 *
 *   node scripts/video/record-demo.js
 *
 * Saída: scripts/video/out/<timestamp>.webm (1920x1080, sem áudio — a
 * narração entra na edição, ver ROTEIRO.md).
 *
 * Roda contra produção usando o tenant de demonstração (dados fictícios).
 * Se o tenant não existir ainda: node scripts/seed-demo-tenant.js
 *
 * Variáveis (todas opcionais):
 *   DEMO_URL       base do app            (padrão https://vorlo.com.br)
 *   DEMO_EMAIL     login da demo          (padrão demo@vorlo.com.br)
 *   DEMO_PASSWORD  senha da demo
 *   PACE           1.0 normal, 1.3 = 30% mais lento
 *   HEADED=1       abre o navegador visível (pra acompanhar a gravação)
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = (process.env.DEMO_URL || "https://vorlo.com.br").replace(/\/$/, "");
const EMAIL = process.env.DEMO_EMAIL || "demo@vorlo.com.br";
const PASSWORD = process.env.DEMO_PASSWORD || "DemoVorlo2026!";
const SLUG = "demo-plasticos";
const PACE = Number(process.env.PACE || 1);
const OUT_DIR = path.join(__dirname, "out");

/** Pausa proporcional ao PACE — é o que dá ritmo de vídeo, não de robô. */
const beat = (ms) => new Promise((r) => setTimeout(r, Math.round(ms * PACE)));

/**
 * Cursor falso desenhado na página. O Playwright move o mouse de verdade, mas
 * o ponteiro do SO não aparece na gravação — sem isso o vídeo mostra coisas
 * acontecendo sozinhas, o que fica confuso pra quem assiste.
 */
const CURSOR_JS = `
(() => {
  if (window.__demoCursor) return;
  const c = document.createElement('div');
  c.id = '__demo-cursor';
  c.style.cssText = 'position:fixed;z-index:2147483647;width:22px;height:22px;margin:-11px 0 0 -11px;' +
    'border-radius:50%;background:rgba(255,87,34,.35);border:2px solid #ff5722;pointer-events:none;' +
    'transition:transform .08s ease-out;left:50%;top:50%';
  document.body.appendChild(c);
  window.__demoCursor = c;
  window.__demoMove = (x, y) => { c.style.left = x + 'px'; c.style.top = y + 'px'; };
  window.__demoClick = () => {
    c.style.transform = 'scale(.6)';
    setTimeout(() => { c.style.transform = 'scale(1)'; }, 140);
  };
})();
`;

async function ensureCursor(page) {
  await page.evaluate(CURSOR_JS).catch(() => {});
}

/** Move o mouse em passos, pra parecer mão humana e não teletransporte. */
async function glideTo(page, x, y) {
  await ensureCursor(page);
  await page.mouse.move(x, y, { steps: 22 });
  await page.evaluate(([px, py]) => window.__demoMove?.(px, py), [x, y]).catch(() => {});
}

async function clickAt(page, locator, { settle = 900 } = {}) {
  const box = await locator.boundingBox();
  if (!box) return false;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await glideTo(page, x, y);
  await beat(320);
  await page.evaluate(() => window.__demoClick?.()).catch(() => {});
  await locator.click({ timeout: 15000 }).catch(() => {});
  await beat(settle);
  return true;
}

/**
 * Fecha modal que abre sozinho. A tela de Leads abre o QR do WhatsApp
 * automaticamente quando não há número conectado — no tenant de demo isso
 * tapa justamente a conversa do SDR, que é a cena mais importante do vídeo.
 */
async function dismissModal(page) {
  if (await page.getByRole("dialog").count()) {
    await page.keyboard.press("Escape").catch(() => {});
    await beat(700);
  }
}

/** Navega e espera a tela assentar (inclui o cursor, que some a cada navegação). */
async function goto(page, pathname, { settle = 1400 } = {}) {
  await page.goto(BASE + pathname, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await ensureCursor(page);
  await beat(settle);
}

/** Rolagem suave — corta seco fica feio no vídeo. */
async function smoothScroll(page, distance, duration = 1600) {
  await page.evaluate(
    ([d, dur]) =>
      new Promise((resolve) => {
        const start = window.scrollY;
        const t0 = performance.now();
        const step = (t) => {
          const p = Math.min((t - t0) / dur, 1);
          // easeInOutQuad
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          window.scrollTo(0, start + d * e);
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      }),
    [distance, duration],
  ).catch(() => {});
  await beat(300);
}

/** Digita devagar, caractere a caractere — mostra a busca filtrando ao vivo. */
async function typeSlowly(page, locator, text, delay = 110) {
  await clickAt(page, locator, { settle: 200 });
  for (const ch of text) {
    await locator.type(ch, { delay: 0 }).catch(async () => {
      await page.keyboard.type(ch);
    });
    await beat(delay);
  }
}

function scene(n, titulo) {
  console.log(`\n[cena ${n}] ${titulo}`);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: process.env.HEADED !== "1",
    args: ["--force-device-scale-factor=1", "--hide-scrollbars"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
    colorScheme: "light",
  });

  const page = await context.newPage();
  // Recria o cursor depois de cada navegação (a página nova não tem o div).
  page.on("load", () => ensureCursor(page).catch(() => {}));

  try {
    // ── Cena 1 — Abertura ────────────────────────────────────────────────
    scene(1, "Abertura — landing");
    await goto(page, "/", { settle: 2200 });
    await smoothScroll(page, 700, 1800);
    await beat(1400);
    await smoothScroll(page, 700, 1600);
    await beat(1200);

    // ── Login (rápido, é meio pro fim) ───────────────────────────────────
    scene(2, "Login + Dashboard");
    await goto(page, "/login", { settle: 900 });
    await typeSlowly(page, page.locator("#email"), EMAIL, 55);
    await beat(250);
    await typeSlowly(page, page.locator("#password"), "••••••••••", 55).catch(() => {});
    await page.fill("#password", PASSWORD);
    await beat(400);
    await clickAt(page, page.getByRole("button", { name: /entrar/i }).first(), { settle: 4500 });

    // ── Cena 2 — Dashboard ───────────────────────────────────────────────
    await goto(page, `/${SLUG}/dashboard`, { settle: 2600 });
    await smoothScroll(page, 500, 1500);
    await beat(1600);
    await smoothScroll(page, -500, 1200);

    // ── Cena 3 — Pipeline ────────────────────────────────────────────────
    scene(3, "Pipeline");
    await goto(page, `/${SLUG}/pipeline`, { settle: 2600 });
    // Arrasta um card entre colunas — é o momento mais "vivo" do funil.
    // O funil usa dnd-kit (PointerSensor), não draggable nativo: o arrasto é
    // simulado com mouse down -> movimentos graduais -> up. Os passos
    // intermediários importam, senão o sensor não reconhece como arrasto.
    const card = page.getByText(/— pedido$/).first();
    if (await card.count()) {
      const from = await card.boundingBox();
      if (from) {
        const cx = from.x + from.width / 2;
        const cy = from.y + from.height / 2;
        await glideTo(page, cx, cy);
        await beat(500);
        await page.mouse.down();
        await beat(350);
        // Passos curtos primeiro (vence a distância mínima de ativação).
        for (const dx of [20, 80, 180, 300, 420]) {
          await page.mouse.move(cx + dx, cy + 30, { steps: 8 });
          await page.evaluate(([x, y]) => window.__demoMove?.(x, y), [cx + dx, cy + 30]).catch(() => {});
          await beat(180);
        }
        await beat(400);
        await page.mouse.up();
        await beat(2000);
      }
    }
    await beat(900);

    // ── Cena 4 — SDR de IA (a mais importante) ───────────────────────────
    scene(4, "SDR de IA — conversa com o lead");
    await goto(page, `/${SLUG}/whatsapp`, { settle: 2400 });
    await dismissModal(page);
    const conversa = page.getByText("Camila Rocha").first();
    if (await conversa.count()) await clickAt(page, conversa, { settle: 3000 });
    // Rola a thread devagar: quem assiste precisa conseguir LER a conversa.
    await smoothScroll(page, 420, 2200);
    await beat(2600);
    await smoothScroll(page, 420, 2200);
    await beat(3000);

    // ── Cena 5 — Contato cadastrado pela IA ──────────────────────────────
    scene(5, "Contato preenchido pela IA");
    await goto(page, `/${SLUG}/contacts`, { settle: 2200 });
    const contato = page.getByText("Camila Rocha").first();
    if (await contato.count()) await clickAt(page, contato, { settle: 3200 });
    await beat(1800);

    // ── Cena 6 — Agentes de IA ───────────────────────────────────────────
    scene(6, "Agentes de IA");
    await goto(page, `/${SLUG}/settings/agentes`, { settle: 2800 });
    await beat(2200);

    // ── Cena 7 — ERP ─────────────────────────────────────────────────────
    scene(7, "ERP");
    await goto(page, `/${SLUG}/erp`, { settle: 2800 });
    await smoothScroll(page, 480, 1600);
    await beat(1600);
    await goto(page, `/${SLUG}/erp/cadastros/produtos`, { settle: 2600 });
    await beat(1400);

    // ── Cena 8 — Importar produtos com IA ────────────────────────────────
    scene(8, "Importar produtos com IA");
    const importar = page.getByRole("button", { name: /importar com ia/i }).first();
    if (await importar.count()) {
      await clickAt(page, importar, { settle: 2600 });
      await beat(2400);
      await page.keyboard.press("Escape").catch(() => {});
      await beat(800);
    }

    // ── Cena 9 — Proposta com busca de cliente ───────────────────────────
    scene(9, "Nova proposta — busca de cliente");
    await goto(page, `/${SLUG}/erp/vendas/propostas/nova`, { settle: 2800 });
    await dismissModal(page);
    const seletor = page.locator("#proposal-customer");
    if (await seletor.count()) {
      await clickAt(page, seletor, { settle: 900 });
      const busca = page.getByPlaceholder(/buscar por nome/i).first();
      if (await busca.count()) {
        // Digita o CNPJ pra mostrar que acha por documento, não só por nome.
        await typeSlowly(page, busca, "12345", 150);
        await beat(2400);
      }
      await page.keyboard.press("Escape").catch(() => {});
      await beat(700);
    }

    // ── Cena 10 — Fecho ──────────────────────────────────────────────────
    scene(10, "Fecho");
    await goto(page, `/${SLUG}/dashboard`, { settle: 3200 });
    await beat(1800);

    console.log("\nnavegação concluída, finalizando o vídeo...");
  } catch (err) {
    console.error("\nfalhou no meio da gravação:", err.message);
    process.exitCode = 1;
  } finally {
    // O arquivo só é fechado no context.close() — daí o path vir depois.
    const video = page.video();
    await context.close();
    await browser.close();
    if (video) {
      const raw = await video.path();
      const finalPath = path.join(OUT_DIR, `vorlo-demo-${Date.now()}.webm`);
      fs.renameSync(raw, finalPath);
      const mb = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(1);
      console.log(`\nVÍDEO: ${finalPath}  (${mb} MB)`);
      console.log("Narração e tempos por cena: scripts/video/ROTEIRO.md");
    }
  }
})();
