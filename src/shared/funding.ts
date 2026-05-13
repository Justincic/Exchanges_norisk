import type { ExchangeId, FundingMarket, FundingOpportunity, QuoteAsset } from './types';

const STABLE_QUOTES = ['USDT', 'USDC', 'USD'] as const;

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
  const upper = symbol.toUpperCase().trim();
  const firstSegment = upper.split(/[-_/]/)[0];

  if (upper.includes('-')) {
    return firstSegment;
  }

  for (const quote of STABLE_QUOTES) {
    if (upper.endsWith(quote) && upper.length > quote.length) {
      return upper.slice(0, -quote.length);
    }
  }

  return upper;
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
    sourceUpdatedAt: input.sourceUpdatedAt ?? Date.now()
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
    .filter(([, group]) => new Set(group.map((market) => market.exchange)).size >= 2)
    .map(([baseSymbol, group]) => {
      const sortedByApr = [...group].sort((a, b) => a.annualizedRate - b.annualizedRate);
      const longMarket = sortedByApr[0] ?? null;
      const shortMarket = sortedByApr[sortedByApr.length - 1] ?? null;
      const spreadAnnualized =
        longMarket && shortMarket ? shortMarket.annualizedRate - longMarket.annualizedRate : 0;
      const spreadPerPeriod =
        longMarket && shortMarket ? spreadAnnualized / (365 * 3) : 0;
      const nextFundingTime = getNearestFundingTime(group);
      const quoteSet = new Set(group.map((market) => market.quoteAsset).filter((quote) => quote !== 'UNKNOWN'));

      return {
        baseSymbol,
        markets: sortMarketsForDisplay(group),
        longMarket,
        shortMarket,
        spreadAnnualized,
        spreadPerPeriod,
        nextFundingTime,
        hasMixedQuotes: quoteSet.size > 1
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

function sortMarketsForDisplay(markets: FundingMarket[]) {
  const order: ExchangeId[] = ['HL', 'OKX', 'BN'];
  return [...markets].sort((a, b) => {
    const exchangeDiff = order.indexOf(a.exchange) - order.indexOf(b.exchange);
    if (exchangeDiff !== 0) return exchangeDiff;
    return a.marketSymbol.localeCompare(b.marketSymbol);
  });
}
