export type ExchangeId = 'HL' | 'OKX' | 'BN';
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
