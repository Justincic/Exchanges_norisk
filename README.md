# Funding Arbitrage Dashboard

A local dashboard for monitoring perpetual funding-rate opportunities across Hyperliquid, OKX, and Binance.

It combines a React frontend with a small Express backend that fetches exchange market data, normalizes it, and surfaces cross-exchange funding spreads for research and manual decision-making.

## What It Does

- Compares shared underlying assets across USDT and USDC perpetual markets.
- Shows funding rate, next funding time, annualized APR, and 8h-equivalent spread.
- Ranks candidate long/short funding spreads across Hyperliquid, OKX, and Binance.
- Refreshes data every 60 seconds through a local aggregation service.

## Tech Stack

- React 19
- TypeScript
- Vite
- Express
- Vitest

## Getting Started

### Requirements

- Node.js 20+ recommended
- npm

### Install

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env
```

The app works with the default values, but keeping a local `.env` makes port overrides explicit and keeps local setup consistent across contributors.

### Start the app

```bash
npm run dev
```

This starts:

- the frontend on `http://localhost:5173`
- the local API server on `http://localhost:8787`

## Available Scripts

```bash
npm run dev
npm run build
npm run test
npm run preview
```

## Environment Variables

The backend currently supports:

- `PORT`: Express server port. Default is `8787`.

## Project Structure

```text
src/
  main.tsx              Frontend app
  styles.css            App styles
  shared/               Shared funding logic and types
server/
  index.ts              Express API server
  exchanges.ts          Exchange fetch and normalization logic
```

## Open Source Notes

- This repository is suitable for sharing publicly on GitHub.
- The included `MIT` license allows personal and commercial use with attribution.
- Local tool metadata such as `.codex/` should stay ignored and does not need to be committed.

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Run `npm test` and `npm run build`.
4. Open a pull request with a clear description of the change.

More contributor guidance is available in `[CONTRIBUTING.md](/Users/justinchen/Documents/Google%20drive/Exchanges_norisk/CONTRIBUTING.md)`.

## Deployment

The frontend can be deployed as a static Vite site, but this project also depends on a local Express API in `server/index.ts`.

For a full hosted setup, deploy the API to a Node.js-friendly platform such as Render, Railway, or Fly.io, and deploy the frontend separately or behind the same service.

## Limitations

This is a monitoring and research tool only. It does not place trades or access private exchange accounts.

The data and heuristics shown in the UI do not fully account for:

- slippage
- order book depth
- stablecoin conversion costs
- borrow costs
- transfer latency
- liquidation risk
- exchange-specific execution constraints

Use it as a screening tool, not as trading advice.
