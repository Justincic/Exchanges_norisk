import React from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowDownUp, Clock3, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { filterMixedQuotes } from './shared/funding';
import type { ExchangeId, FundingMarket, FundingOpportunity, FundingSnapshot } from './shared/types';
import './styles.css';

const REFRESH_MS = 60_000;
type SortKey = 'spread' | 'symbol' | 'fundingTime' | 'freshness';

function App() {
  const [snapshot, setSnapshot] = React.useState<FundingSnapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [minApr, setMinApr] = React.useState(0);
  const [sortKey, setSortKey] = React.useState<SortKey>('spread');
  const [showAnnualized, setShowAnnualized] = React.useState(true);
  const [includeMixedQuotes, setIncludeMixedQuotes] = React.useState(true);

  const loadSnapshot = React.useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/funding/snapshot');
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      setSnapshot((await response.json()) as FundingSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load funding snapshot');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSnapshot();
    const timer = window.setInterval(loadSnapshot, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadSnapshot]);

  const opportunities = React.useMemo(() => {
    const rows = filterMixedQuotes(snapshot?.opportunities ?? [], includeMixedQuotes)
      .filter((opportunity) => opportunity.baseSymbol.includes(query.trim().toUpperCase()))
      .filter((opportunity) => opportunity.spreadAnnualized * 100 >= minApr);

    return sortOpportunities(rows, sortKey);
  }, [includeMixedQuotes, minApr, query, snapshot, sortKey]);

  const topOpportunity = opportunities[0];

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">HL / OKX / BN perpetual funding monitor</p>
          <h1>Funding Arbitrage</h1>
        </div>
        <button className="iconButton" onClick={loadSnapshot} aria-label="Refresh funding data">
          <RefreshCw size={18} />
        </button>
      </header>

      <section className="summaryBand">
        <Metric
          label="Best spread"
          value={topOpportunity ? formatPercent(topOpportunity.spreadAnnualized) : '--'}
          helper={topOpportunity ? `${topOpportunity.baseSymbol} annualized` : 'Waiting for data'}
        />
        <Metric
          label="Markets"
          value={String(snapshot?.opportunities.reduce((sum, item) => sum + item.markets.length, 0) ?? 0)}
          helper="normalized perp markets"
        />
        <Metric
          label="Refresh"
          value="60s"
          helper={snapshot ? `updated ${formatRelativeTime(snapshot.generatedAt)}` : 'not loaded yet'}
        />
        <div className="healthStrip">
          {(snapshot?.health ?? ['HL', 'OKX', 'BN'].map((exchange) => ({ exchange, ok: false, lastUpdatedAt: null }))).map(
            (item) => (
              <span className={item.ok ? 'health ok' : 'health bad'} key={item.exchange}>
                {item.exchange}
              </span>
            )
          )}
        </div>
      </section>

      <section className="controls">
        <label className="searchBox">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search BTC, ETH, SOL..."
          />
        </label>
        <label className="field">
          <span>Min APR spread</span>
          <input
            type="number"
            min="0"
            step="1"
            value={minApr}
            onChange={(event) => setMinApr(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Sort</span>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="spread">Best spread</option>
            <option value="symbol">Symbol</option>
            <option value="fundingTime">Next funding</option>
            <option value="freshness">Freshness</option>
          </select>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showAnnualized}
            onChange={(event) => setShowAnnualized(event.target.checked)}
          />
          <span>Annualized</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={includeMixedQuotes}
            onChange={(event) => setIncludeMixedQuotes(event.target.checked)}
          />
          <span>Mix USDT/USDC</span>
        </label>
      </section>

      {error ? <div className="notice error">Snapshot error: {error}</div> : null}
      {loading ? <div className="notice">Loading live funding data...</div> : null}

      <section className="tableWrap" aria-label="Funding opportunities">
        <div className="tableHeader">
          <span>Asset</span>
          <span>Opportunity</span>
          <span>Markets</span>
        </div>
        <div className="rows">
          {opportunities.map((opportunity) => (
            <OpportunityRow
              key={opportunity.baseSymbol}
              opportunity={opportunity}
              showAnnualized={showAnnualized}
            />
          ))}
          {!loading && opportunities.length === 0 ? (
            <div className="empty">No opportunities match the current filters.</div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

function OpportunityRow({
  opportunity,
  showAnnualized
}: {
  opportunity: FundingOpportunity;
  showAnnualized: boolean;
}) {
  return (
    <article className="opportunityRow">
      <div className="assetCell">
        <strong>{opportunity.baseSymbol}</strong>
        <span className={opportunity.hasMixedQuotes ? 'quoteNote active' : 'quoteNote'}>
          {opportunity.hasMixedQuotes ? 'mixed quotes' : 'single quote'}
        </span>
        <span className={opportunity.isCrossExchange ? 'quoteNote active' : 'quoteNote'}>
          {opportunity.isCrossExchange ? 'cross venue' : 'same venue'}
        </span>
      </div>

      <div className="directionCell">
        <div className="directionLine">
          <TrendingUp size={16} />
          <span>
            Long {formatMarketName(opportunity.longMarket)} / Short {formatMarketName(opportunity.shortMarket)}
          </span>
        </div>
        <div className="spreadLine">
          <strong>{formatPercent(opportunity.spreadAnnualized)}</strong>
          <span>APR spread</span>
          <span>{formatPercent(opportunity.spreadPerPeriod)} 8h equiv</span>
        </div>
        <div className="timeLine">
          <Clock3 size={14} />
          <span>Next funding {formatDateTime(opportunity.nextFundingTime)}</span>
        </div>
      </div>

      <div className="marketGrid">
        {(['HL', 'OKX', 'BN'] as ExchangeId[]).map((exchange) => (
          <ExchangeColumn
            key={exchange}
            exchange={exchange}
            markets={opportunity.markets.filter((market) => market.exchange === exchange)}
            showAnnualized={showAnnualized}
          />
        ))}
      </div>
    </article>
  );
}

function ExchangeColumn({
  exchange,
  markets,
  showAnnualized
}: {
  exchange: ExchangeId;
  markets: FundingMarket[];
  showAnnualized: boolean;
}) {
  return (
    <div className="exchangeColumn">
      <span className="exchangeName">{exchange}</span>
      {markets.length ? (
        markets.map((market) => (
          <div className="marketPill" key={`${market.exchange}-${market.marketSymbol}`}>
            <div className="pillTop">
              <span className={`quoteBadge ${market.quoteAsset.toLowerCase()}`}>{market.quoteAsset}</span>
              <span>{market.marketSymbol}</span>
            </div>
            <div className="rateBar" style={{ '--rate': clampRate(market.annualizedRate) } as React.CSSProperties}>
              <span className={market.annualizedRate >= 0 ? 'positive rateValue' : 'negative rateValue'}>
                {showAnnualized
                  ? formatPercent(market.annualizedRate)
                  : `${formatPercent(market.fundingRate)} / ${market.intervalHours}h`}
              </span>
            </div>
            <small>{formatDateTime(market.nextFundingTime)}</small>
          </div>
        ))
      ) : (
        <div className="missing">No market</div>
      )}
    </div>
  );
}

function sortOpportunities(rows: FundingOpportunity[], sortKey: SortKey) {
  return [...rows].sort((a, b) => {
    if (sortKey === 'symbol') return a.baseSymbol.localeCompare(b.baseSymbol);
    if (sortKey === 'fundingTime') return (a.nextFundingTime ?? Infinity) - (b.nextFundingTime ?? Infinity);
    if (sortKey === 'freshness') return newestSource(b) - newestSource(a);
    return b.spreadAnnualized - a.spreadAnnualized;
  });
}

function newestSource(opportunity: FundingOpportunity) {
  return Math.max(...opportunity.markets.map((market) => market.sourceUpdatedAt));
}

function formatMarketName(market: FundingMarket | null) {
  if (!market) return '--';
  return `${market.exchange} ${market.marketSymbol}`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(Math.abs(value) < 0.001 ? 4 : 2)}%`;
}

function formatDateTime(time: number | null) {
  if (!time) return '--';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time));
}

function formatRelativeTime(time: number) {
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function clampRate(value: number) {
  return Math.max(-1, Math.min(1, value * 10));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
