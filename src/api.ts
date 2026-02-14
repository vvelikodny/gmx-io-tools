import type { OracleMarket, Ticker, TokenMeta } from "./types.js";

export async function fetchMarkets(
  apiUrl: string
): Promise<OracleMarket[]> {
  const res = await fetch(`${apiUrl}/markets`);
  const data = (await res.json()) as { markets: OracleMarket[] };
  return data.markets;
}

export async function fetchTickers(
  apiUrl: string
): Promise<Record<string, Ticker>> {
  const res = await fetch(`${apiUrl}/prices/tickers`);
  const data = (await res.json()) as Ticker[];
  const map: Record<string, Ticker> = {};
  for (const t of data) {
    map[t.tokenAddress.toLowerCase()] = t;
  }
  return map;
}

export async function fetchTokenMeta(
  apiUrl: string
): Promise<Record<string, TokenMeta>> {
  const res = await fetch(`${apiUrl}/tokens`);
  const data = (await res.json()) as {
    tokens: Array<{ address: string; symbol: string; decimals: number }>;
  };
  const map: Record<string, TokenMeta> = {};
  for (const t of data.tokens) {
    map[t.address.toLowerCase()] = { symbol: t.symbol, decimals: t.decimals };
  }
  return map;
}
