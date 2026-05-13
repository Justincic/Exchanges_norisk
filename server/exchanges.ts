import { createFundingMarket, normalizeBaseSymbol } from '../src/shared/funding';
import type { ExchangeHealth, ExchangeId, FundingMarket, QuoteAsset } from '../src/shared/types';

const JSON_HEADERS = { 'content-type': 'application/json' };
const REQUEST_TIMEOUT_MS = 12_000;
const OKX_CONCURRENCY = 6;

export type ExchangeFetchResult = {
  markets: FundingMarket[];
  health: ExchangeHealth;
};

export async function fetchAllExchangeMarkets(): Promise<ExchangeFetchResult[]> {
  return Promise.all([fetchHyperliquidMarkets(), fetchBinanceMarkets(), fetchOkxMarkets()]);
}

export async function fetchHyperliquidMarkets(): Promise<ExchangeFetchResult> {
  const exchange: ExchangeId = 'HL';
  const startedAt = Date.now();

  try {
    const data = await fetchJson<HyperliquidPredictedFunding[]>(
      'https://api.hyperliquid.xyz/info',
      {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ type: 'predictedFundings' })
      }
    );

    const markets: FundingMarket[] = [];
    for (const [coin, venues] of data) {
      for (const [venue, venueFunding] of venues) {
        if (venue !== 'HlPerp') continue;
        const fundingRate = Number(venueFunding.fundingRate);
        if (!Number.isFinite(fundingRate)) continue;

        markets.push(
          createFundingMarket({
            baseSymbol: coin.toUpperCase(),
            marketSymbol: `${coin.toUpperCase()}-USD`,
            exchange,
            fundingRate,
            nextFundingTime: Number(venueFunding.nextFundingTime) || null,
            intervalHours: 1,
            sourceUpdatedAt: startedAt
          })
        );
      }
    }

    return {
      markets,
      health: { exchange, ok: true, lastUpdatedAt: startedAt }
    };
  } catch (error) {
    return failure(exchange, error);
  }
}

export async function fetchBinanceMarkets(): Promise<ExchangeFetchResult> {
  const exchange: ExchangeId = 'BN';
  const startedAt = Date.now();

  try {
    const [premiumIndex, exchangeInfo, fundingInfo] = await Promise.all([
      fetchJson<BinancePremiumIndex[] | BinancePremiumIndex>('https://fapi.binance.com/fapi/v1/premiumIndex'),
      fetchJson<BinanceExchangeInfo>('https://fapi.binance.com/fapi/v1/exchangeInfo'),
      fetchJson<BinanceFundingInfo[]>('https://fapi.binance.com/fapi/v1/fundingInfo').catch(() => [])
    ]);

    const validSymbols = new Set(
      exchangeInfo.symbols
        .filter(
          (symbol) =>
            symbol.contractType === 'PERPETUAL' &&
            symbol.status === 'TRADING' &&
            (symbol.quoteAsset === 'USDT' || symbol.quoteAsset === 'USDC')
        )
        .map((symbol) => symbol.symbol)
    );
    const intervalBySymbol = new Map(
      fundingInfo.map((item) => [item.symbol, Number(item.fundingIntervalHours) || 8])
    );

    const rows = Array.isArray(premiumIndex) ? premiumIndex : [premiumIndex];
    const markets = rows
      .filter((row) => validSymbols.has(row.symbol))
      .map((row) =>
        createFundingMarket({
          marketSymbol: row.symbol,
          exchange,
          fundingRate: Number(row.lastFundingRate),
          nextFundingTime: Number(row.nextFundingTime) || null,
          intervalHours: intervalBySymbol.get(row.symbol) ?? 8,
          sourceUpdatedAt: startedAt
        })
      )
      .filter((market) => Number.isFinite(market.fundingRate));

    return {
      markets,
      health: { exchange, ok: true, lastUpdatedAt: startedAt }
    };
  } catch (error) {
    return failure(exchange, error);
  }
}

export async function fetchOkxMarkets(): Promise<ExchangeFetchResult> {
  const exchange: ExchangeId = 'OKX';
  const startedAt = Date.now();

  try {
    const instruments = await fetchJson<OkxResponse<OkxInstrument>>(
      'https://www.okx.com/api/v5/public/instruments?instType=SWAP'
    );

    const stableSwapInstruments = instruments.data.filter(
      (instrument) =>
        instrument.state === 'live' &&
        (instrument.settleCcy === 'USDT' || instrument.settleCcy === 'USDC') &&
        instrument.instId.endsWith('-SWAP')
    );

    const fundingRows = await mapWithConcurrency(stableSwapInstruments, OKX_CONCURRENCY, async (instrument) => {
      const params = new URLSearchParams({ instId: instrument.instId });
      const funding = await fetchJson<OkxResponse<OkxFundingRate>>(
        `https://www.okx.com/api/v5/public/funding-rate?${params.toString()}`
      );
      const row = funding.data[0];
      if (!row) return null;

      return createFundingMarket({
        baseSymbol: normalizeBaseSymbol(instrument.instId),
        marketSymbol: instrument.instId,
        exchange,
        fundingRate: Number(row.fundingRate),
        nextFundingTime: Number(row.nextFundingTime) || null,
        intervalHours: inferOkxIntervalHours(row),
        sourceUpdatedAt: startedAt
      });
    });

    return {
      markets: fundingRows.filter((market): market is FundingMarket => Boolean(market)),
      health: { exchange, ok: true, lastUpdatedAt: startedAt }
    };
  } catch (error) {
    return failure(exchange, error);
  }
}

function inferOkxIntervalHours(row: OkxFundingRate): number {
  const current = Number(row.fundingTime);
  const next = Number(row.nextFundingTime);
  if (Number.isFinite(current) && Number.isFinite(next) && next > current) {
    return Math.round((next - current) / 3_600_000);
  }
  return 8;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      try {
        results[currentIndex] = await mapper(items[currentIndex]);
      } catch {
        results[currentIndex] = null as R;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

function failure(exchange: ExchangeId, error: unknown): ExchangeFetchResult {
  return {
    markets: [],
    health: {
      exchange,
      ok: false,
      lastUpdatedAt: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  };
}

type HyperliquidPredictedFunding = [
  string,
  Array<[
    string,
    {
      fundingRate: string;
      nextFundingTime: number;
    }
  ]>
];

type BinancePremiumIndex = {
  symbol: string;
  lastFundingRate: string;
  nextFundingTime: number;
};

type BinanceExchangeInfo = {
  symbols: Array<{
    symbol: string;
    status: string;
    contractType: string;
    quoteAsset: QuoteAsset;
  }>;
};

type BinanceFundingInfo = {
  symbol: string;
  fundingIntervalHours: number;
};

type OkxResponse<T> = {
  code: string;
  msg: string;
  data: T[];
};

type OkxInstrument = {
  instId: string;
  settleCcy: QuoteAsset;
  state: string;
};

type OkxFundingRate = {
  fundingRate: string;
  fundingTime: string;
  nextFundingTime: string;
};
