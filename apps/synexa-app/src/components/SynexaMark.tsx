/** Marca Synexa em SVG estático (mesma geometria do app web). Herda a cor via
 * currentColor — use com text-ignite. */
export function SynexaMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={(size * 136) / 120}
      viewBox="0 0 120 136"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth={8.2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="15.4" y1="8.7" x2="52.5" y2="68.3" />
        <line x1="15.4" y1="8.7" x2="64.1" y2="38.9" />
        <line x1="64.1" y1="38.9" x2="52.5" y2="68.3" />
        <line x1="15.4" y1="8.7" x2="111.3" y2="68.3" />
        <line x1="64.1" y1="38.9" x2="111.3" y2="68.3" />
        <line x1="52.5" y1="68.3" x2="111.3" y2="68.3" />
        <line x1="64.1" y1="38.9" x2="8.7" y2="68.3" />
        <line x1="8.7" y1="68.3" x2="64.1" y2="97.9" />
        <line x1="52.5" y1="68.3" x2="64.1" y2="97.9" />
        <line x1="64.1" y1="97.9" x2="111.3" y2="68.3" />
        <line x1="52.5" y1="68.3" x2="15.4" y2="127.3" />
        <line x1="15.4" y1="127.3" x2="111.3" y2="68.3" />
        <line x1="64.1" y1="97.9" x2="15.4" y2="127.3" />
        <path d="M 15.4 8.7 Q 20.4 38.5 8.7 68.3 Q 20.4 97.8 15.4 127.3" />
      </g>
      <g fill="currentColor">
        <circle cx="15.4" cy="8.7" r="8.7" />
        <circle cx="64.1" cy="38.9" r="8.7" />
        <circle cx="8.7" cy="68.3" r="8.7" />
        <circle cx="52.5" cy="68.3" r="8.7" />
        <circle cx="111.3" cy="68.3" r="8.7" />
        <circle cx="64.1" cy="97.9" r="8.7" />
        <circle cx="15.4" cy="127.3" r="8.7" />
      </g>
    </svg>
  );
}
