// Indicadores oficiais do Banco Central (série SGS) — gratuito, sem chave.
// Códigos confirmados ao vivo: 432 = meta Selic definida pelo Copom (% a.a.),
// 4389 = CDI anualizado, base 252 (% a.a.).

type SgsPoint = { data: string; valor: string };

async function fetchSgsLatest(series: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${series}/dados/ultimos/1?formato=json`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data: SgsPoint[] = await res.json();
    const value = data[0]?.valor;
    return value ? Number(value) : null;
  } catch {
    return null;
  }
}

export async function getSelicMeta(): Promise<number | null> {
  return fetchSgsLatest(432);
}

export async function getCdiAnualizado(): Promise<number | null> {
  return fetchSgsLatest(4389);
}
