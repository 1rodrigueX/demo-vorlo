/** Formata uma duração em minutos de forma curta e humana em pt-BR. */
export function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 1) return "<1min";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}min` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const restH = hours % 24;
  return restH ? `${days}d ${restH}h` : `${days}d`;
}
