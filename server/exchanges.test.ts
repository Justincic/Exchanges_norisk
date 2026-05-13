import { describe, expect, it, vi } from 'vitest';
import { fetchBinanceMarkets, fetchHyperliquidMarkets } from './exchanges';

describe('exchange adapters', () => {
  it('normalizes Hyperliquid predicted funding rows', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        if (body.type === 'predictedFundings') {
          return {
            ok: true,
            json: async () => [
              [
                'BTC',
                [
                  ['HlPerp', { fundingRate: '0.0000125', nextFundingTime: 1_800_000_000_000 }],
                  ['BinPerp', { fundingRate: '0.0001', nextFundingTime: 1_800_000_000_000 }]
                ]
              ]
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
      intervalHours: 1
    });
    vi.unstubAllGlobals();
  });

  it('normalizes Hyperliquid xyz HIP-3 markets', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        if (body.type === 'predictedFundings') {
          return {
            ok: true,
            json: async () => []
          };
        }
        return {
          ok: true,
          json: async () => [
            { universe: [{ name: 'xyz:CL' }, { name: 'xyz:GOLD' }] },
            [{ funding: '-0.0002' }, { funding: '0.00001' }]
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
              { symbol: 'BTCUSDT', lastFundingRate: '0.0001', nextFundingTime: 1_800_000_000_000 },
              { symbol: 'ETHUSDC', lastFundingRate: '-0.0001', nextFundingTime: 1_800_000_000_000 },
              { symbol: 'AAPLUSDT', lastFundingRate: '0.0002', nextFundingTime: 1_800_000_000_000 },
              { symbol: 'BTCUSD_PERP', lastFundingRate: '0.1', nextFundingTime: 1_800_000_000_000 }
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
});
