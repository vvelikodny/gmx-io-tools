export interface OracleMarket {
  marketToken: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
}

export interface Ticker {
  tokenAddress: string;
  tokenSymbol: string;
  minPrice: string;
  maxPrice: string;
}

export interface TokenMeta {
  symbol: string;
  decimals: number;
}

export interface GmResult {
  address: string;
  name: string;
  price: number;
  poolValue: number;
}

export interface GlvResult {
  address: string;
  name: string;
  price: number;
  tvl: number;
}

export interface NetworkPriceData {
  gm: GmResult[];
  glv: GlvResult[];
}

export interface AllPriceData {
  updated: string;
  networks: Record<string, NetworkPriceData>;
}
