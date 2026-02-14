import "dotenv/config";
import { createPublicClient, http } from "viem";
import { NETWORKS } from "./config.js";
import { fetchMarkets, fetchTickers, fetchTokenMeta } from "./api.js";
import { fetchGmPrices, fetchGlvPrices } from "./prices.js";
import { writeAllOutput } from "./output.js";
import type { AllPriceData } from "./types.js";

async function main() {
  const allData: AllPriceData = {
    updated: new Date().toISOString(),
    networks: {},
  };

  console.log("Fetching GM/GLV token prices...\n");

  const networkResults = await Promise.all(
    NETWORKS.map(async (network) => {
      console.log(`[${network.name}] Fetching data...`);

      const client = createPublicClient({
        chain: network.chain,
        transport: http(network.rpcUrl),
      });

      const [markets, tickers, tokenMeta] = await Promise.all([
        fetchMarkets(network.apiUrl),
        fetchTickers(network.apiUrl),
        fetchTokenMeta(network.apiUrl),
      ]);

      console.log(`[${network.name}] Found ${markets.length} markets, fetching prices...`);

      // Sequential to avoid RPC rate limits on public endpoints
      const gm = await fetchGmPrices(client, network, markets, tickers, tokenMeta);
      const glv = await fetchGlvPrices(client, network, markets, tickers, tokenMeta);

      console.log(
        `[${network.name}] Done: ${gm.length} GM tokens, ${glv.length} GLV vaults`
      );

      return { slug: network.slug, data: { gm, glv } };
    })
  );

  for (const { slug, data } of networkResults) {
    allData.networks[slug] = data;
  }

  writeAllOutput(allData);

  // Summary
  console.log("\nSummary:");
  for (const [slug, nd] of Object.entries(allData.networks)) {
    console.log(`  ${slug}: ${nd.gm.length} GM, ${nd.glv.length} GLV`);
  }
  console.log(`  Updated: ${allData.updated}`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
