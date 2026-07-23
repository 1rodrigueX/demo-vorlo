import type { CSSProperties } from "react";

/**
 * Marca Synexa (recriação vetorial da logo): "S" angular em gradiente azul→violeta
 * com trilhas de circuito nas laterais. É um SVG puro — escala em qualquer
 * tamanho, acompanha o tema e não depende de arquivo de imagem.
 */

// "S" quadrado/angular com dois chanfros (canto sup. dir. e inf. esq.).
const S_PATH = "M8 8 H50 L56 14 V20 H20 V26 H56 V56 H14 L8 50 V44 H44 V38 H8 Z";

let gradSeq = 0;

export function SynexaMark({
  size = 32,
  className,
  withCircuit = true,
  style,
}: {
  size?: number;
  className?: string;
  withCircuit?: boolean;
  style?: CSSProperties;
}) {
  // id único por instância pra dois marks na mesma página não colidirem.
  const gid = `synexa-s-${gradSeq++}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role="img"
      aria-label="Synexa"
    >
      <defs>
        <linearGradient id={gid} x1="12" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5fb0ff" />
          <stop offset="52%" stopColor="#5a72ff" />
          <stop offset="100%" stopColor="#6d47f0" />
        </linearGradient>
      </defs>
      {withCircuit && (
        <g stroke="#5b8cff" strokeWidth="1.4" strokeLinecap="round" opacity="0.85">
          <path d="M8 13 H2.5" />
          <path d="M8 17.5 H4.5" />
          <circle cx="1.6" cy="13" r="1.4" fill="#5b8cff" stroke="none" />
          <circle cx="3.6" cy="17.5" r="1.2" fill="#5b8cff" stroke="none" />
          <path d="M56 47 H61.5" />
          <path d="M56 51.5 H59.5" />
          <circle cx="62.4" cy="47" r="1.4" fill="#5b8cff" stroke="none" />
          <circle cx="60.4" cy="51.5" r="1.2" fill="#5b8cff" stroke="none" />
        </g>
      )}
      <path d={S_PATH} fill={`url(#${gid})`} />
    </svg>
  );
}

/** Marca + wordmark "SYNEXA". Usado no cabeçalho/rodapé da landing. */
export function SynexaLogo({
  size = 30,
  className,
  wordmark = true,
}: {
  size?: number;
  className?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={"inline-flex items-center gap-2 " + (className ?? "")}>
      <SynexaMark size={size} style={{ filter: "drop-shadow(0 4px 12px rgba(109,71,240,0.45))" }} />
      {wordmark && (
        <span className="text-base font-bold tracking-[0.14em] text-gray-900">SYNEXA</span>
      )}
    </span>
  );
}
