// Gera o ícone do app a partir da geometria oficial da marca Synexa
// (mesma de src/components/site/brand/geometry.ts): marca laranja sobre um
// quadrado escuro arredondado. Produz app-icon.png (1024²) — depois use
// `npm run tauri -- icon app-icon.png` pra gerar o conjunto de ícones.
import sharp from "sharp";
import { writeFileSync } from "fs";

const NODES = [
  ["TL", 15.4, 8.7],
  ["UM", 64.1, 38.9],
  ["LM", 8.7, 68.3],
  ["C", 52.5, 68.3],
  ["R", 111.3, 68.3],
  ["BM", 64.1, 97.9],
  ["BL", 15.4, 127.3],
];
const BY = Object.fromEntries(NODES.map(([id, x, y]) => [id, { x, y }]));
const EDGES = [
  ["TL", "C"], ["TL", "UM"], ["UM", "C"], ["TL", "R"], ["UM", "R"], ["C", "R"],
  ["UM", "LM"], ["LM", "BM"], ["C", "BM"], ["BM", "R"], ["C", "BL"], ["BL", "R"], ["BM", "BL"],
];
const FLANK = "M 15.4 8.7 Q 20.4 38.5 8.7 68.3 Q 20.4 97.8 15.4 127.3";
const ORANGE = "#ff5722";
const SCALE = 4.5;
const TX = 242; // (1024 - 120*4.5)/2
const TY = 206; // (1024 - 136*4.5)/2

const lines = EDGES.map(([a, b]) => {
  const p = BY[a];
  const q = BY[b];
  return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`;
}).join("");
const circles = NODES.map(([, x, y]) => `<circle cx="${x}" cy="${y}" r="8.7"/>`).join("");

const svg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#241610"/><stop offset="1" stop-color="#120a05"/></linearGradient></defs>
<rect width="1024" height="1024" rx="185" fill="url(#bg)"/>
<g transform="translate(${TX},${TY}) scale(${SCALE})">
<g fill="none" stroke="${ORANGE}" stroke-width="8.2" stroke-linecap="round" stroke-linejoin="round">${lines}<path d="${FLANK}"/></g>
<g fill="${ORANGE}">${circles}</g>
</g></svg>`;

writeFileSync("app-icon.svg", svg);
await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile("app-icon.png");
console.log("OK: app-icon.svg + app-icon.png (1024x1024) gerados.");
