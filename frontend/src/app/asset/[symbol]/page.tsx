"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AssetChart } from "@/components/AssetChart";

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

export default function AssetPage() {
  const { symbol: rawSymbol } = useParams<{ symbol: string }>();
  const symbol = rawSymbol?.toUpperCase?.() ?? "";
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [interval, setInterval] = useState(intervals[2]); // default 1M
  const [style, setStyle] = useState<"candle" | "line">("candle");
  const [showVolume, setShowVolume] = useState(true);
  const [showMA, setShowMA] = useState(true);
  const [showRSI, setShowRSI] = useState(false); // placeholder
  const [company, setCompany] = useState<CompanyInfo | null>(null);
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
    if (!symbol) return;
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`${apiBase}/api/company/${symbol}`);
        if (!res.ok) throw new Error("Profile unavailable");
        const data = (await res.json()) as CompanyInfo;
        if (active) {
          setCompany(data);
          setCompanyError(null);
        }
      } catch {
        if (active) setCompanyError("Could not load company profile");
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [symbol]);

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
              Asset Detail
            </p>
            <h1 className="text-3xl font-semibold text-slate-50">{symbol}</h1>
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
            RSI (placeholder)
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
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  up ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"
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

        {/* Fundamentals + news */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Company overview</p>
            {companyError && (
              <p className="mt-2 text-sm text-rose-300">{companyError}</p>
            )}
            {company && (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="text-lg font-semibold text-slate-50">
                    {company.profile?.name ?? symbol}
                  </p>
                  {company.profile?.weburl && (
                    <a
                      href={company.profile.weburl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-300 hover:underline"
                    >
                      {company.profile.weburl}
                    </a>
                  )}
                  <p className="text-xs text-slate-400">
                    Industry: {company.profile?.industry ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400">
                    IPO: {company.profile?.ipo ?? "—"}
                  </p>
                </div>
                <div className="space-y-1 text-sm text-slate-200">
                  <p className="text-slate-400">Market cap</p>
                  <p className="text-lg font-semibold">
                    {typeof company.profile?.marketCapitalization === "number"
                      ? // Finnhub returns marketCap in millions USD; convert to absolute and compact-format
                        formatCurrencyCompact(
                          (company.profile.marketCapitalization as number) * 1_000_000,
                          company.profile?.currency || "USD",
                        )
                      : "—"}
                  </p>
                  <p className="text-slate-400">PE (TTM)</p>
                  <p>
                    {company.metrics?.["peBasicExclExtraTTM"] ??
                      company.metrics?.["peInclExtraTTM"] ??
                      "—"}
                  </p>
                  <p className="text-slate-400">PB</p>
                  <p>{company.metrics?.["pbAnnual"] ?? "—"}</p>
                </div>
                <div className="space-y-1 text-sm text-slate-200">
                  <p className="text-slate-400">EPS (TTM)</p>
                  <p>{company.metrics?.["epsBasicExclExtraItemsTTM"] ?? "—"}</p>
                  <p className="text-slate-400">Rev QoQ</p>
                  <p>{company.metrics?.["revenueGrowthQuarterlyYoy"] ?? "—"}</p>
                  <p className="text-slate-400">Rev YoY</p>
                  <p>{company.metrics?.["revenueGrowthTTMYoy"] ?? "—"}</p>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recent news</p>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              {company?.news?.slice(0, 5).map((n, idx) => (
                <a
                  key={idx}
                  href={n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-white/5 bg-white/5 px-3 py-2 hover:border-emerald-400/60"
                >
                  <p className="font-semibold">{n.headline}</p>
                  <p className="text-xs text-slate-400">
                    {n.source} ·{" "}
                    {n.datetime
                      ? new Date(n.datetime * 1000).toLocaleDateString()
                      : ""}
                  </p>
                </a>
              ))}
              {!company?.news?.length && (
                <p className="text-xs text-slate-400">No recent headlines.</p>
              )}
            </div>
          </div>
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
      </div>
    </main>
  );
}
