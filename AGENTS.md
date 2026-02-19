# AGENTS.md — gmx-io-tools

## Project Overview

TypeScript CLI and static-site generator that fetches live GM and GLV token prices
from GMX V2 (Arbitrum and Avalanche) via on-chain RPC calls, then outputs JSON, CSV,
and an HTML landing page to `dist/`. Deployed to GitHub Pages every 5 minutes via
GitHub Actions.

**Stack:** TypeScript (ESM) · Node.js 22 · viem · @gmx-io/sdk · dotenv · tsx

## Repository Layout

```
src/
  index.ts        CLI entry point — prints prices to console
  publish.ts      Build entry point — fetches data and writes dist/
  config.ts       Network configs, contract addresses, asset whitelist
  api.ts          HTTP calls to GMX Oracle API (markets, tickers, tokens)
  prices.ts       Core logic — on-chain GM/GLV price fetching via viem
  output.ts       File generation (JSON, CSV, HTML to dist/)
  types.ts        Shared TypeScript interfaces
  abis.ts         ABI re-exports from @gmx-io/sdk
  pages/          Static landing page assets (index.html, style.css)
dist/             Generated output (gitignored)
```

## Build / Run / Test Commands

```bash
npm install                # Install dependencies
npm start                  # Run CLI — all networks
npm start arbitrum         # Run CLI — single network
npm start avalanche        # Run CLI — single network
npm run build              # Build static output to dist/
npx tsc --noEmit           # Type-check only (no emit)
npx tsx src/<file>.ts      # Run a single source file directly
```

**No test framework is configured.** No test files, runner, or `test` script exist.
If adding tests, use `vitest` (compatible with the ESM + TypeScript setup).

**No linter or formatter is configured.** No ESLint, Prettier, or EditorConfig.
Follow the conventions below to stay consistent.

## Environment Variables

Copy `.env.example` to `.env`. Both variables have fallback defaults in `config.ts`,
so `.env` is optional for basic usage.

```
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
```

## CI/CD

GitHub Actions workflow (`.github/workflows/update-prices.yml`):
- Runs on cron every 5 minutes + manual dispatch
- Node.js 22, `npm ci`, then `npx tsx src/publish.ts`
- Deploys `dist/` to GitHub Pages

## Code Style Guidelines

### Module System & Imports

- ESM throughout (`"type": "module"` in package.json).
- Use `.js` extensions in all local imports (required by ESM resolution):
  ```ts
  import { NETWORKS } from "./config.js";
  ```
- Group imports: side-effect first, then third-party, then local modules.
- Use `import type` for type-only imports:
  ```ts
  import type { OracleMarket, Ticker } from "./types.js";
  ```
- Inline `type` keyword when mixing values and types in one import:
  ```ts
  import { type Address, type PublicClient, encodeAbiParameters } from "viem";
  ```
- Use `node:` prefix for built-in modules:
  ```ts
  import { mkdirSync, writeFileSync } from "node:fs";
  ```
- Use native `fetch()` (Node.js 22 built-in) — no axios or node-fetch.

### Formatting

- 2-space indentation
- Double quotes for strings
- Trailing semicolons
- Trailing commas in multi-line arrays/objects
- No trailing whitespace
- Files end with a single newline
- ~80-100 char line width (soft limit)

### Naming Conventions

| Element            | Convention       | Examples                                   |
|--------------------|------------------|--------------------------------------------|
| Interfaces         | PascalCase       | `NetworkConfig`, `GmResult`, `AllPriceData`|
| Functions          | camelCase        | `fetchMarkets`, `bigintToFloat`            |
| Constants          | UPPER_SNAKE_CASE | `NETWORKS`, `BATCH_SIZE`, `MAX_RETRIES`    |
| Variables          | camelCase        | `networkFilter`, `tickers`, `tokenMeta`    |
| Files              | lowercase        | `prices.ts`, `config.ts`, `output.ts`      |
| Type parameters    | Single uppercase | `<T>`, `<T, R>`                            |

### TypeScript

- Strict mode enabled (`"strict": true` in tsconfig.json)
- Target: ES2022, Module: ESNext, ModuleResolution: bundler
- All shared interfaces live in `types.ts`
- Use `Record<string, T>` for map/dictionary types
- Use viem types (`Address`, `PublicClient`, `Chain`) for Ethereum values
- Use native `BigInt` literals (`10n`, `0n`) — never `BigInt()` constructor
- Prefer explicit return types on exported functions

### Error Handling

- Entry points use `main().catch()`:
  ```ts
  main().catch((err) => {
    console.error("Error:", err.message || err);
    process.exit(1);
  });
  ```
- Catch blocks annotate error as `any`: `catch (err: any)`
- Use `err.shortMessage || err.message` (viem errors expose `shortMessage`)
- Non-critical failures log a warning and return `undefined` (graceful degradation):
  ```ts
  } catch (err: any) {
    console.warn(`  [${network.slug}] Skipping GM ${m.marketToken}: ${err.shortMessage || err.message}`);
    return undefined;
  }
  ```
- Use the `withRetry<T>()` helper for RPC calls (exponential backoff, 3 retries)

### Async Patterns

- `async/await` everywhere — no raw `.then()` chains
- `Promise.all()` for independent parallel work (e.g., fetching markets + tickers)
- `processBatches()` for rate-limited sequential batch processing (BATCH_SIZE=5)
- Small `sleep(200)` between RPC batches to avoid rate limiting

### Output / Data Format

- JSON: 2-space indentation + trailing newline (`JSON.stringify(data, null, 2) + "\n"`)
- CSV: manual string construction, trailing newline, no external CSV library
- Versioned API paths (`/v1/`) for backward compatibility
- File I/O uses synchronous `fs` functions (`writeFileSync`, `mkdirSync`)

### Console Output

- `console.log` for normal output and progress
- `console.warn` for non-fatal warnings (skipped tokens)
- `console.error` for fatal errors before `process.exit(1)`
- Prefix network context in brackets: `[Arbitrum]`, `[avalanche]`

## Key Domain Concepts

- **GM Tokens:** GMX V2 market pool tokens — priced via `SyntheticsReader.getMarketTokenPrice`
- **GLV Vaults:** GMX Liquidity Vault tokens — priced via `GlvReader.getGlvTokenPrice`
- **Oracle prices** use 30-decimal precision (`bigintToFloat(value, 30)`)
- **Whitelist:** Only established assets included (`WHITELISTED_SYMBOLS` in `config.ts`). Meme tokens excluded.
- **Networks:** Arbitrum and Avalanche. Config includes chain, RPC URL, API URL, and contract addresses.
