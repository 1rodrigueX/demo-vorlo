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
  dayRange: string | null;
  fiftyTwoWeekRange: string | null;
  priceEarnings: number | null;
  volume: number | null;
  marketCap: number | null;
};

export type SectorGroup = { sector: string; tickers: string[] };

// Lista curada só pra dar contexto de mercado, agrupada por setor — ordem
// alfabética fixa dentro de cada setor, não é ranking de "melhor pra
// comprar" (isso é atividade regulada pela CVM).
export const SECTORS_ACOES: SectorGroup[] = [
  { sector: "Bancos & Financeiro", tickers: ["BBAS3", "BBDC4", "ITUB4", "SANB11"] },
  { sector: "Petróleo, Mineração & Siderurgia", tickers: ["CSNA3", "GGBR4", "PETR4", "VALE3"] },
  { sector: "Varejo & Consumo", tickers: ["ABEV3", "LREN3", "MGLU3"] },
  { sector: "Indústria & Bens de Capital", tickers: ["EMBR3", "WEGE3"] },
  { sector: "Energia & Saneamento", tickers: ["CMIG4", "ELET3", "SBSP3"] },
  { sector: "Tecnologia & Serviços", tickers: ["B3SA3", "TOTS3"] },
];

export const SECTORS_FIIS: SectorGroup[] = [
  { sector: "Tijolo (lajes & galpões)", tickers: ["HGLG11", "KNRI11", "VILG11"] },
  { sector: "Papel & Recebíveis", tickers: ["KNCR11", "MXRF11", "RECR11"] },
  { sector: "Shoppings", tickers: ["VISC11", "XPML11"] },
  { sector: "Fundo de Fundos", tickers: ["BCFF11", "RBRF11"] },
];

export function hasBrapiToken(): boolean {
  return !!process.env.BRAPI_TOKEN;
}

type BrapiResult = {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketDayRange?: string;
  fiftyTwoWeekRange?: string;
  priceEarnings?: number;
  regularMarketVolume?: number;
  marketCap?: number;
};

function toQuote(r: BrapiResult): Quote {
  return {
    symbol: r.symbol,
    name: r.shortName ?? r.symbol,
    price: r.regularMarketPrice as number,
    changePercent: r.regularMarketChangePercent ?? 0,
    dayRange: r.regularMarketDayRange ?? null,
    fiftyTwoWeekRange: r.fiftyTwoWeekRange ?? null,
    priceEarnings: typeof r.priceEarnings === "number" ? r.priceEarnings : null,
    volume: typeof r.regularMarketVolume === "number" ? r.regularMarketVolume : null,
    marketCap: typeof r.marketCap === "number" ? r.marketCap : null,
  };
}

async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  const token = process.env.BRAPI_TOKEN;
  if (!token) return [];

  try {
    const res = await fetch(`https://brapi.dev/api/quote/${symbols.join(",")}?token=${token}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.results ?? []) as BrapiResult[])
      .filter((r) => typeof r.regularMarketPrice === "number")
      .map(toQuote);
  } catch {
    return [];
  }
}

export async function getAcoesWatchlist(): Promise<Quote[]> {
  return fetchQuotes(SECTORS_ACOES.flatMap((g) => g.tickers));
}

export async function getFiisWatchlist(): Promise<Quote[]> {
  return fetchQuotes(SECTORS_FIIS.flatMap((g) => g.tickers));
}

/** Busca avulsa de um ticker qualquer da B3 — não precisa estar nas listas curadas acima. */
export async function searchTicker(symbolRaw: string): Promise<Quote | null> {
  const symbol = symbolRaw.trim().toUpperCase();
  if (!symbol) return null;
  const [quote] = await fetchQuotes([symbol]);
  return quote ?? null;
}
