import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AllPriceData } from "./types.js";

function ensureDir(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function buildCombinedCsv(data: AllPriceData): string {
  const lines = ["network,type,name,address,price,poolValue"];
  for (const [slug, nd] of Object.entries(data.networks)) {
    for (const gm of nd.gm) {
      lines.push(`${slug},gm,"${gm.name}",${gm.address},${gm.price},${gm.poolValue}`);
    }
    for (const glv of nd.glv) {
      lines.push(`${slug},glv,"${glv.name}",${glv.address},${glv.price},${glv.tvl}`);
    }
  }
  return lines.join("\n") + "\n";
}

function buildNetworkCsv(
  gm: AllPriceData["networks"][string]["gm"],
  glv: AllPriceData["networks"][string]["glv"]
): string {
  const lines = ["type,name,address,price,poolValue"];
  for (const g of gm) {
    lines.push(`gm,"${g.name}",${g.address},${g.price},${g.poolValue}`);
  }
  for (const g of glv) {
    lines.push(`glv,"${g.name}",${g.address},${g.price},${g.tvl}`);
  }
  return lines.join("\n") + "\n";
}

export function writeAllOutput(data: AllPriceData) {
  const dist = "dist";

  // Combined files under v1/
  const combinedJson = join(dist, "v1", "prices.json");
  const combinedCsv = join(dist, "v1", "prices.csv");

  ensureDir(combinedJson);
  writeFileSync(combinedJson, JSON.stringify(data, null, 2) + "\n");
  writeFileSync(combinedCsv, buildCombinedCsv(data));

  // Per-network files under v1/<network>/
  for (const [slug, nd] of Object.entries(data.networks)) {
    const networkJson = join(dist, "v1", slug, "prices.json");
    const networkCsv = join(dist, "v1", slug, "prices.csv");

    ensureDir(networkJson);

    const networkData = {
      updated: data.updated,
      gm: nd.gm,
      glv: nd.glv,
    };

    writeFileSync(networkJson, JSON.stringify(networkData, null, 2) + "\n");
    writeFileSync(networkCsv, buildNetworkCsv(nd.gm, nd.glv));
  }

  // Copy landing page assets
  const pagesDir = join("src", "pages");
  for (const file of ["index.html", "style.css"]) {
    const src = join(pagesDir, file);
    if (existsSync(src)) {
      copyFileSync(src, join(dist, file));
    }
  }

  console.log("Output written to dist/");
}
