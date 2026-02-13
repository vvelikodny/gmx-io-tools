import "dotenv/config";
import {
  createPublicClient,
  http,
  type Address,
  encodeAbiParameters,
  keccak256,
} from "viem";
import { arbitrum } from "viem/chains";

const ORACLE_URL = "https://arbitrum-api.gmxinfra.io";
const DATA_STORE = "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8" as const;
const READER = "0x470fbC46bcC0f16532691Df360A07d8Bf5ee0789" as const;

const MAX_PNL_FACTOR_FOR_TRADERS_KEY = keccak256(
  encodeAbiParameters([{ type: "string" }], ["MAX_PNL_FACTOR_FOR_TRADERS"])
);

const readerAbi = [
  {
    inputs: [
      { name: "dataStore", type: "address" },
      {
        name: "market",
        type: "tuple",
        components: [
          { name: "marketToken", type: "address" },
          { name: "indexToken", type: "address" },
          { name: "longToken", type: "address" },
          { name: "shortToken", type: "address" },
        ],
      },
      {
        name: "indexTokenPrice",
        type: "tuple",
        components: [
          { name: "min", type: "uint256" },
          { name: "max", type: "uint256" },
        ],
      },
      {
        name: "longTokenPrice",
        type: "tuple",
        components: [
          { name: "min", type: "uint256" },
          { name: "max", type: "uint256" },
        ],
      },
      {
        name: "shortTokenPrice",
        type: "tuple",
        components: [
          { name: "min", type: "uint256" },
          { name: "max", type: "uint256" },
        ],
      },
      { name: "pnlFactorType", type: "bytes32" },
      { name: "maximize", type: "bool" },
    ],
    name: "getMarketTokenPrice",
    outputs: [
      { name: "", type: "int256" },
      {
        name: "",
        type: "tuple",
        components: [
          { name: "poolValue", type: "int256" },
          { name: "longPnl", type: "int256" },
          { name: "shortPnl", type: "int256" },
          { name: "netPnl", type: "int256" },
          { name: "longTokenAmount", type: "uint256" },
          { name: "shortTokenAmount", type: "uint256" },
          { name: "longTokenUsd", type: "uint256" },
          { name: "shortTokenUsd", type: "uint256" },
          { name: "totalBorrowingFees", type: "uint256" },
          { name: "borrowingFeePoolFactor", type: "uint256" },
          { name: "impactPoolAmount", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface OracleMarket {
  marketToken: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
}

interface Ticker {
  tokenAddress: string;
  tokenSymbol: string;
  minPrice: string;
  maxPrice: string;
}

interface TokenMeta {
  symbol: string;
  decimals: number;
}

const TARGET_ADDRESSES = new Set([
  "0x47c031236e19d024b42f8AE6780E44A573170703".toLowerCase(),
  "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336".toLowerCase(),
  "0x7C11F78Ce78768518D743E81Fdfa2F860C6b9A77".toLowerCase(),
]);

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Contract prices have (30 - tokenDecimals) precision.
// Multiply by 10^tokenDecimals to get 30-decimal USD.
function parseContractPrice(price: bigint, tokenDecimals: number): bigint {
  return price * 10n ** BigInt(tokenDecimals);
}

function formatUsdValue(value: bigint): string {
  const isNeg = value < 0n;
  const abs = isNeg ? -value : value;
  const whole = abs / 10n ** 30n;
  const frac = (abs % 10n ** 30n) / 10n ** 26n;
  const sign = isNeg ? "-" : "";
  return `${sign}$${whole.toLocaleString("en-US")}.${frac.toString().padStart(4, "0")}`;
}

async function main() {
  const rpcUrl = process.env.RPC_URL || "https://arb1.arbitrum.io/rpc";

  const client = createPublicClient({
    chain: arbitrum,
    transport: http(rpcUrl),
  });

  console.log("Fetching GM token prices from GMX v2 (Arbitrum)...\n");

  // Fetch market configs, oracle prices, and token metadata from GMX API
  const [marketsRes, tickersRes, tokensRes] = await Promise.all([
    fetch(`${ORACLE_URL}/markets`).then((r) => r.json()) as Promise<{
      markets: OracleMarket[];
    }>,
    fetch(`${ORACLE_URL}/prices/tickers`).then((r) => r.json()) as Promise<Ticker[]>,
    fetch(`${ORACLE_URL}/tokens`).then((r) => r.json()) as Promise<{
      tokens: Array<{ address: string; symbol: string; decimals: number }>;
    }>,
  ]);

  // Build lookups
  const tickers: Record<string, Ticker> = {};
  for (const t of tickersRes) {
    tickers[t.tokenAddress.toLowerCase()] = t;
  }

  const tokenMeta: Record<string, TokenMeta> = {};
  for (const t of tokensRes.tokens) {
    tokenMeta[t.address.toLowerCase()] = { symbol: t.symbol, decimals: t.decimals };
  }

  // Filter to our target markets
  const markets = marketsRes.markets.filter((m) =>
    TARGET_ADDRESSES.has(m.marketToken.toLowerCase())
  );

  if (markets.length === 0) {
    console.error("No target markets found in GMX API");
    process.exit(1);
  }

  // Call Reader.getMarketTokenPrice for each market
  const results = await Promise.all(
    markets.map(async (m) => {
      const indexP = tickers[m.indexToken.toLowerCase()];
      const longP = tickers[m.longToken.toLowerCase()];
      const shortP = tickers[m.shortToken.toLowerCase()];

      if (!indexP || !longP || !shortP) {
        return { market: m, error: "Missing oracle prices" };
      }

      try {
        const [gmPrice, poolInfo] = await client.readContract({
          address: READER,
          abi: readerAbi,
          functionName: "getMarketTokenPrice",
          args: [
            DATA_STORE,
            {
              marketToken: m.marketToken as Address,
              indexToken: m.indexToken as Address,
              longToken: m.longToken as Address,
              shortToken: m.shortToken as Address,
            },
            { min: BigInt(indexP.minPrice), max: BigInt(indexP.maxPrice) },
            { min: BigInt(longP.minPrice), max: BigInt(longP.maxPrice) },
            { min: BigInt(shortP.minPrice), max: BigInt(shortP.maxPrice) },
            MAX_PNL_FACTOR_FOR_TRADERS_KEY,
            false,
          ],
        });

        return { market: m, gmPrice, poolInfo };
      } catch (err: any) {
        return { market: m, error: err.shortMessage || err.message || String(err) };
      }
    })
  );

  // Display
  console.log("GM Token Prices (Arbitrum — GMX v2)");
  console.log("=====================================");

  for (const result of results) {
    const m = result.market;
    const idx = tokenMeta[m.indexToken.toLowerCase()];
    const lng = tokenMeta[m.longToken.toLowerCase()];
    const sht = tokenMeta[m.shortToken.toLowerCase()];

    const indexSym = idx?.symbol || "???";
    const longSym = lng?.symbol || "???";
    const shortSym = sht?.symbol || "???";

    const name = `${indexSym}/USD [${longSym}-${shortSym}]`;

    console.log(`\n${name}`);
    console.log(`  GM Token:  ${shortenAddress(m.marketToken)}`);

    if ("error" in result) {
      console.log(`  Price:     ERROR — ${result.error}`);
      continue;
    }

    const { gmPrice, poolInfo } = result;

    // gmPrice is the GM token price in 30-decimal USD
    console.log(`  Price:     ${formatUsdValue(gmPrice)}`);
    console.log(`  Pool:      ${formatUsdValue(poolInfo.poolValue)}`);

    // Underlying token mid-prices
    // Ticker prices are in contract format (30 - tokenDecimals digits).
    // Multiply by 10^tokenDecimals to get 30-decimal USD for display.
    function tickerMidUsd(tokenAddr: string): bigint | undefined {
      const t = tickers[tokenAddr.toLowerCase()];
      const meta = tokenMeta[tokenAddr.toLowerCase()];
      if (!t || !meta) return undefined;
      const mid = (BigInt(t.minPrice) + BigInt(t.maxPrice)) / 2n;
      return parseContractPrice(mid, meta.decimals);
    }

    const indexMid = tickerMidUsd(m.indexToken);
    if (indexMid !== undefined) {
      console.log(`  Index:     ${indexSym} ${formatUsdValue(indexMid)}`);
    }

    if (m.longToken.toLowerCase() !== m.shortToken.toLowerCase()) {
      const longMid = tickerMidUsd(m.longToken);
      if (longMid !== undefined) {
        console.log(`  Long:      ${longSym} ${formatUsdValue(longMid)}`);
      }
      const shortMid = tickerMidUsd(m.shortToken);
      if (shortMid !== undefined) {
        console.log(`  Short:     ${shortSym} ${formatUsdValue(shortMid)}`);
      }
    } else {
      const longMid = tickerMidUsd(m.longToken);
      if (longMid !== undefined) {
        console.log(`  Collateral: ${longSym} ${formatUsdValue(longMid)}`);
      }
    }
  }

  console.log(`\nUpdated: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
