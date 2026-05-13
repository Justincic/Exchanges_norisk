# Funding Arbitrage Dashboard

Local dashboard for comparing perpetual funding-rate opportunities across Hyperliquid, OKX, and Binance.

## Features

- Compares shared underlying assets across USDT and USDC perpetual markets.
- Shows funding rate, next funding time, annualized APR, and 8h-equivalent spread.
- Ranks candidate long/short funding spreads across HL, OKX, and BN.
- Refreshes every 60 seconds through a local Express aggregation backend.

## Run Locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Notes

This is a monitoring and research tool only. It does not trade, access private accounts, or account for fees, slippage, stablecoin conversion costs, borrow costs, or order book depth.
