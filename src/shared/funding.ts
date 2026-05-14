import type { ExchangeId, FundingMarket, FundingOpportunity, QuoteAsset } from './types';

const STABLE_QUOTES = ['USDT', 'USDC', 'USD'] as const;
const LOW_LIQUIDITY_USD = 5_000_000;
const BASE_ALIASES: Record<string, string> = {
  CL: 'WTI',
  WTIOIL: 'WTI',
  WTI: 'WTI',
  BZ: 'BRENT',
  BRENT: 'BRENT',
  BRENTCRUDE: 'BRENT',
  BRENTOIL: 'BRENT',
  NATGAS: 'NATGAS',
  NG: 'NATGAS',
  COPPER: 'COPPER',
  HG: 'COPPER',
  GOLD: 'XAU',
  XAU: 'XAU',
  SILVER: 'XAG',
  XAG: 'XAG',
  PLATINUM: 'XPT',
  XPT: 'XPT',
  PALLADIUM: 'XPD',
  XPD: 'XPD',
  SP500: 'SPX'
};

export function detectQuoteAsset(symbol: string): QuoteAsset {
  const segments = symbol.toUpperCase().split(/[-_/]/);
  for (const quote of STABLE_QUOTES) {
    if (segments.includes(quote)) return quote;
  }

  const compact = symbol.toUpperCase().replace(/[-_/]/g, '');
  if (compact.endsWith('USDT')) return 'USDT';
  if (compact.endsWith('USDC')) return 'USDC';
  if (compact.endsWith('USD')) return 'USD';
  return 'UNKNOWN';
}

export function normalizeBaseSymbol(symbol: string): string {
  const upper = symbol.toUpperCase().trim().replace(/^[A-Z0-9]+:/, '');
  const firstSegment = upper.split(/[-_/]/)[0];

  if (upper.includes('-')) {
    return canonicalizeBaseSymbol(firstSegment);
  }

  for (const quote of STABLE_QUOTES) {
    if (upper.endsWith(quote) && upper.length > quote.length) {
      return canonicalizeBaseSymbol(upper.slice(0, -quote.length));
    }
  }

  return canonicalizeBaseSymbol(upper);
}

export function annualizeFundingRate(fundingRate: number, intervalHours: number): number {
  if (!Number.isFinite(fundingRate) || !Number.isFinite(intervalHours) || intervalHours <= 0) {
    return 0;
  }
  return fundingRate * (24 / intervalHours) * 365;
}

export function createFundingMarket(input: {
  baseSymbol?: string;
  marketSymbol: string;
  exchange: ExchangeId;
  fundingRate: number;
  nextFundingTime: number | null;
  intervalHours?: number;
  sourceUpdatedAt?: number;
  markPrice?: number | null;
  indexPrice?: number | null;
  openInterestUsd?: number | null;
  volume24hUsd?: number | null;
}): FundingMarket {
  const intervalHours = input.intervalHours ?? inferIntervalHours(input.nextFundingTime);
  const baseSymbol = input.baseSymbol ?? normalizeBaseSymbol(input.marketSymbol);

  return {
    baseSymbol,
    marketSymbol: input.marketSymbol,
    quoteAsset: detectQuoteAsset(input.marketSymbol),
    exchange: input.exchange,
    fundingRate: input.fundingRate,
    nextFundingTime: input.nextFundingTime,
    intervalHours,
    annualizedRate: annualizeFundingRate(input.fundingRate, intervalHours),
    sourceUpdatedAt: input.sourceUpdatedAt ?? Date.now(),
    markPrice: normalizeNullableNumber(input.markPrice),
    indexPrice: normalizeNullableNumber(input.indexPrice),
    openInterestUsd: normalizeNullableNumber(input.openInterestUsd),
    volume24hUsd: normalizeNullableNumber(input.volume24hUsd),
    liquidityScoreUsd: getLiquidityScore(input.openInterestUsd, input.volume24hUsd)
  };
}

export function buildOpportunities(markets: FundingMarket[]): FundingOpportunity[] {
  const grouped = new Map<string, FundingMarket[]>();

  for (const market of markets) {
    if (!Number.isFinite(market.fundingRate)) continue;
    const list = grouped.get(market.baseSymbol) ?? [];
    list.push(market);
    grouped.set(market.baseSymbol, list);
  }

  return Array.from(grouped.entries())
    .filter(([, group]) => group.length >= 2)
    .map(([baseSymbol, group]) => {
      const bestPair = findBestPair(group);
      const longMarket = bestPair?.longMarket ?? null;
      const shortMarket = bestPair?.shortMarket ?? null;
      const spreadAnnualized =
        longMarket && shortMarket ? shortMarket.annualizedRate - longMarket.annualizedRate : 0;
      const spreadPerPeriod =
        longMarket && shortMarket ? spreadAnnualized / (365 * 3) : 0;
      const nextFundingTime = getNearestFundingTime(group);
      const settlementTimeDiffMs = getSettlementTimeDiffMs(longMarket, shortMarket);
      const priceSpreadPct = getPriceSpreadPct(longMarket, shortMarket);
      const minLiquidityUsd = getMinLiquidityUsd(longMarket, shortMarket);
      const quoteSet = new Set(group.map((market) => market.quoteAsset).filter((quote) => quote !== 'UNKNOWN'));

      return {
        baseSymbol,
        markets: sortMarketsForDisplay(group),
        longMarket,
        shortMarket,
        spreadAnnualized,
        spreadPerPeriod,
        nextFundingTime,
        hasMixedQuotes: quoteSet.size > 1,
        isCrossExchange: Boolean(longMarket && shortMarket && longMarket.exchange !== shortMarket.exchange),
        settlementTimeDiffMs,
        isSettlementAligned: settlementTimeDiffMs !== null && settlementTimeDiffMs <= 15 * 60_000,
        priceSpreadPct,
        minLiquidityUsd,
        hasLiquidityWarning: minLiquidityUsd !== null && minLiquidityUsd < LOW_LIQUIDITY_USD
      };
    })
    .sort((a, b) => b.spreadAnnualized - a.spreadAnnualized);
}

export function filterMixedQuotes(opportunities: FundingOpportunity[], includeMixedQuotes: boolean) {
  if (includeMixedQuotes) return opportunities;
  return opportunities
    .map((opportunity) => {
      const markets = opportunity.markets.filter((market) => market.quoteAsset !== 'UNKNOWN');
      const groupedByQuote = new Map<QuoteAsset, FundingMarket[]>();
      for (const market of markets) {
        const list = groupedByQuote.get(market.quoteAsset) ?? [];
        list.push(market);
        groupedByQuote.set(market.quoteAsset, list);
      }

      const bestSameQuote = Array.from(groupedByQuote.values())
        .map(buildOpportunities)
        .flat()
        .sort((a, b) => b.spreadAnnualized - a.spreadAnnualized)[0];

      return bestSameQuote;
    })
    .filter((opportunity): opportunity is FundingOpportunity => Boolean(opportunity));
}

function inferIntervalHours(nextFundingTime: number | null): number {
  if (!nextFundingTime) return 8;
  const hoursUntilFunding = Math.round((nextFundingTime - Date.now()) / 3_600_000);
  if (hoursUntilFunding > 0 && hoursUntilFunding <= 2) return 1;
  return 8;
}

function getNearestFundingTime(markets: FundingMarket[]): number | null {
  const times = markets
    .map((market) => market.nextFundingTime)
    .filter((time): time is number => typeof time === 'number' && Number.isFinite(time));
  return times.length ? Math.min(...times) : null;
}

function getSettlementTimeDiffMs(longMarket: FundingMarket | null, shortMarket: FundingMarket | null): number | null {
  if (!longMarket?.nextFundingTime || !shortMarket?.nextFundingTime) return null;
  return Math.abs(shortMarket.nextFundingTime - longMarket.nextFundingTime);
}

function getPriceSpreadPct(longMarket: FundingMarket | null, shortMarket: FundingMarket | null): number | null {
  if (!longMarket?.markPrice || !shortMarket?.markPrice || longMarket.markPrice <= 0) return null;
  return (shortMarket.markPrice - longMarket.markPrice) / longMarket.markPrice;
}

function getMinLiquidityUsd(longMarket: FundingMarket | null, shortMarket: FundingMarket | null): number | null {
  const values = [longMarket?.liquidityScoreUsd, shortMarket?.liquidityScoreUsd].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  );
  return values.length ? Math.min(...values) : null;
}

function sortMarketsForDisplay(markets: FundingMarket[]) {
  const order: ExchangeId[] = ['HL', 'Lighter', 'OKX', 'BN', 'Aster'];
  return [...markets].sort((a, b) => {
    const exchangeDiff = order.indexOf(a.exchange) - order.indexOf(b.exchange);
    if (exchangeDiff !== 0) return exchangeDiff;
    return a.marketSymbol.localeCompare(b.marketSymbol);
  });
}

function findBestPair(markets: FundingMarket[]) {
  let bestPair: { longMarket: FundingMarket; shortMarket: FundingMarket; spreadAnnualized: number } | null = null;

  for (const longMarket of markets) {
    for (const shortMarket of markets) {
      if (longMarket.marketSymbol === shortMarket.marketSymbol && longMarket.exchange === shortMarket.exchange) continue;
      const spreadAnnualized = shortMarket.annualizedRate - longMarket.annualizedRate;
      if (!bestPair || spreadAnnualized > bestPair.spreadAnnualized) {
        bestPair = { longMarket, shortMarket, spreadAnnualized };
      }
    }
  }

  return bestPair;
}

function canonicalizeBaseSymbol(baseSymbol: string): string {
  return BASE_ALIASES[baseSymbol] ?? baseSymbol;
}

function normalizeNullableNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getLiquidityScore(openInterestUsd: number | null | undefined, volume24hUsd: number | null | undefined) {
  const values = [openInterestUsd, volume24hUsd].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  );
  return values.length ? Math.max(...values) : null;
}
