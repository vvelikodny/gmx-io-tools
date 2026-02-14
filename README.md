# GMX IO Tools

Live GM and GLV token prices from GMX V2. Updated every 5 minutes via GitHub Actions and published to GitHub Pages.

## Live Data

| Format | URL |
|--------|-----|
| Landing page | https://vvelikodny.github.io/gmx-io-tools/ |
| All prices (JSON) | https://vvelikodny.github.io/gmx-io-tools/v1/prices.json |
| All prices (CSV) | https://vvelikodny.github.io/gmx-io-tools/v1/prices.csv |
| Arbitrum (JSON) | https://vvelikodny.github.io/gmx-io-tools/v1/arbitrum/prices.json |
| Arbitrum (CSV) | https://vvelikodny.github.io/gmx-io-tools/v1/arbitrum/prices.csv |
| Avalanche (JSON) | https://vvelikodny.github.io/gmx-io-tools/v1/avalanche/prices.json |
| Avalanche (CSV) | https://vvelikodny.github.io/gmx-io-tools/v1/avalanche/prices.csv |

## Supported Networks

| Network | GM Tokens | GLV Vaults |
|---------|-----------|------------|
| Arbitrum | All markets | All vaults |
| Avalanche | All markets | All vaults |

## Google Sheets

No scripts, no permissions, no setup — just one formula.

1. Open Google Sheets
2. Click on any empty cell
3. Paste the formula
4. Press Enter — done!

```
=IMPORTDATA("https://vvelikodny.github.io/gmx-io-tools/v1/prices.csv")
```

For a specific network:

```
=IMPORTDATA("https://vvelikodny.github.io/gmx-io-tools/v1/arbitrum/prices.csv")
=IMPORTDATA("https://vvelikodny.github.io/gmx-io-tools/v1/avalanche/prices.csv")
```

## CLI Usage

```bash
npm start                # All networks
npm start arbitrum       # Arbitrum only
npm start avalanche      # Avalanche only
```

## Data Format

### JSON

```json
{
  "updated": "2026-02-14T12:00:00.000Z",
  "networks": {
    "arbitrum": {
      "gm": [
        {
          "address": "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
          "name": "ETH/USD [ETH-USDC]",
          "price": 1.5673,
          "poolValue": 52861762.17
        }
      ],
      "glv": [
        {
          "address": "0x...",
          "name": "GLV [WETH-USDC]",
          "price": 1.23,
          "tvl": 100000000
        }
      ]
    }
  }
}
```

### CSV

```
network,type,name,address,price,poolValue
arbitrum,gm,"ETH/USD [ETH-USDC]",0x70d9...,1.5673,52861762.17
arbitrum,glv,"GLV [WETH-USDC]",0x...,1.23,100000000
```

## Development

```bash
git clone https://github.com/vvelikodny/gmx-io-tools.git
cd gmx-io-tools
npm install
cp .env.example .env
npm start
```

To generate the full output (JSON, CSV, landing page):

```bash
npm run build
```

## How It Works

1. Fetches all GM market configs from the GMX Oracle API for each network
2. Fetches current oracle ticker prices
3. Calls `SyntheticsReader.getMarketTokenPrice` on-chain for each GM token
4. Discovers GLV vaults via `GlvReader.getGlvInfoList` and fetches prices via `GlvReader.getGlvTokenPrice`
5. Generates JSON, CSV, and an HTML landing page in `dist/`
6. GitHub Actions deploys to GitHub Pages every 5 minutes
