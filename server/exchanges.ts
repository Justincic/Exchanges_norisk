import { createFundingMarket, normalizeBaseSymbol } from '../src/shared/funding';
import type { ExchangeHealth, ExchangeId, FundingMarket, QuoteAsset } from '../src/shared/types';

const JSON_HEADERS = { 'content-type': 'application/json' };
const REQUEST_TIMEOUT_MS = 12_000;
const OKX_CONCURRENCY = 6;
const HYPERLIQUID_HIP3_DEXS = ['xyz'];

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
    const [coreMarkets, hip3Markets] = await Promise.all([
      fetchHyperliquidCoreMarkets(startedAt),
      Promise.all(HYPERLIQUID_HIP3_DEXS.map((dex) => fetchHyperliquidDexMarkets(dex, startedAt)))
    ]);
    const markets = [...coreMarkets, ...hip3Markets.flat()];

    return {
      markets,
      health: { exchange, ok: true, lastUpdatedAt: startedAt }
    };
  } catch (error) {
    return failure(exchange, error);
  }
}

async function fetchHyperliquidCoreMarkets(sourceUpdatedAt: number): Promise<FundingMarket[]> {
  const exchange: ExchangeId = 'HL';
  const [meta, contexts] = await fetchJson<HyperliquidMetaAndAssetCtxs>('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ type: 'metaAndAssetCtxs' })
  });

  return meta.universe
    .map((asset, index) => {
      const context = contexts[index];
      const fundingRate = Number(context?.funding);
      if (!Number.isFinite(fundingRate)) return null;
      const markPrice = Number(context?.markPx);
      const openInterest = Number(context?.openInterest);
      const dayNtlVlm = Number(context?.dayNtlVlm);

      return createFundingMarket({
        baseSymbol: normalizeBaseSymbol(asset.name),
        marketSymbol: `${asset.name.toUpperCase()}-USD`,
        exchange,
        fundingRate,
        nextFundingTime: nextHourlyFundingTime(sourceUpdatedAt),
        intervalHours: 1,
        markPrice,
        indexPrice: Number(context?.oraclePx),
        openInterestUsd: Number.isFinite(openInterest * markPrice) ? openInterest * markPrice : null,
        volume24hUsd: Number.isFinite(dayNtlVlm) ? dayNtlVlm : null,
        sourceUpdatedAt
      });
    })
    .filter((market): market is FundingMarket => Boolean(market));
}

async function fetchHyperliquidDexMarkets(dex: string, sourceUpdatedAt: number): Promise<FundingMarket[]> {
  const exchange: ExchangeId = 'HL';
  const [meta, contexts] = await fetchJson<HyperliquidMetaAndAssetCtxs>('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ type: 'metaAndAssetCtxs', dex })
  });

  return meta.universe
    .map((asset, index) => {
      const context = contexts[index];
      const fundingRate = Number(context?.funding);
      if (!Number.isFinite(fundingRate)) return null;
      const rawBase = asset.name.replace(/^[^:]+:/, '').toUpperCase();
      const markPrice = Number(context?.markPx);
      const openInterest = Number(context?.openInterest);
      const dayNtlVlm = Number(context?.dayNtlVlm);

      return createFundingMarket({
        baseSymbol: normalizeBaseSymbol(rawBase),
        marketSymbol: formatHyperliquidDexMarketSymbol(rawBase),
        exchange,
        fundingRate,
        nextFundingTime: nextHourlyFundingTime(sourceUpdatedAt),
        intervalHours: 1,
        markPrice,
        indexPrice: Number(context?.oraclePx),
        openInterestUsd: Number.isFinite(openInterest * markPrice) ? openInterest * markPrice : null,
        volume24hUsd: Number.isFinite(dayNtlVlm) ? dayNtlVlm : null,
        sourceUpdatedAt
      });
    })
    .filter((market): market is FundingMarket => Boolean(market));
}

export async function fetchBinanceMarkets(): Promise<ExchangeFetchResult> {
  const exchange: ExchangeId = 'BN';
  const startedAt = Date.now();

  try {
    const [premiumIndex, exchangeInfo, fundingInfo, tickers] = await Promise.all([
      fetchJson<BinancePremiumIndex[] | BinancePremiumIndex>('https://fapi.binance.com/fapi/v1/premiumIndex'),
      fetchJson<BinanceExchangeInfo>('https://fapi.binance.com/fapi/v1/exchangeInfo'),
      fetchJson<BinanceFundingInfo[]>('https://fapi.binance.com/fapi/v1/fundingInfo').catch(() => []),
      fetchJson<BinanceTicker24h[]>('https://fapi.binance.com/fapi/v1/ticker/24hr').catch(() => [])
    ]);

    const validSymbols = new Set(
      exchangeInfo.symbols
        .filter(
          (symbol) =>
            (symbol.contractType === 'PERPETUAL' || symbol.contractType === 'TRADIFI_PERPETUAL') &&
            symbol.status === 'TRADING' &&
            (symbol.quoteAsset === 'USDT' || symbol.quoteAsset === 'USDC')
        )
        .map((symbol) => symbol.symbol)
    );
    const intervalBySymbol = new Map(
      fundingInfo.map((item) => [item.symbol, Number(item.fundingIntervalHours) || 8])
    );
    const tickerBySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));

    const rows = Array.isArray(premiumIndex) ? premiumIndex : [premiumIndex];
    const markets = rows
      .filter((row) => validSymbols.has(row.symbol))
      .map((row) =>
        {
          const ticker = tickerBySymbol.get(row.symbol);
          return createFundingMarket({
            marketSymbol: row.symbol,
            exchange,
            fundingRate: Number(row.lastFundingRate),
            nextFundingTime: Number(row.nextFundingTime) || null,
            intervalHours: intervalBySymbol.get(row.symbol) ?? 8,
            markPrice: Number(row.markPrice),
            indexPrice: Number(row.indexPrice),
            volume24hUsd: Number(ticker?.quoteVolume),
            sourceUpdatedAt: startedAt
          });
        }
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
    const [instruments, tickers] = await Promise.all([
      fetchJson<OkxResponse<OkxInstrument>>('https://www.okx.com/api/v5/public/instruments?instType=SWAP'),
      fetchJson<OkxResponse<OkxTicker>>('https://www.okx.com/api/v5/market/tickers?instType=SWAP').catch(() => ({
        code: '0',
        msg: '',
        data: []
      }))
    ]);
    const tickerByInstId = new Map(tickers.data.map((ticker) => [ticker.instId, ticker]));

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
      const ticker = tickerByInstId.get(instrument.instId);
      const lastPrice = Number(ticker?.last);

      return createFundingMarket({
        baseSymbol: normalizeBaseSymbol(instrument.instId),
        marketSymbol: instrument.instId,
        exchange,
        fundingRate: Number(row.fundingRate),
        nextFundingTime: Number(row.nextFundingTime) || null,
        intervalHours: inferOkxIntervalHours(row),
        markPrice: lastPrice,
        volume24hUsd: estimateOkxVolumeUsd(ticker),
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

function nextHourlyFundingTime(now: number) {
  return Math.ceil(now / 3_600_000) * 3_600_000;
}

function formatHyperliquidDexMarketSymbol(rawBase: string) {
  if (rawBase === 'CL') return 'WTIOIL-USDC';
  return `${rawBase}-USDC`;
}

function estimateOkxVolumeUsd(ticker: OkxTicker | undefined) {
  if (!ticker) return null;
  const last = Number(ticker.last);
  const quoteVolume = Number(ticker.volCcy24h);
  if (Number.isFinite(quoteVolume) && quoteVolume > 0) return quoteVolume;
  const baseVolume = Number(ticker.vol24h);
  if (Number.isFinite(baseVolume * last)) return baseVolume * last;
  return null;
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

type HyperliquidMetaAndAssetCtxs = [
  {
    universe: Array<{
      name: string;
    }>;
  },
  Array<{
    funding?: string;
    markPx?: string;
    midPx?: string;
    oraclePx?: string;
    openInterest?: string;
    dayNtlVlm?: string;
  }>
];

type BinancePremiumIndex = {
  symbol: string;
  lastFundingRate: string;
  nextFundingTime: number;
  markPrice: string;
  indexPrice: string;
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

type BinanceTicker24h = {
  symbol: string;
  quoteVolume: string;
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

type OkxTicker = {
  instId: string;
  last: string;
  vol24h: string;
  volCcy24h: string;
};
