import React from 'react';
import ReactDOM from 'react-dom/client';
import { Clock3, Languages, Moon, RefreshCw, Search, Sun, TrendingUp, X } from 'lucide-react';
import { filterMixedQuotes } from './shared/funding';
import type { ExchangeId, FundingMarket, FundingOpportunity, FundingSnapshot } from './shared/types';
import './styles.css';

const REFRESH_MS = 60_000;
type SortKey = 'spread' | 'symbol' | 'fundingTime' | 'freshness';
type Language = 'en' | 'zh-TW' | 'zh-CN';
type Theme = 'light' | 'dark';
type FeeSide = 'maker' | 'taker';
type VipLevel = 'VIP0' | 'VIP1' | 'VIP2' | 'VIP3' | 'VIP4' | 'VIP5';
type ExchangeFeeConfig = {
  side: FeeSide;
  discountPct: number;
  vipLevel: VipLevel;
};
type FeeConfig = {
  byExchange: Record<ExchangeId, ExchangeFeeConfig>;
};

const EXCHANGES: ExchangeId[] = ['HL', 'Lighter', 'OKX', 'BN', 'Aster'];
const CEX_EXCHANGES = ['BN', 'OKX', 'Aster'] as const;
const VIP_LEVELS: VipLevel[] = ['VIP0', 'VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5'];
const DEFAULT_FEE_CONFIG: FeeConfig = {
  byExchange: {
    HL: { side: 'taker', discountPct: 0, vipLevel: 'VIP0' },
    Lighter: { side: 'taker', discountPct: 0, vipLevel: 'VIP0' },
    OKX: { side: 'taker', discountPct: 0, vipLevel: 'VIP0' },
    BN: { side: 'taker', discountPct: 0, vipLevel: 'VIP0' },
    Aster: { side: 'taker', discountPct: 0, vipLevel: 'VIP0' }
  }
};
const FEE_RATES: Record<ExchangeId, Record<VipLevel, Record<FeeSide, number>>> = {
  HL: makeFlatFees(0.0001, 0.00035),
  Lighter: makeFlatFees(0, 0.0002),
  OKX: {
    VIP0: { maker: 0.0002, taker: 0.0005 },
    VIP1: { maker: 0.00018, taker: 0.00045 },
    VIP2: { maker: 0.00016, taker: 0.0004 },
    VIP3: { maker: 0.00014, taker: 0.00035 },
    VIP4: { maker: 0.00012, taker: 0.0003 },
    VIP5: { maker: 0.0001, taker: 0.00025 }
  },
  BN: {
    VIP0: { maker: 0.0002, taker: 0.0005 },
    VIP1: { maker: 0.00016, taker: 0.0004 },
    VIP2: { maker: 0.00014, taker: 0.00035 },
    VIP3: { maker: 0.00012, taker: 0.00032 },
    VIP4: { maker: 0.0001, taker: 0.0003 },
    VIP5: { maker: 0.00008, taker: 0.00027 }
  },
  Aster: {
    VIP0: { maker: 0.0002, taker: 0.0005 },
    VIP1: { maker: 0.00016, taker: 0.0004 },
    VIP2: { maker: 0.00014, taker: 0.00035 },
    VIP3: { maker: 0.00012, taker: 0.00032 },
    VIP4: { maker: 0.0001, taker: 0.0003 },
    VIP5: { maker: 0.00008, taker: 0.00027 }
  }
};

const COPY = {
  en: {
    eyebrow: 'HL / Lighter / OKX / BN / Aster perpetual funding monitor',
    title: 'Funding Arbitrage',
    refreshData: 'Refresh funding data',
    bestSpread: 'Best spread',
    annualized: 'annualized',
    waiting: 'Waiting for data',
    markets: 'Markets',
    normalizedMarkets: 'normalized perp markets',
    refresh: 'Refresh',
    updated: 'updated',
    notLoaded: 'not loaded yet',
    search: 'Search BTC, WTI, TSLA...',
    minApr: 'Min APR spread',
    minLiquidityFilter: 'Min liquidity',
    feeSettings: 'Fee settings',
    feeSide: 'Execution',
    maker: 'Maker',
    taker: 'Taker',
    feeDiscount: 'Fee discount %',
    effectiveFee: 'Effective fee',
    netSpread: 'Net spread',
    grossSpread: 'Gross spread',
    roundTripFee: 'Round-trip fee',
    breakEven: 'Break-even',
    fundingRounds: 'funding rounds',
    feePresetNote: 'Fee presets are editable assumptions: CEX VIP changes base maker/taker rate, discount applies after VIP.',
    selectExchangeFee: 'Select an exchange above to tune execution fee assumptions.',
    sort: 'Sort',
    bestSpreadSort: 'Best spread',
    symbol: 'Symbol',
    nextFundingSort: 'Next funding',
    freshness: 'Freshness',
    mixQuotes: 'Mix USDT/USDC',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    snapshotError: 'Snapshot error',
    loading: 'Loading live funding data...',
    asset: 'Asset',
    opportunity: 'Opportunity',
    mixedQuotes: 'mixed quotes',
    singleQuote: 'single quote',
    crossVenue: 'cross venue',
    sameVenue: 'same venue',
    aligned: 'aligned',
    timingRisk: 'timing risk',
    settlementGap: 'settlement gap',
    long: 'Long',
    short: 'Short',
    aprSpread: 'APR spread',
    eightHourEquiv: '8h equiv',
    nextFunding: 'Next funding',
    longFunding: 'Long funding',
    shortFunding: 'Short funding',
    noMarket: 'No market',
    current: 'Current',
    apr: 'APR',
    price: 'Price',
    priceSpread: 'Price spread',
    minLiquidity: 'Min liquidity',
    liquidityRisk: 'thin liquidity',
    liquidityOk: 'liquidity ok',
    openInterest: 'OI',
    volume24h: '24h vol',
    suggestPosition: 'Suggest size',
    positionSuggestion: 'Position suggestion',
    suggestedNotional: 'Suggested notional',
    estimatedPnl: 'Estimated funding PnL',
    per8h: 'per 8h',
    perDay: 'per day',
    per30d: 'per 30d',
    sizingBasis: 'Sizing basis',
    longLeg: 'Long leg',
    shortLeg: 'Short leg',
    oiShare: 'OI share',
    volumeShare: '24h vol share',
    close: 'Close',
    heuristicNote: 'Heuristic only: caps size at 2% of the thinner leg, max $50k, using OI first and 24h volume as fallback.',
    empty: 'No opportunities match the current filters.',
    now: 'just now',
    secondsAgo: 's ago',
    minutesAgo: 'm ago'
  },
  'zh-TW': {
    eyebrow: 'HL / Lighter / OKX / BN / Aster 永續資金費率監控',
    title: '資金費率套利',
    refreshData: '刷新資金費率資料',
    bestSpread: '最佳價差',
    annualized: '年化',
    waiting: '等待資料',
    markets: '市場數',
    normalizedMarkets: '已正規化永續市場',
    refresh: '刷新',
    updated: '更新於',
    notLoaded: '尚未載入',
    search: '搜尋 BTC, WTI, TSLA...',
    minApr: '最低年化價差',
    minLiquidityFilter: '最低流動性',
    feeSettings: '手續費設定',
    feeSide: '成交方式',
    maker: 'Maker',
    taker: 'Taker',
    feeDiscount: '手續費減免 %',
    effectiveFee: '實際費率',
    netSpread: '淨價差',
    grossSpread: '毛價差',
    roundTripFee: '進出場手續費',
    breakEven: '回本',
    fundingRounds: '次資金結算',
    feePresetNote: '手續費為可調預設：CEX VIP 會改 maker/taker 基準費率，減免 % 會再套用一次。',
    selectExchangeFee: '點上方交易所按鈕，分別調整各家的成交手續費假設。',
    sort: '排序',
    bestSpreadSort: '最佳價差',
    symbol: '標的',
    nextFundingSort: '下次收費',
    freshness: '資料新鮮度',
    mixQuotes: '混合 USDT/USDC',
    language: '語言',
    theme: '主題',
    light: '亮色',
    dark: '暗色',
    snapshotError: '快照錯誤',
    loading: '正在載入即時資金費率...',
    asset: '標的',
    opportunity: '機會',
    mixedQuotes: '混合報價',
    singleQuote: '單一報價',
    crossVenue: '跨平台',
    sameVenue: '同平台',
    aligned: '時間一致',
    timingRisk: '時間風險',
    settlementGap: '結算差',
    long: '做多',
    short: '做空',
    aprSpread: '年化價差',
    eightHourEquiv: '8h 等效',
    nextFunding: '下次收費',
    longFunding: '多單收費',
    shortFunding: '空單收費',
    noMarket: '無市場',
    current: '當期',
    apr: '年化',
    price: '價格',
    priceSpread: '價格差',
    minLiquidity: '最低流動性',
    liquidityRisk: '深度偏薄',
    liquidityOk: '深度可用',
    openInterest: 'OI',
    volume24h: '24h 量',
    suggestPosition: '建議倉位',
    positionSuggestion: '倉位建議',
    suggestedNotional: '建議名目倉位',
    estimatedPnl: '預估資金費收益',
    per8h: '每 8h',
    perDay: '每日',
    per30d: '30 日',
    sizingBasis: '估算依據',
    longLeg: '多單腿',
    shortLeg: '空單腿',
    oiShare: 'OI 占比',
    volumeShare: '24h 量占比',
    close: '關閉',
    heuristicNote: '僅為啟發式估算：以較薄一腿的 2% 為上限，最高 $50k，優先用 OI，沒有 OI 時用 24h 量。',
    empty: '目前篩選條件下沒有符合的機會。',
    now: '剛剛',
    secondsAgo: '秒前',
    minutesAgo: '分鐘前'
  },
  'zh-CN': {
    eyebrow: 'HL / Lighter / OKX / BN / Aster 永续资金费率监控',
    title: '资金费率套利',
    refreshData: '刷新资金费率数据',
    bestSpread: '最佳价差',
    annualized: '年化',
    waiting: '等待数据',
    markets: '市场数',
    normalizedMarkets: '已标准化永续市场',
    refresh: '刷新',
    updated: '更新于',
    notLoaded: '尚未加载',
    search: '搜索 BTC, WTI, TSLA...',
    minApr: '最低年化价差',
    minLiquidityFilter: '最低流动性',
    feeSettings: '手续费设置',
    feeSide: '成交方式',
    maker: 'Maker',
    taker: 'Taker',
    feeDiscount: '手续费减免 %',
    effectiveFee: '实际费率',
    netSpread: '净价差',
    grossSpread: '毛价差',
    roundTripFee: '进出场手续费',
    breakEven: '回本',
    fundingRounds: '次资金结算',
    feePresetNote: '手续费为可调预设：CEX VIP 会改 maker/taker 基准费率，减免 % 会再套用一次。',
    selectExchangeFee: '点上方交易所按钮，分别调整各家的成交手续费假设。',
    sort: '排序',
    bestSpreadSort: '最佳价差',
    symbol: '标的',
    nextFundingSort: '下次收费',
    freshness: '数据新鲜度',
    mixQuotes: '混合 USDT/USDC',
    language: '语言',
    theme: '主题',
    light: '亮色',
    dark: '暗色',
    snapshotError: '快照错误',
    loading: '正在加载实时资金费率...',
    asset: '标的',
    opportunity: '机会',
    mixedQuotes: '混合报价',
    singleQuote: '单一报价',
    crossVenue: '跨平台',
    sameVenue: '同平台',
    aligned: '时间一致',
    timingRisk: '时间风险',
    settlementGap: '结算差',
    long: '做多',
    short: '做空',
    aprSpread: '年化价差',
    eightHourEquiv: '8h 等效',
    nextFunding: '下次收费',
    longFunding: '多单收费',
    shortFunding: '空单收费',
    noMarket: '无市场',
    current: '当期',
    apr: '年化',
    price: '价格',
    priceSpread: '价格差',
    minLiquidity: '最低流动性',
    liquidityRisk: '深度偏薄',
    liquidityOk: '深度可用',
    openInterest: 'OI',
    volume24h: '24h 量',
    suggestPosition: '建议仓位',
    positionSuggestion: '仓位建议',
    suggestedNotional: '建议名义仓位',
    estimatedPnl: '预估资金费收益',
    per8h: '每 8h',
    perDay: '每日',
    per30d: '30 日',
    sizingBasis: '估算依据',
    longLeg: '多单腿',
    shortLeg: '空单腿',
    oiShare: 'OI 占比',
    volumeShare: '24h 量占比',
    close: '关闭',
    heuristicNote: '仅为启发式估算：以较薄一腿的 2% 为上限，最高 $50k，优先用 OI，没有 OI 时用 24h 量。',
    empty: '当前筛选条件下没有符合的机会。',
    now: '刚刚',
    secondsAgo: '秒前',
    minutesAgo: '分钟前'
  }
} satisfies Record<Language, Record<string, string>>;

function App() {
  const [snapshot, setSnapshot] = React.useState<FundingSnapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [minApr, setMinApr] = React.useState(0);
  const [minLiquidityUsd, setMinLiquidityUsd] = React.useState(5_000_000);
  const [sortKey, setSortKey] = React.useState<SortKey>('spread');
  const [includeMixedQuotes, setIncludeMixedQuotes] = React.useState(true);
  const [language, setLanguage] = React.useState<Language>('zh-TW');
  const [theme, setTheme] = React.useState<Theme>('dark');
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = React.useState(false);
  const [sizingOpportunity, setSizingOpportunity] = React.useState<FundingOpportunity | null>(null);
  const [feeConfig, setFeeConfig] = React.useState<FeeConfig>(DEFAULT_FEE_CONFIG);
  const [activeFeeExchange, setActiveFeeExchange] = React.useState<ExchangeId>('BN');
  const t = COPY[language];

  const loadSnapshot = React.useCallback(async (forceRefresh = false) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch(`/api/funding/snapshot${forceRefresh ? '?refresh=1' : ''}`);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      setSnapshot((await response.json()) as FundingSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load funding snapshot');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSnapshot();
    const timer = window.setInterval(loadSnapshot, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadSnapshot]);

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language;
  }, [language, theme]);

  const opportunities = React.useMemo(() => {
    const rows = filterMixedQuotes(snapshot?.opportunities ?? [], includeMixedQuotes)
      .filter((opportunity) => opportunity.baseSymbol.includes(query.trim().toUpperCase()))
      .filter((opportunity) => minApr <= 0 || calculateFeeImpact(opportunity, feeConfig).netAnnualized * 100 >= minApr)
      .filter((opportunity) => (opportunity.minLiquidityUsd ?? 0) >= minLiquidityUsd);

    return sortOpportunities(rows, sortKey, feeConfig);
  }, [feeConfig, includeMixedQuotes, minApr, minLiquidityUsd, query, snapshot, sortKey]);

  const topOpportunity = opportunities[0];
  const topFeeImpact = topOpportunity ? calculateFeeImpact(topOpportunity, feeConfig) : null;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
        </div>
        <div className="topActions">
          <button className="iconButton" onClick={() => void loadSnapshot(true)} aria-label={t.refreshData}>
            <RefreshCw className={isRefreshing ? 'spinIcon' : ''} size={18} />
          </button>
          <div className="menuWrap">
            <button
              className="iconButton"
              onClick={() => setIsLanguageMenuOpen((open) => !open)}
              aria-label={t.language}
            >
              <Languages size={18} />
            </button>
            {isLanguageMenuOpen ? (
              <div className="langMenu">
                {[
                  ['zh-TW', '繁中'],
                  ['zh-CN', '简中'],
                  ['en', 'English']
                ].map(([value, label]) => (
                  <button
                    className={language === value ? 'langOption active' : 'langOption'}
                    key={value}
                    onClick={() => {
                      setLanguage(value as Language);
                      setIsLanguageMenuOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            className="iconButton"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            aria-label={t.theme}
          >
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <section className="summaryBand">
        <Metric
          label={t.bestSpread}
          value={topFeeImpact ? formatPercent(topFeeImpact.netAnnualized) : '--'}
          helper={topOpportunity ? `${topOpportunity.baseSymbol} ${t.netSpread}` : t.waiting}
        />
        <Metric
          label={t.markets}
          value={String(snapshot?.opportunities.reduce((sum, item) => sum + item.markets.length, 0) ?? 0)}
          helper={t.normalizedMarkets}
        />
        <Metric
          label={t.refresh}
          value="60s"
          helper={snapshot ? `${t.updated} ${formatRelativeTime(snapshot.generatedAt, t)}` : t.notLoaded}
        />
        <div className="healthStrip">
          {(snapshot?.health ?? EXCHANGES.map((exchange) => ({ exchange, ok: false, lastUpdatedAt: null }))).map(
            (item) => (
              <span className={item.ok ? 'health ok' : 'health bad'} key={item.exchange}>
                {item.exchange}
              </span>
            )
          )}
        </div>
      </section>

      <section className="feePanel" aria-label={t.feeSettings}>
        <div className="feeIntro">
          <strong>{t.feeSettings}</strong>
          <small>{t.feePresetNote}</small>
        </div>
        <div className="exchangeFeeTabs">
          {EXCHANGES.map((exchange) => {
            const exchangeFee = feeConfig.byExchange[exchange];
            return (
              <button
                className={activeFeeExchange === exchange ? 'exchangeFeeButton active' : 'exchangeFeeButton'}
                key={exchange}
                type="button"
                onClick={() => setActiveFeeExchange(exchange)}
              >
                <strong>{exchange}</strong>
                <small>{formatPercent(getEffectiveFeeRate(exchange, feeConfig))} / {exchangeFee.side}</small>
              </button>
            );
          })}
        </div>
        <ExchangeFeeEditor
          exchange={activeFeeExchange}
          feeConfig={feeConfig}
          setFeeConfig={setFeeConfig}
          t={t}
        />
      </section>

      <section className="controls">
        <label className="searchBox">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.search}
          />
        </label>
        <label className="field">
          <span>{t.minApr}</span>
          <input
            type="number"
            min="0"
            step="1"
            value={minApr}
            onChange={(event) => setMinApr(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>{t.minLiquidityFilter}</span>
          <input
            type="number"
            min="0"
            step="1"
            value={minLiquidityUsd / 1_000_000}
            onChange={(event) => setMinLiquidityUsd(Number(event.target.value) * 1_000_000)}
          />
        </label>
        <label className="field">
          <span>{t.sort}</span>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="spread">{t.bestSpreadSort}</option>
            <option value="symbol">{t.symbol}</option>
            <option value="fundingTime">{t.nextFundingSort}</option>
            <option value="freshness">{t.freshness}</option>
          </select>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={includeMixedQuotes}
            onChange={(event) => setIncludeMixedQuotes(event.target.checked)}
          />
          <span>{t.mixQuotes}</span>
        </label>
      </section>

      {error ? <div className="notice error">{t.snapshotError}: {error}</div> : null}
      {loading ? <div className="notice">{t.loading}</div> : null}

      <section className="tableWrap" aria-label="Funding opportunities">
        <div className="tableHeader">
          <span>{t.asset}</span>
          <span>{t.opportunity}</span>
          <span>{t.markets}</span>
        </div>
        <div className="rows">
          {opportunities.map((opportunity) => (
            <OpportunityRow
              key={opportunity.baseSymbol}
              opportunity={opportunity}
              t={t}
              feeImpact={calculateFeeImpact(opportunity, feeConfig)}
              onSuggestPosition={setSizingOpportunity}
            />
          ))}
          {!loading && opportunities.length === 0 ? (
            <div className="empty">{t.empty}</div>
          ) : null}
        </div>
      </section>

      {sizingOpportunity ? (
        <PositionSuggestionModal
          opportunity={sizingOpportunity}
          t={t}
          feeImpact={calculateFeeImpact(sizingOpportunity, feeConfig)}
          onClose={() => setSizingOpportunity(null)}
        />
      ) : null}
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

function ExchangeFeeEditor({
  exchange,
  feeConfig,
  setFeeConfig,
  t
}: {
  exchange: ExchangeId;
  feeConfig: FeeConfig;
  setFeeConfig: React.Dispatch<React.SetStateAction<FeeConfig>>;
  t: (typeof COPY)[Language];
}) {
  const exchangeFee = feeConfig.byExchange[exchange];
  const isCex = isCexExchange(exchange);

  return (
    <div className="exchangeFeeEditor">
      <label className="field compactField">
        <span>{exchange} {t.feeSide}</span>
        <select
          value={exchangeFee.side}
          onChange={(event) =>
            setFeeConfig((current) => updateExchangeFee(current, exchange, { side: event.target.value as FeeSide }))
          }
        >
          <option value="maker">{t.maker}</option>
          <option value="taker">{t.taker}</option>
        </select>
      </label>
      <label className="field compactField">
        <span>{exchange} {t.feeDiscount}</span>
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={exchangeFee.discountPct}
          onChange={(event) =>
            setFeeConfig((current) =>
              updateExchangeFee(current, exchange, { discountPct: clampNumber(Number(event.target.value), 0, 100) })
            )
          }
        />
      </label>
      {isCex ? (
        <label className="field compactField">
          <span>{exchange} VIP</span>
          <select
            value={exchangeFee.vipLevel}
            onChange={(event) =>
              setFeeConfig((current) => updateExchangeFee(current, exchange, { vipLevel: event.target.value as VipLevel }))
            }
          >
            {VIP_LEVELS.map((level) => (
              <option value={level} key={level}>{level}</option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="feeReadout">
        <span>{t.effectiveFee}</span>
        <strong>{formatPercent(getEffectiveFeeRate(exchange, feeConfig))}</strong>
      </div>
    </div>
  );
}

function OpportunityRow({
  opportunity,
  t,
  feeImpact,
  onSuggestPosition
}: {
  opportunity: FundingOpportunity;
  t: (typeof COPY)[Language];
  feeImpact: FeeImpact;
  onSuggestPosition: (opportunity: FundingOpportunity) => void;
}) {
  return (
    <article className="opportunityRow">
      <div className="assetCell">
        <strong>{opportunity.baseSymbol}</strong>
        <span className={opportunity.hasMixedQuotes ? 'quoteNote active' : 'quoteNote'}>
          {opportunity.hasMixedQuotes ? t.mixedQuotes : t.singleQuote}
        </span>
        <span className={opportunity.isCrossExchange ? 'quoteNote active' : 'quoteNote'}>
          {opportunity.isCrossExchange ? t.crossVenue : t.sameVenue}
        </span>
        <span className={opportunity.isSettlementAligned ? 'quoteNote good' : 'quoteNote risk'}>
          {opportunity.isSettlementAligned ? t.aligned : t.timingRisk}
        </span>
        <span className={opportunity.hasLiquidityWarning ? 'quoteNote risk' : 'quoteNote good'}>
          {opportunity.hasLiquidityWarning ? `! ${t.liquidityRisk}` : t.liquidityOk}
        </span>
      </div>

      <div className="directionCell">
        <div className="directionLine">
          <TrendingUp size={16} />
          <span>
            {t.long} {formatMarketName(opportunity.longMarket)} / {t.short} {formatMarketName(opportunity.shortMarket)}
          </span>
        </div>
        <div className="spreadLine">
          <strong className={feeImpact.netAnnualized >= 0 ? 'positive' : 'negative'}>
            {formatPercent(feeImpact.netAnnualized)}
          </strong>
          <span>{t.netSpread}</span>
          <span>{formatPercent(feeImpact.netPerPeriod)} {t.eightHourEquiv}</span>
        </div>
        <div className="riskLine">
          <span>{t.grossSpread} {formatPercent(opportunity.spreadAnnualized)}</span>
          <span>{t.roundTripFee} {formatPercent(feeImpact.roundTripFeeRate)}</span>
          <span>{t.breakEven} {formatBreakEven(feeImpact.breakEvenPeriods, t)}</span>
        </div>
        <div className="timeLine">
          <Clock3 size={14} />
          <span>{t.longFunding} {formatDateTime(opportunity.longMarket?.nextFundingTime ?? null)}</span>
        </div>
        <div className="timeLine">
          <Clock3 size={14} />
          <span>{t.shortFunding} {formatDateTime(opportunity.shortMarket?.nextFundingTime ?? null)}</span>
        </div>
        <div className={opportunity.isSettlementAligned ? 'timeLine aligned' : 'timeLine risk'}>
          <Clock3 size={14} />
          <span>{t.settlementGap} {formatDuration(opportunity.settlementTimeDiffMs)}</span>
        </div>
        <div className="riskLine">
          <span>{t.priceSpread} {formatNullablePercent(opportunity.priceSpreadPct)}</span>
          <span>{t.minLiquidity} {formatUsdCompact(opportunity.minLiquidityUsd)}</span>
        </div>
        <button className="secondaryButton" type="button" onClick={() => onSuggestPosition(opportunity)}>
          {t.suggestPosition}
        </button>
      </div>

      <div className="marketGrid">
        {EXCHANGES.map((exchange) => (
          <ExchangeColumn
            key={exchange}
            exchange={exchange}
            markets={opportunity.markets.filter((market) => market.exchange === exchange)}
            t={t}
          />
        ))}
      </div>
    </article>
  );
}

function PositionSuggestionModal({
  opportunity,
  t,
  feeImpact,
  onClose
}: {
  opportunity: FundingOpportunity;
  t: (typeof COPY)[Language];
  feeImpact: FeeImpact;
  onClose: () => void;
}) {
  const sizing = calculatePositionSuggestion(opportunity, feeImpact);

  return (
    <div className="modalBackdrop" role="presentation" onClick={onClose}>
      <section className="modalPanel" role="dialog" aria-modal="true" aria-label={t.positionSuggestion} onClick={(event) => event.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <span className="modalKicker">{opportunity.baseSymbol}</span>
            <h2>{t.positionSuggestion}</h2>
          </div>
          <button className="iconButton compactIcon" type="button" onClick={onClose} aria-label={t.close}>
            <X size={18} />
          </button>
        </div>

        <div className="sizingHero">
          <span>{t.suggestedNotional}</span>
          <strong>{formatUsdFull(sizing.notionalUsd)}</strong>
          <small>{t.sizingBasis}: {formatUsdCompact(sizing.basisUsd)}</small>
        </div>

        <div className="pnlGrid">
          <Metric label={`${t.estimatedPnl} ${t.per8h}`} value={formatUsdFull(sizing.pnl8hUsd)} helper={`${t.netSpread} ${formatPercent(feeImpact.netPerPeriod)}`} />
          <Metric label={`${t.estimatedPnl} ${t.perDay}`} value={formatUsdFull(sizing.pnlDayUsd)} helper={`${t.roundTripFee} ${formatUsdFull(sizing.feeUsd)}`} />
          <Metric label={`${t.estimatedPnl} ${t.per30d}`} value={formatUsdFull(sizing.pnl30dUsd)} helper={`${t.breakEven} ${formatBreakEven(feeImpact.breakEvenPeriods, t)}`} />
        </div>

        <div className="legGrid">
          <SizingLeg title={t.longLeg} market={opportunity.longMarket} notionalUsd={sizing.notionalUsd} t={t} />
          <SizingLeg title={t.shortLeg} market={opportunity.shortMarket} notionalUsd={sizing.notionalUsd} t={t} />
        </div>

        <p className="modalNote">{t.heuristicNote}</p>
      </section>
    </div>
  );
}

function SizingLeg({
  title,
  market,
  notionalUsd,
  t
}: {
  title: string;
  market: FundingMarket | null;
  notionalUsd: number | null;
  t: (typeof COPY)[Language];
}) {
  return (
    <div className="sizingLeg">
      <span>{title}</span>
      <strong>{formatMarketName(market)}</strong>
      <div>
        <small>{t.openInterest}: {formatUsdCompact(market?.openInterestUsd ?? null)}</small>
        <small>{t.oiShare}: {formatShare(notionalUsd, market?.openInterestUsd ?? null)}</small>
      </div>
      <div>
        <small>{t.volume24h}: {formatUsdCompact(market?.volume24hUsd ?? null)}</small>
        <small>{t.volumeShare}: {formatShare(notionalUsd, market?.volume24hUsd ?? null)}</small>
      </div>
    </div>
  );
}

function ExchangeColumn({
  exchange,
  markets,
  t
}: {
  exchange: ExchangeId;
  markets: FundingMarket[];
  t: (typeof COPY)[Language];
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
              <div className={market.fundingRate >= 0 ? 'positive rateValue rateStack' : 'negative rateValue rateStack'}>
                <span>{t.current} {formatPercent(market.fundingRate)} / {market.intervalHours}h</span>
                <small>{t.apr} {formatPercent(market.annualizedRate)}</small>
              </div>
            </div>
            <div className="marketStats">
              <span>{t.price} {formatPrice(market.markPrice)}</span>
              <span>{t.openInterest} {formatUsdCompact(market.openInterestUsd)}</span>
              <span>{t.volume24h} {formatUsdCompact(market.volume24hUsd)}</span>
            </div>
            <small>{formatDateTime(market.nextFundingTime)}</small>
          </div>
        ))
      ) : (
        <div className="missing">{t.noMarket}</div>
      )}
    </div>
  );
}

function sortOpportunities(rows: FundingOpportunity[], sortKey: SortKey, feeConfig: FeeConfig) {
  return [...rows].sort((a, b) => {
    if (sortKey === 'symbol') return a.baseSymbol.localeCompare(b.baseSymbol);
    if (sortKey === 'fundingTime') return (a.nextFundingTime ?? Infinity) - (b.nextFundingTime ?? Infinity);
    if (sortKey === 'freshness') return newestSource(b) - newestSource(a);
    return calculateFeeImpact(b, feeConfig).netAnnualized - calculateFeeImpact(a, feeConfig).netAnnualized;
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

function formatNullablePercent(value: number | null) {
  if (value === null) return '--';
  return formatPercent(value);
}

function formatPrice(value: number | null) {
  if (value === null) return '--';
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(value) >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function formatUsdCompact(value: number | null) {
  if (value === null) return '--';
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 2,
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function formatUsdFull(value: number | null) {
  if (value === null) return '--';
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function formatShare(notionalUsd: number | null, basisUsd: number | null) {
  if (notionalUsd === null || !basisUsd || basisUsd <= 0) return '--';
  return formatPercent(notionalUsd / basisUsd);
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

function formatRelativeTime(time: number, t: (typeof COPY)[Language]) {
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 3) return t.now;
  if (seconds < 60) return `${seconds}${t.secondsAgo}`;
  return `${Math.round(seconds / 60)}${t.minutesAgo}`;
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) return '--';
  const minutes = Math.round(durationMs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function clampRate(value: number) {
  return Math.max(-1, Math.min(1, value * 10));
}

type FeeImpact = {
  longFeeRate: number;
  shortFeeRate: number;
  roundTripFeeRate: number;
  netPerPeriod: number;
  netAnnualized: number;
  breakEvenPeriods: number | null;
};

function calculatePositionSuggestion(opportunity: FundingOpportunity, feeImpact: FeeImpact) {
  const basisUsd = getSizingBasisUsd(opportunity.longMarket, opportunity.shortMarket);
  const notionalUsd = basisUsd === null ? null : Math.min(50_000, Math.max(0, basisUsd * 0.02));
  const usableNotionalUsd = notionalUsd ?? 0;
  const feeUsd = notionalUsd === null ? null : usableNotionalUsd * feeImpact.roundTripFeeRate;

  return {
    basisUsd,
    notionalUsd,
    feeUsd,
    pnl8hUsd: notionalUsd === null ? null : usableNotionalUsd * opportunity.spreadPerPeriod - (feeUsd ?? 0),
    pnlDayUsd: notionalUsd === null ? null : usableNotionalUsd * opportunity.spreadPerPeriod * 3 - (feeUsd ?? 0),
    pnl30dUsd: notionalUsd === null ? null : usableNotionalUsd * opportunity.spreadPerPeriod * 90 - (feeUsd ?? 0)
  };
}

function calculateFeeImpact(opportunity: FundingOpportunity, feeConfig: FeeConfig): FeeImpact {
  const longFeeRate = getEffectiveFeeRate(opportunity.longMarket?.exchange ?? null, feeConfig);
  const shortFeeRate = getEffectiveFeeRate(opportunity.shortMarket?.exchange ?? null, feeConfig);
  const roundTripFeeRate = 2 * (longFeeRate + shortFeeRate);
  const netPerPeriod = opportunity.spreadPerPeriod - roundTripFeeRate;
  const breakEvenPeriods = opportunity.spreadPerPeriod > 0 ? roundTripFeeRate / opportunity.spreadPerPeriod : null;

  return {
    longFeeRate,
    shortFeeRate,
    roundTripFeeRate,
    netPerPeriod,
    netAnnualized: netPerPeriod * 365 * 3,
    breakEvenPeriods
  };
}

function getEffectiveFeeRate(exchange: ExchangeId | null, feeConfig: FeeConfig) {
  if (!exchange) return 0;
  const exchangeFee = feeConfig.byExchange[exchange];
  const vip = isCexExchange(exchange) ? exchangeFee.vipLevel : 'VIP0';
  const baseFee = FEE_RATES[exchange][vip][exchangeFee.side];
  return baseFee * (1 - clampNumber(exchangeFee.discountPct, 0, 100) / 100);
}

function updateExchangeFee(feeConfig: FeeConfig, exchange: ExchangeId, patch: Partial<ExchangeFeeConfig>): FeeConfig {
  return {
    byExchange: {
      ...feeConfig.byExchange,
      [exchange]: {
        ...feeConfig.byExchange[exchange],
        ...patch
      }
    }
  };
}

function isCexExchange(exchange: ExchangeId): exchange is (typeof CEX_EXCHANGES)[number] {
  return (CEX_EXCHANGES as readonly ExchangeId[]).includes(exchange);
}

function makeFlatFees(maker: number, taker: number): Record<VipLevel, Record<FeeSide, number>> {
  return Object.fromEntries(VIP_LEVELS.map((level) => [level, { maker, taker }])) as Record<
    VipLevel,
    Record<FeeSide, number>
  >;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function formatBreakEven(value: number | null, t: (typeof COPY)[Language]) {
  if (value === null) return '--';
  return `${value.toFixed(value < 10 ? 1 : 0)} ${t.fundingRounds}`;
}

function getSizingBasisUsd(longMarket: FundingMarket | null, shortMarket: FundingMarket | null) {
  const openInterestValues = [longMarket?.openInterestUsd, shortMarket?.openInterestUsd].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
  );
  if (openInterestValues.length === 2) return Math.min(...openInterestValues);

  const liquidityValues = [longMarket?.liquidityScoreUsd, shortMarket?.liquidityScoreUsd].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
  );
  return liquidityValues.length ? Math.min(...liquidityValues) : null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
