import { describe, expect, it } from 'vitest';
import {
  annualizeFundingRate,
  buildOpportunities,
  createFundingMarket,
  detectQuoteAsset,
  filterMixedQuotes,
  normalizeBaseSymbol
} from './funding';

describe('funding normalization', () => {
  it('maps exchange market names to a canonical base symbol', () => {
    expect(normalizeBaseSymbol('BTCUSDT')).toBe('BTC');
    expect(normalizeBaseSymbol('BTCUSDC')).toBe('BTC');
    expect(normalizeBaseSymbol('BTC-USDT-SWAP')).toBe('BTC');
    expect(normalizeBaseSymbol('BTC-USDC-SWAP')).toBe('BTC');
    expect(normalizeBaseSymbol('BTC')).toBe('BTC');
  });

  it('maps TradFi aliases to the same canonical base symbol', () => {
    expect(normalizeBaseSymbol('CLUSDT')).toBe('WTI');
    expect(normalizeBaseSymbol('CL-USDT-SWAP')).toBe('WTI');
    expect(normalizeBaseSymbol('WTIOIL')).toBe('WTI');
    expect(normalizeBaseSymbol('BZUSDT')).toBe('BRENT');
    expect(normalizeBaseSymbol('xyz:BRENTOIL')).toBe('BRENT');
    expect(normalizeBaseSymbol('GOLD-USDT-SWAP')).toBe('XAU');
    expect(normalizeBaseSymbol('xyz:SP500')).toBe('SPX');
  });

  it('preserves quote asset for display', () => {
    expect(detectQuoteAsset('BTCUSDT')).toBe('USDT');
    expect(detectQuoteAsset('BTC-USDC-SWAP')).toBe('USDC');
    expect(detectQuoteAsset('BTC')).toBe('UNKNOWN');
  });

  it('annualizes 1h and 8h rates', () => {
    expect(annualizeFundingRate(0.0001, 8)).toBeCloseTo(0.1095);
    expect(annualizeFundingRate(0.0001, 1)).toBeCloseTo(0.876);
  });
});

describe('opportunity ranking', () => {
  it('selects low funding as long side and high funding as short side', () => {
    const opportunities = buildOpportunities([
      createFundingMarket({
        marketSymbol: 'BTCUSDT',
        exchange: 'BN',
        fundingRate: 0.0002,
        nextFundingTime: 1_800_000_000_000,
        intervalHours: 8
      }),
      createFundingMarket({
        marketSymbol: 'BTC-USDC-SWAP',
        exchange: 'OKX',
        fundingRate: -0.0001,
        nextFundingTime: 1_800_000_000_000,
        intervalHours: 8
      })
    ]);

    expect(opportunities[0].longMarket?.exchange).toBe('OKX');
    expect(opportunities[0].shortMarket?.exchange).toBe('BN');
    expect(opportunities[0].spreadAnnualized).toBeCloseTo(0.3285);
    expect(opportunities[0].hasMixedQuotes).toBe(true);
  });

  it('allows same-exchange opportunities when they have the best spread', () => {
    const opportunities = buildOpportunities([
      createFundingMarket({
        baseSymbol: 'SPX',
        marketSymbol: 'SP500-USDC',
        exchange: 'HL',
        fundingRate: -0.0001,
        nextFundingTime: null,
        intervalHours: 1
      }),
      createFundingMarket({
        baseSymbol: 'SPX',
        marketSymbol: 'SPX-USD',
        exchange: 'HL',
        fundingRate: 0.0002,
        nextFundingTime: null,
        intervalHours: 1
      }),
      createFundingMarket({
        baseSymbol: 'SPX',
        marketSymbol: 'SPXUSDT',
        exchange: 'BN',
        fundingRate: 0.00005,
        nextFundingTime: null,
        intervalHours: 1
      })
    ]);

    expect(opportunities[0].longMarket?.marketSymbol).toBe('SP500-USDC');
    expect(opportunities[0].shortMarket?.marketSymbol).toBe('SPX-USD');
    expect(opportunities[0].isCrossExchange).toBe(false);
  });

  it('keeps mixed USDT/USDC opportunities by default and can filter them out', () => {
    const opportunities = buildOpportunities([
      createFundingMarket({
        marketSymbol: 'ETHUSDT',
        exchange: 'BN',
        fundingRate: 0.0002,
        nextFundingTime: null,
        intervalHours: 8
      }),
      createFundingMarket({
        marketSymbol: 'ETH-USDC-SWAP',
        exchange: 'OKX',
        fundingRate: -0.0001,
        nextFundingTime: null,
        intervalHours: 8
      })
    ]);

    expect(opportunities).toHaveLength(1);
    expect(filterMixedQuotes(opportunities, false)).toHaveLength(0);
  });
});
