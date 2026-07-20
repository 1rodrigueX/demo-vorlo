// Cotações via brapi.dev — cobertura B3. Confirmado ao vivo que o free tier
// exige token depois de poucas chamadas sem autenticação, então isso
// depende de BRAPI_TOKEN nas env vars (conta grátis em brapi.dev/dashboard).
// Sem token configurado, retorna lista vazia — a página mostra instrução de
// setup em vez de quebrar.

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
};

// Lista curada só pra dar contexto de mercado (maior liquidez do
// Ibovespa / FIIs mais negociados) — ordem alfabética fixa, não é ranking
// de "melhor pra comprar" (isso é atividade regulada pela CVM).
const WATCHLIST_ACOES = ["ABEV3", "B3SA3", "BBAS3", "BBDC4", "ITUB4", "PETR4", "VALE3", "WEGE3"];
const WATCHLIST_FIIS = ["BCFF11", "HGLG11", "KNRI11", "MXRF11", "VISC11", "XPML11"];

export function hasBrapiToken(): boolean {
  return !!process.env.BRAPI_TOKEN;
}

async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const token = process.env.BRAPI_TOKEN;
  if (!token) return [];

  try {
    const res = await fetch(`https://brapi.dev/api/quote/${symbols.join(",")}?token=${token}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    type BrapiResult = { symbol: string; shortName?: string; regularMarketPrice?: number; regularMarketChangePercent?: number };
    return ((data.results ?? []) as BrapiResult[])
      .filter((r) => typeof r.regularMarketPrice === "number")
      .map((r) => ({
        symbol: r.symbol,
        name: r.shortName ?? r.symbol,
        price: r.regularMarketPrice as number,
        changePercent: r.regularMarketChangePercent ?? 0,
      }));
  } catch {
    return [];
  }
}

export async function getAcoesWatchlist(): Promise<Quote[]> {
  return fetchQuotes(WATCHLIST_ACOES);
}

export async function getFiisWatchlist(): Promise<Quote[]> {
  return fetchQuotes(WATCHLIST_FIIS);
}
