"use server";

import { searchTicker, type Quote } from "@/lib/market/brapi";

export type SearchTickerState = { quote: Quote; error?: undefined } | { quote?: undefined; error: string } | null;

export async function searchTickerAction(_prevState: SearchTickerState, formData: FormData): Promise<SearchTickerState> {
  const symbol = String(formData.get("symbol") ?? "").trim();
  if (!symbol) return { error: "Digite um ticker (ex: PETR4)" };

  const quote = await searchTicker(symbol);
  if (!quote) return { error: `"${symbol.toUpperCase()}" não encontrado` };
  return { quote };
}
