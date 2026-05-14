export type ExchangeId = 'HL' | 'Lighter' | 'OKX' | 'BN' | 'Aster';
export type QuoteAsset = 'USDT' | 'USDC' | 'USD' | 'UNKNOWN';

export type FundingMarket = {
  baseSymbol: string;
  marketSymbol: string;
  quoteAsset: QuoteAsset;
  exchange: ExchangeId;
  fundingRate: number;
  nextFundingTime: number | null;
  intervalHours: number;
  annualizedRate: number;
  sourceUpdatedAt: number;
  markPrice: number | null;
  indexPrice: number | null;
  openInterestUsd: number | null;
  volume24hUsd: number | null;
  liquidityScoreUsd: number | null;
};

export type FundingOpportunity = {
  baseSymbol: string;
  markets: FundingMarket[];
  longMarket: FundingMarket | null;
  shortMarket: FundingMarket | null;
  spreadAnnualized: number;
  spreadPerPeriod: number;
  nextFundingTime: number | null;
  hasMixedQuotes: boolean;
  isCrossExchange: boolean;
  settlementTimeDiffMs: number | null;
  isSettlementAligned: boolean;
  priceSpreadPct: number | null;
  minLiquidityUsd: number | null;
  hasLiquidityWarning: boolean;
};

export type ExchangeHealth = {
  exchange: ExchangeId;
  ok: boolean;
  lastUpdatedAt: number | null;
  error?: string;
};

export type FundingSnapshot = {
  generatedAt: number;
  cacheExpiresAt: number;
  opportunities: FundingOpportunity[];
  health: ExchangeHealth[];
};
