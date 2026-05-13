import express from 'express';
import { buildOpportunities } from '../src/shared/funding';
import type { FundingSnapshot } from '../src/shared/types';
import { fetchAllExchangeMarkets } from './exchanges';

const app = express();
const port = Number(process.env.PORT ?? 8787);
const CACHE_TTL_MS = 60_000;

let snapshotCache: FundingSnapshot | null = null;
let pendingRefresh: Promise<FundingSnapshot> | null = null;

app.get('/api/health', async (request, response) => {
  const snapshot = await getSnapshot(request.query.refresh === '1');
  response.json({
    generatedAt: snapshot.generatedAt,
    cacheExpiresAt: snapshot.cacheExpiresAt,
    health: snapshot.health
  });
});

app.get('/api/funding/snapshot', async (request, response) => {
  const snapshot = await getSnapshot(request.query.refresh === '1');
  response.json(snapshot);
});

app.listen(port, () => {
  console.log(`Funding aggregator listening on http://localhost:${port}`);
});

async function getSnapshot(forceRefresh = false): Promise<FundingSnapshot> {
  const now = Date.now();
  if (!forceRefresh && snapshotCache && snapshotCache.cacheExpiresAt > now) {
    return snapshotCache;
  }

  if (!pendingRefresh) {
    pendingRefresh = refreshSnapshot().finally(() => {
      pendingRefresh = null;
    });
  }

  return pendingRefresh;
}

async function refreshSnapshot(): Promise<FundingSnapshot> {
  const results = await fetchAllExchangeMarkets();
  const markets = results.flatMap((result) => result.markets);
  const generatedAt = Date.now();
  const snapshot: FundingSnapshot = {
    generatedAt,
    cacheExpiresAt: generatedAt + CACHE_TTL_MS,
    opportunities: buildOpportunities(markets),
    health: results.map((result) => result.health)
  };

  snapshotCache = snapshot;
  return snapshot;
}
