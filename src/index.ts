import "dotenv/config";
import { createPublicClient, http } from "viem";
import { NETWORKS } from "./config.js";
import { fetchMarkets, fetchTickers, fetchTokenMeta } from "./api.js";
import { fetchGmPrices, fetchGlvPrices } from "./prices.js";

async function main() {
  const networkFilter = process.argv[2];

  const networks = networkFilter
    ? NETWORKS.filter((n) => n.slug === networkFilter)
    : NETWORKS;

  if (networks.length === 0) {
    console.error(`Unknown network: ${networkFilter}`);
    console.error(`Available: ${NETWORKS.map((n) => n.slug).join(", ")}`);
    process.exit(1);
  }

  for (const network of networks) {
    console.log(`\n${network.name} — GM/GLV Token Prices`);
    console.log("=".repeat(50));

    const client = createPublicClient({
      chain: network.chain,
      transport: http(network.rpcUrl),
    });

    const [markets, tickers, tokenMeta] = await Promise.all([
      fetchMarkets(network.apiUrl),
      fetchTickers(network.apiUrl),
      fetchTokenMeta(network.apiUrl),
    ]);

    const gm = await fetchGmPrices(client, network, markets, tickers, tokenMeta);
    const glv = await fetchGlvPrices(client, network, markets, tickers, tokenMeta);

    if (gm.length > 0) {
      console.log("\nGM Tokens:");
      for (const g of gm) {
        console.log(
          `  ${g.name.padEnd(35)} $${g.price.toFixed(4)}  Pool: $${g.poolValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
        );
      }
    }

    if (glv.length > 0) {
      console.log("\nGLV Vaults:");
      for (const g of glv) {
        console.log(
          `  ${g.name.padEnd(35)} $${g.price.toFixed(4)}  TVL: $${g.tvl.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
        );
      }
    }
  }

  console.log(`\nUpdated: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
