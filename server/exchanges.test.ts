import { describe, expect, it, vi } from 'vitest';
import { fetchBinanceMarkets, fetchHyperliquidMarkets, fetchLighterMarkets } from './exchanges';

describe('exchange adapters', () => {
  it('normalizes Hyperliquid core funding rows with price and liquidity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        if (body.type === 'metaAndAssetCtxs' && !body.dex) {
          return {
            ok: true,
            json: async () => [
              { universe: [{ name: 'BTC' }] },
              [{ funding: '0.0000125', markPx: '100000', oraclePx: '99900', openInterest: '10', dayNtlVlm: '5000000' }]
            ]
          };
        }
        return {
          ok: true,
          json: async () => [{ universe: [] }, []]
        };
      })
    );

    const result = await fetchHyperliquidMarkets();

    expect(result.health.ok).toBe(true);
    expect(result.markets).toHaveLength(1);
    expect(result.markets[0]).toMatchObject({
      baseSymbol: 'BTC',
      exchange: 'HL',
      fundingRate: 0.0000125,
      intervalHours: 1,
      markPrice: 100000,
      openInterestUsd: 1000000,
      volume24hUsd: 5000000
    });
    vi.unstubAllGlobals();
  });

  it('normalizes Hyperliquid xyz HIP-3 markets', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        if (!body.dex) {
          return {
            ok: true,
            json: async () => [{ universe: [] }, []]
          };
        }
        return {
          ok: true,
          json: async () => [
            { universe: [{ name: 'xyz:CL' }, { name: 'xyz:GOLD' }] },
            [
              { funding: '-0.0002', markPx: '99', oraclePx: '100', openInterest: '1000', dayNtlVlm: '100000' },
              { funding: '0.00001', markPx: '4000', oraclePx: '3999', openInterest: '10', dayNtlVlm: '200000' }
            ]
          ]
        };
      })
    );

    const result = await fetchHyperliquidMarkets();

    expect(result.health.ok).toBe(true);
    expect(result.markets.map((market) => market.marketSymbol)).toEqual(['WTIOIL-USDC', 'GOLD-USDC']);
    expect(result.markets.map((market) => market.baseSymbol)).toEqual(['WTI', 'XAU']);
    vi.unstubAllGlobals();
  });

  it('normalizes Binance USDT and USDC perpetual rows', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('premiumIndex')) {
          return {
            ok: true,
            json: async () => [
              { symbol: 'BTCUSDT', lastFundingRate: '0.0001', nextFundingTime: 1_800_000_000_000, markPrice: '100000', indexPrice: '99900' },
              { symbol: 'ETHUSDC', lastFundingRate: '-0.0001', nextFundingTime: 1_800_000_000_000, markPrice: '4000', indexPrice: '3990' },
              { symbol: 'AAPLUSDT', lastFundingRate: '0.0002', nextFundingTime: 1_800_000_000_000, markPrice: '290', indexPrice: '289' },
              { symbol: 'BTCUSD_PERP', lastFundingRate: '0.1', nextFundingTime: 1_800_000_000_000, markPrice: '1', indexPrice: '1' }
            ]
          };
        }
        if (url.includes('ticker/24hr')) {
          return {
            ok: true,
            json: async () => [
              { symbol: 'BTCUSDT', quoteVolume: '1000000000' },
              { symbol: 'ETHUSDC', quoteVolume: '500000000' },
              { symbol: 'AAPLUSDT', quoteVolume: '12000000' }
            ]
          };
        }
        if (url.includes('exchangeInfo')) {
          return {
            ok: true,
            json: async () => ({
              symbols: [
                { symbol: 'BTCUSDT', status: 'TRADING', contractType: 'PERPETUAL', quoteAsset: 'USDT' },
                { symbol: 'ETHUSDC', status: 'TRADING', contractType: 'PERPETUAL', quoteAsset: 'USDC' },
                { symbol: 'AAPLUSDT', status: 'TRADING', contractType: 'TRADIFI_PERPETUAL', quoteAsset: 'USDT' }
              ]
            })
          };
        }
        return {
          ok: true,
          json: async () => [{ symbol: 'ETHUSDC', fundingIntervalHours: 4 }]
        };
      })
    );

    const result = await fetchBinanceMarkets();

    expect(result.health.ok).toBe(true);
    expect(result.markets.map((market) => market.marketSymbol)).toEqual(['BTCUSDT', 'ETHUSDC', 'AAPLUSDT']);
    expect(result.markets.find((market) => market.marketSymbol === 'ETHUSDC')?.intervalHours).toBe(4);
    vi.unstubAllGlobals();
  });

  it('normalizes Lighter funding rows with price and volume', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('funding-rates')) {
          return {
            ok: true,
            json: async () => ({
              code: 200,
              funding_rates: [
                { market_id: 113, exchange: 'binance', symbol: 'AAPL', rate: 0.999 },
                { market_id: 113, exchange: 'lighter', symbol: 'AAPL', rate: 0.00012 },
                { market_id: 999, exchange: 'lighter', symbol: 'INACTIVE', rate: 0.0005 }
              ]
            })
          };
        }
        if (url.includes('orderBooks')) {
          return {
            ok: true,
            json: async () => ({
              code: 200,
              order_books: [
                { symbol: 'AAPL', market_type: 'perp', status: 'active' },
                { symbol: 'INACTIVE', market_type: 'perp', status: 'delisted' }
              ]
            })
          };
        }
        return {
          ok: true,
          json: async () => ({
            code: 200,
            order_book_stats: [
              { symbol: 'AAPL', last_trade_price: 290.25, daily_quote_token_volume: 12_000_000 }
            ]
          })
        };
      })
    );

    const result = await fetchLighterMarkets();

    expect(result.health.ok).toBe(true);
    expect(result.markets).toHaveLength(1);
    expect(result.markets[0]).toMatchObject({
      exchange: 'Lighter',
      baseSymbol: 'AAPL',
      marketSymbol: 'AAPL-USDC',
      fundingRate: 0.00012,
      markPrice: 290.25,
      volume24hUsd: 12_000_000
    });
    vi.unstubAllGlobals();
  });
});
