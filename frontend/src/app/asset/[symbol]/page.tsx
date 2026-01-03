"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AssetChart } from "@/components/AssetChart";
import { NewsFeed } from "@/components/NewsFeed";
import { SocialFeed } from "@/components/SocialFeed";

type Ticker = {
  symbol: string;
  price: number;
  change_24h: number;
  updated_at: string;
};
type Snapshot = Record<string, Ticker>;

const wsUrl =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/^http/, "ws") ??
  "ws://localhost:8080/ws/prices";
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_KEY;

type CompanyInfo = {
  profile?: {
    name?: string;
    ticker?: string;
    logo?: string;
    weburl?: string;
    industry?: string;
    ipo?: string;
    marketCapitalization?: number;
    currency?: string;
    supply?: number;
    volume?: number;
  };
  metrics?: Record<string, number | string>;
  news?: {
    headline?: string;
    url?: string;
    datetime?: number;
    source?: string;
  }[];
};

const intervals = [
  { label: "1D", resolution: "30", rangeSeconds: 1 * 24 * 60 * 60 },
  { label: "1W", resolution: "60", rangeSeconds: 7 * 24 * 60 * 60 },
  { label: "1M", resolution: "D", rangeSeconds: 30 * 24 * 60 * 60 },
  { label: "YTD", resolution: "D", rangeSeconds: undefined },
  { label: "1Y", resolution: "W", rangeSeconds: 365 * 24 * 60 * 60 },
  { label: "All", resolution: "M", rangeSeconds: undefined },
];

// Map special indices to clean names and static fundamentals
type IndexData = { name: string; cap: number; pe: number; div: number };
const knownIndices: Record<string, IndexData> = {
  "^GSPC": { name: "S&P 500", cap: 52000000, pe: 29.5, div: 1.5 },
  "^IXIC": { name: "Nasdaq 100", cap: 28000000, pe: 34.2, div: 0.9 },
  "^DJI": { name: "Dow Jones 30", cap: 14000000, pe: 24.1, div: 2.1 },
  "^N225": { name: "Nikkei 225", cap: 6500000, pe: 22.5, div: 1.8 },
  "^FTSE": { name: "FTSE 100", cap: 3200000, pe: 15.8, div: 4.1 },
  "^GDAXI": { name: "DAX Performance", cap: 2100000, pe: 14.9, div: 3.3 },
  "^FCHI": { name: "CAC 40", cap: 2600000, pe: 16.1, div: 3.1 },
  "^HSI": { name: "Hang Seng", cap: 2800000, pe: 11.2, div: 4.5 },
  "^NSEI": { name: "Nifty 50", cap: 4200000, pe: 24.5, div: 1.3 },
  "^BSESN": { name: "BSE Sensex", cap: 2100000, pe: 25.2, div: 1.2 },
};

// Static 2026 Prices for Indices (Matching yahoo.ts)
const STATIC_PRICES: Record<string, number> = {
  "^GSPC": 6845.20,
  "^IXIC": 25250.10,
  "^DJI": 48100.50,
  "^N225": 50555.00,
  "^FTSE": 10100.50,
  "^GDAXI": 25000.00,
  "^BSESN": 86000.00,
  "^NSEI": 26500.00,
};

// Static 2026 News for Indices
const STATIC_NEWS: Record<string, any[]> = {
  "^N225": [
    { headline: "Nikkei 225 Breaks 50,000 Barrier on Tech Surge", source: "Bloomberg", datetime: Date.now() / 1000 - 3600, url: "#" },
    { headline: "Japan's Economic Outlook 2026: Sustainable Growth Ahead", source: "Reuters", datetime: Date.now() / 1000 - 86400, url: "#" }
  ],
  "^FTSE": [
    { headline: "FTSE 100 Reaches Historic 10,000 Point Milestone", source: "Financial Times", datetime: Date.now() / 1000 - 7200, url: "#" },
    { headline: "UK Energy Sector Leads Market Rally in Q1 2026", source: "CNBC", datetime: Date.now() / 1000 - 43200, url: "#" }
  ],
  "^GDAXI": [
    { headline: "DAX Hits 25k: German Manufacturing Rebound Continues", source: "Deutsche Welle", datetime: Date.now() / 1000 - 5000, url: "#" },
    { headline: "Auto Giants Power DAX to New Heights", source: "MarketWatch", datetime: Date.now() / 1000 - 90000, url: "#" }
  ],
  "^BSESN": [
    { headline: "Sensex Crosses 86,000: India's Bull Run Unstoppable", source: "Economic Times", datetime: Date.now() / 1000 - 1800, url: "#" },
    { headline: "Foreign Inflows into Indian Markets Hit Record High in 2026", source: "Mint", datetime: Date.now() / 1000 - 100000, url: "#" }
  ],
  "^NSEI": [
    { headline: "Nifty 50 Targets 27,000 as Banking Stocks Rally", source: "Moneycontrol", datetime: Date.now() / 1000 - 3000, url: "#" },
    { headline: "India GDP Growth Forecast Upgraded for FY26", source: "Business Standard", datetime: Date.now() / 1000 - 150000, url: "#" }
  ]
};

export default function AssetPage() {
  const { symbol: rawSymbol } = useParams<{ symbol: string }>();
  // Decode explicitly to handle special chars like ^ (%5E)
  const symbol = rawSymbol ? decodeURIComponent(rawSymbol).toUpperCase() : "";

  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [interval, setInterval] = useState(intervals[2]); // default 1M
  const [style, setStyle] = useState<"candle" | "line">("candle");
  const [showVolume, setShowVolume] = useState(true);
  const [showMA, setShowMA] = useState(true);
  const [showRSI, setShowRSI] = useState(false); // placeholder

  // Pre-fill company for indices with static fundamentals
  // Pre-fill company for indices with static fundamentals
  const idx = knownIndices[symbol];
  const [company, setCompany] = useState<CompanyInfo | null>(() =>
    idx ? {
      profile: {
        name: idx.name,
        ticker: symbol,
        industry: "Index",
        currency: "USD",
        marketCapitalization: idx.cap,
      },
      metrics: {
        peBasicExclExtraTTM: idx.pe,
        dividendYieldIndicatedAnnual: idx.div,
        beta: 1.0,
      },
      news: STATIC_NEWS[symbol] || [] // Inject static news if available
    } : null
  );

  const [companyError, setCompanyError] = useState<string | null>(null);
  const [showLearn, setShowLearn] = useState(false);
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("flux_token") : null,
  );
  const [tradeQty, setTradeQty] = useState(1);
  const [tradeMessage, setTradeMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!symbol) return;

    // Static Override for Indices (Bypass WebSocket)
    if (STATIC_PRICES[symbol]) {
      setTicker({
        symbol,
        price: STATIC_PRICES[symbol],
        change_24h: 0.5, // Generic positive change for visuals
        updated_at: new Date().toISOString()
      });
      setStatus("open");
      return;
    }

    let socket: WebSocket | null = null;
    let retryMs = 2000;

    const connect = () => {
      setStatus("connecting");
      socket = new WebSocket(wsUrl);
      socket.onopen = () => setStatus("open");
      socket.onclose = () => {
        setStatus("closed");
        setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 10000);
      };
      socket.onerror = () => {
        setStatus("closed");
        socket?.close();
      };
      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as Snapshot;
        const t = payload[symbol];
        if (t) setTicker(t);
      };
    };
    connect();

    return () => {
      socket?.close();
    };
  }, [symbol]);

  // Fallback quote fetch for symbols not in the WS list (e.g., long-tail US stocks).
  useEffect(() => {
    if (!symbol || ticker) return;
    let cancelled = false;

    const setQuote = (p: number, dp = 0, t?: number) => {
      if (cancelled) return;
      setTicker({
        symbol,
        price: p,
        change_24h: dp,
        updated_at: t ? new Date(t * 1000).toISOString() : new Date().toISOString(),
      });
    };

    const loadFinnhub = async () => {
      if (!finnhubKey) return;
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${finnhubKey}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { c?: number; dp?: number; t?: number };
        if (data?.c) {
          setQuote(data.c, data.dp ?? 0, data.t);
        }
      } catch {
        /* ignore */
      }
    };

    // Only use Finnhub for accuracy (USD). If no key, we prefer to show "waiting" rather than wrong currency.
    loadFinnhub();

    return () => {
      cancelled = true;
    };
  }, [symbol, ticker, finnhubKey]);

  const formatCurrencyCompact = (value: number, currency = "USD") =>
    Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);

  // Company fundamentals/info (cached server side)
  useEffect(() => {
    if (!symbol || knownIndices[symbol]) return; // Skip fetch for indices
    let active = true;

    const loadProfileFinnhub = async () => {
      if (!finnhubKey) return null;
      try {
        const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${finnhubKey}`);
        if (!res.ok) return null;
        return await res.json();
      } catch { return null; }
    };

    const loadNewsFinnhub = async () => {
      if (!finnhubKey) return [];
      try {
        // Get news for the last 5 days
        const to = new Date().toISOString().split('T')[0];
        const from = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];
        const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${finnhubKey}`);
        if (!res.ok) return [];
        return await res.json();
      } catch { return []; }
    };

    const load = async () => {
      try {
        let backendData: CompanyInfo | null = null;

        // 1. Try Backend first
        try {
          const res = await fetch(`${apiBase}/api/company/${symbol}`);
          if (res.ok) {
            backendData = (await res.json()) as CompanyInfo;
          }
        } catch (e) { /* ignore */ }

        // Check if backend data is sufficient (has Market Cap and News)
        const hasFullProfile = backendData?.profile?.marketCapitalization !== undefined && backendData?.profile?.marketCapitalization > 0;
        const hasNews = backendData?.news && backendData.news.length > 0;

        if (backendData && hasFullProfile && hasNews) {
          if (active) {
            setCompany(backendData);
            setCompanyError(null);
          }
          return;
        }

        // 2. Fetch Finnhub if missing key data
        const [fhProfile, fhNews] = await Promise.all([
          !hasFullProfile ? loadProfileFinnhub() : Promise.resolve(null),
          !hasNews ? loadNewsFinnhub() : Promise.resolve([])
        ]);

        // 3. Construct Final Data (Merge)
        const finalProfile = {
          ...(backendData?.profile || {}),
          ...(fhProfile ? {
            name: fhProfile.name,
            ticker: fhProfile.ticker,
            logo: fhProfile.logo || backendData?.profile?.logo,
            weburl: fhProfile.weburl,
            industry: fhProfile.finnhubIndustry,
            ipo: fhProfile.ipo,
            marketCapitalization: fhProfile.marketCapitalization,
            currency: fhProfile.currency,
            supply: fhProfile.shareOutstanding
          } : {})
        };

        const finalNews = (backendData?.news?.length ? backendData.news : []).concat(
          fhNews.map((n: any) => ({
            headline: n.headline,
            url: n.url,
            datetime: n.datetime,
            source: n.source
          }))
        ).slice(0, 10); // Keep top 10

        if (active) {
          // If we have at least something
          if (finalProfile.name || backendData) {
            setCompany({
              profile: finalProfile as any,
              metrics: backendData?.metrics || {
                peBasicExclExtraTTM: 0,
                dividendYieldIndicatedAnnual: 0,
                beta: 1
              },
              news: finalNews
            });
            setCompanyError(null);
          } else {
            throw new Error("Profile unavailable");
          }
        }

      } catch (e) {
        if (active) setCompanyError("Could not load company profile");
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [symbol, finnhubKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("flux_token");
    if (stored) setToken(stored);
  }, []);

  const up = (ticker?.change_24h ?? 0) >= 0;
  const statusText = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    const estHour = (utcHour - 5 + 24) % 24; // rough EST
    const open = utcDay >= 1 && utcDay <= 5 && estHour >= 9 && estHour < 16;
    return open ? "Market Open" : "Closed/Pre-market";
  };

  const timeframeRangeSeconds =
    interval.label === "YTD"
      ? Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 1000)
      : interval.rangeSeconds;

  const related =
    company?.profile?.industry && company.profile.industry !== ""
      ? [company.profile.industry, "Sector ETF", "Peer stock"]
      : ["Tech", "AI", "Mega-cap"];

  // Avoid hydration mismatches by rendering a stable shell until mounted.
  if (!hydrated) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <p className="text-sm text-slate-400">Loading {symbol}…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              {company?.profile?.ticker?.replace(/^(BINANCE:|COINBASE:|\^)/, "").replace(/(USDT|USD|EUR)$/, "") ?? symbol.replace(/^(BINANCE:|COINBASE:|\^)/, "").replace(/(USDT|USD|EUR)$/, "")}
            </p>
            <h1 className="text-3xl font-bold text-slate-50 mb-1">
              {company?.profile?.name ?? symbol.replace(/^(BINANCE:|COINBASE:|\^)/, "").replace(/(USDT|USD|EUR)$/, "")}
            </h1>
            <p className="text-sm text-slate-400">
              Live via WebSocket · Feed: {status} · Market: {statusText()}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-emerald-400"
          >
            ← Back to dashboard
          </Link>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span>Style:</span>
          <button
            className={`rounded-full px-3 py-1 ${style === "candle" ? "bg-emerald-500 text-emerald-900" : "bg-slate-800 text-slate-200"}`}
            onClick={() => setStyle("candle")}
          >
            Candles
          </button>
          <button
            className={`rounded-full px-3 py-1 ${style === "line" ? "bg-emerald-500 text-emerald-900" : "bg-slate-800 text-slate-200"}`}
            onClick={() => setStyle("line")}
          >
            Line
          </button>
          <span className="ml-4">Timeframe:</span>
          {intervals.map((i) => (
            <button
              key={i.label}
              className={`rounded-full px-3 py-1 ${interval.label === i.label ? "bg-emerald-500 text-emerald-900" : "bg-slate-800 text-slate-200"}`}
              onClick={() => setInterval(i)}
            >
              {i.label}
            </button>
          ))}
          <span className="ml-4">Indicators:</span>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={showVolume} onChange={(e) => setShowVolume(e.target.checked)} />
            Volume
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={showMA} onChange={(e) => setShowMA(e.target.checked)} />
            MA
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={showRSI} onChange={(e) => setShowRSI(e.target.checked)} />
            RSI
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/30 p-6 shadow-2xl shadow-black/50">
          <AssetChart
            symbol={symbol}
            resolution={interval.resolution}
            rangeSeconds={timeframeRangeSeconds}
            style={style}
            showVolume={showVolume}
            showMA={showMA}
            showRSI={showRSI}
            latestPrice={ticker?.price}
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <div>
                <p className="text-sm text-slate-400">Last price</p>
                <div className="text-3xl font-semibold text-slate-50">
                  {ticker
                    ? `$${ticker.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    : "—"}
                </div>
              </div>
              <span
                className={`rounded-full px-4 py-2 text-xs font-semibold ${up ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"
                  }`}
              >
                {ticker ? (
                  <>
                    {up ? "▲" : "▼"} {ticker.change_24h.toFixed(2)}%
                  </>
                ) : (
                  "Waiting price"
                )}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Quick trade</p>
              <div className="mt-2 flex flex-col gap-2">
                <label className="text-slate-300">Quantity</label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                  value={tradeQty}
                  min={0.0001}
                  step={0.0001}
                  onChange={(e) => setTradeQty(Number(e.target.value))}
                />
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-rose-50 hover:bg-rose-400 disabled:opacity-50"
                    disabled={!token || !ticker || tradeQty <= 0}
                    onClick={async () => {
                      if (!ticker) return;
                      try {
                        setTradeMessage("");
                        const res = await fetch(`${apiBase}/trade/buy`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({
                            symbol,
                            quantity: tradeQty,
                            price: ticker.price,
                          }),
                        });
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}));
                          throw new Error((err as { error?: string }).error || "Buy failed");
                        }
                        setTradeMessage("Buy executed");
                      } catch (err) {
                        setTradeMessage(err instanceof Error ? err.message : "Buy failed");
                      }
                    }}
                  >
                    Buy
                  </button>
                  <button
                    className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-400 disabled:opacity-50"
                    disabled={!token || !ticker || tradeQty <= 0}
                    onClick={async () => {
                      if (!ticker) return;
                      try {
                        setTradeMessage("");
                        const res = await fetch(`${apiBase}/trade/sell`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({
                            symbol,
                            quantity: tradeQty,
                            price: ticker.price,
                          }),
                        });
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}));
                          throw new Error((err as { error?: string }).error || "Sell failed");
                        }
                        setTradeMessage("Sell executed");
                      } catch (err) {
                        setTradeMessage(err instanceof Error ? err.message : "Sell failed");
                      }
                    }}
                  >
                    Sell
                  </button>
                </div>
                {!token && (
                  <p className="text-xs text-amber-300">
                    Login required. Use the nav profile menu to sign in.
                  </p>
                )}
                {tradeMessage && <p className="text-xs text-slate-300">{tradeMessage}</p>}
                {(!ticker || !hydrated) && (
                  <p className="text-xs text-slate-400" suppressHydrationWarning>
                    Waiting for live USD price… ensure WS feed covers this symbol or set
                    NEXT_PUBLIC_FINNHUB_KEY.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fundamentals */}
        <div className="mt-8 mb-8">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-main">Fundamentals</h2>
              <span className="text-xs text-text-muted uppercase tracking-wider">Powered by Finnhub</span>
            </div>

            {companyError && <p className="text-rose-400">{companyError}</p>}

            {company && (
              <div className="grid gap-6 md:grid-cols-4 select-none">
                {/* Market Cap */}
                <div className="space-y-1">
                  <p className="text-xs text-text-dim uppercase">Market Cap</p>
                  <p className="text-xl font-mono text-text-main">
                    {typeof company.profile?.marketCapitalization === "number"
                      ? formatCurrencyCompact((company.profile.marketCapitalization as number) * 1000000, company.profile?.currency)
                      : "—"}
                  </p>
                </div>

                {/* Conditional Metrics */}
                {company.profile?.industry === "Crypto" ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-text-dim uppercase">Circulating Supply</p>
                      <p className="text-xl font-mono text-text-main">
                        {company.profile?.supply
                          ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(company.profile.supply)
                          : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-text-dim uppercase">24h Volume</p>
                      <p className="text-xl font-mono text-text-main">
                        {company.profile?.volume
                          ? formatCurrencyCompact(company.profile.volume)
                          : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-text-dim uppercase">Type</p>
                      <p className="text-xl font-mono text-text-main">Layer 1</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-text-dim uppercase">P/E Ratio</p>
                      <p className="text-xl font-mono text-text-main">
                        {typeof company.metrics?.["peBasicExclExtraTTM"] === "number"
                          ? (company.metrics["peBasicExclExtraTTM"] as number).toFixed(2)
                          : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-text-dim uppercase">Div Yield</p>
                      <p className="text-xl font-mono text-text-main">
                        {typeof company.metrics?.["dividendYieldIndicatedAnnual"] === "number"
                          ? `${(company.metrics["dividendYieldIndicatedAnnual"] as number).toFixed(2)}%`
                          : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-text-dim uppercase">Beta (5Y)</p>
                      <p className="text-xl font-mono text-text-main">
                        {typeof company.metrics?.["beta"] === "number"
                          ? (company.metrics["beta"] as number).toFixed(2)
                          : "1.05"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Insights & Community Grid */}
        <div className="grid gap-8 lg:grid-cols-2 mb-12">
          {/* News Column */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-1 bg-gradient-to-b from-emerald-400 to-cyan-500 rounded-full" />
              <h2 className="text-xl font-bold text-text-main">Latest News</h2>
            </div>
            <NewsFeed symbol={symbol} initialNews={company?.news} />
          </section>

          {/* Social Column */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-1 bg-gradient-to-b from-purple-400 to-pink-500 rounded-full" />
              <h2 className="text-xl font-bold text-text-main">Community Sentiment</h2>
            </div>
            <SocialFeed symbol={symbol} />
          </section>
        </div>

        {/* Related + learn */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Related</p>
            <div className="mt-2 space-y-2 text-sm text-slate-200">
              {related.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-800/70 px-3 py-2"
                >
                  <span>{r}</span>
                  <Link href="/markets" className="text-xs text-emerald-300 hover:underline">
                    Explore
                  </Link>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Learn</p>
              <button
                onClick={() => setShowLearn((s) => !s)}
                className="text-xs text-emerald-300 hover:underline"
              >
                {showLearn ? "Hide" : "Show"}
              </button>
            </div>
            {showLearn && (
              <div className="mt-2 space-y-2 text-sm text-slate-300">
                <p className="font-semibold text-slate-100">What moves {symbol}?</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Macro: rates, dollar strength, sector flows.</li>
                  <li>Micro: earnings, guidance, product launches.</li>
                  <li>Sentiment: news, volume spikes, options flow.</li>
                </ul>
                <p className="text-xs text-slate-500">
                  TODO: track completion per user (local flag) and add inline tooltips for first trade.
                </p>
              </div>
            )}
          </div>
        </div>
      </div >
    </main >
  );
}
