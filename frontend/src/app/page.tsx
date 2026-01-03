"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";

// --- Types ---
type Ticker = { symbol: string; price: number; change_24h: number; updated_at: string };
type Snapshot = Record<string, Ticker>;
type Candle = { time: number; close: number };

// --- Configuration ---
const wsUrl =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/^http/, "ws") ?? "ws://localhost:8080/ws/prices";

const mockIndices = [
  { symbol: "S&P 500", code: "SPX", value: 6845.20, change: 1.25 },
  { symbol: "Nasdaq 100", code: "NDX", value: 23510.50, change: 1.45 },
  { symbol: "Dow 30", code: "DJI", value: 45230.15, change: 0.85 },
  { symbol: "Japan 225", code: "NI225", value: 50526.87, change: -0.44 },
  { symbol: "FTSE 100", code: "UKX", value: 10250.45, change: 0.35 },
  { symbol: "DAX", code: "DAX", value: 21450.33, change: 0.62 },
];

const mockCommodities = [
  { symbol: "Crude Oil", value: 78.4, change: -0.45, high: 79.2, low: 77.8 },
  { symbol: "Natural Gas", value: 2.65, change: 1.2, high: 2.71, low: 2.62 },
  { symbol: "Gold", value: 2750.5, change: 0.85, high: 2762.0, low: 2741.5 },
  { symbol: "Copper", value: 5.69, change: -0.20, high: 5.75, low: 5.65 },
];

const macroCards = {
  crypto: { totalMcap: 2.15, vol24h: 85.2, btcDom: 54.2, ethDom: 17.8 },
  dxy: { value: 104.80, change: -0.32, rangeLow: 104.20, rangeHigh: 105.10, yearLow: 99.5, yearHigh: 107.3 },
  yields: { us10y: 4.12, us2y: 4.45, us10yChange: 0.05, us2yChange: 0.02 },
};

// --- Helpers ---
const changeColor = (val: number) => (val >= 0 ? "text-up" : "text-down");
const toUtc = (value: number): UTCTimestamp =>
  Math.floor(Number(value) || 0) as UTCTimestamp;

const generateSynthetic = (points = 60): Candle[] => {
  const now = Math.floor(Date.now() / 1000);
  const out: Candle[] = [];
  let price = 6800;
  for (let i = points - 1; i >= 0; i--) {
    price = price + (Math.random() - 0.5) * 50;
    out.push({ time: now - i * 24 * 3600, close: price });
  }
  return out;
};

export default function Home() {
  const [prices, setPrices] = useState<Snapshot>({});
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [heroCandles, setHeroCandles] = useState<Candle[]>([]);
  const heroChartRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // WebSocket Connection
  useEffect(() => {
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
        try {
          const payload = JSON.parse(event.data) as Snapshot;
          setPrices(payload);
          const first = Object.values(payload)[0];
          if (first?.updated_at) setLastUpdated(first.updated_at);
        } catch (e) {
          console.error("WS Parse error", e);
        }
      };
    };
    connect();
    return () => socket?.close();
  }, []);

  // Fetch Hero Data
  useEffect(() => {
    const load = async () => {
      const now = Math.floor(Date.now() / 1000);
      const from = now - 90 * 24 * 3600;
      try {
        const res = await fetch(`/api/market-data/SPY/D?from=${from}&to=${now}`);
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          setHeroCandles(
            data.map((d: { time: number; close: number }) => ({
              time: Number(d.time),
              close: Number(d.close),
            })),
          );
          return;
        }
      } catch {
        setHeroCandles(generateSynthetic());
      }
    };
    void load();
  }, []);

  // Render Hero Chart
  useEffect(() => {
    const el = heroChartRef.current;
    if (!el || heroCandles.length === 0) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 280, // Reduced height
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(148, 163, 184, 0.8)", // text-muted
        fontFamily: "var(--font-sans)",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.02)" },
        horzLines: { color: "rgba(255,255,255,0.02)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.05)" },
      timeScale: { borderColor: "rgba(255,255,255,0.05)" },
      handleScroll: false,
      handleScale: false,
    });

    // Gradient Area for Premium Look
    const area = chart.addAreaSeries({
      lineColor: "#6366f1", // primary
      topColor: "rgba(99, 102, 241, 0.4)",
      bottomColor: "rgba(99, 102, 241, 0.0)",
      lineWidth: 2,
    });

    area.setData(
      heroCandles.map((c) => ({ time: toUtc(c.time), value: c.close })),
    );

    const handleResize = () => chart.applyOptions({ width: el.clientWidth });
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [heroCandles]);

  const topMovers = useMemo(
    () =>
      Object.values(prices)
        .sort((a, b) => Math.abs(b.change_24h) - Math.abs(a.change_24h))
        .slice(0, 12),
    [prices],
  );

  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* Header Section */}
        <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></span>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Market Overview</p>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-text-main sm:text-5xl">
              Global Snapshot
            </h1>
            <p className="max-w-xl text-text-muted">
              Real-time insights into global equities, crypto indices, and commodities.
              Powered by <span className="text-text-main font-medium">Flux Trading Engine</span>.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-dim backdrop-blur-md">
              <span className={`h-2 w-2 rounded-full ${status === "open" ? "bg-up shadow-[0_0_8px_var(--color-up)]" : "bg-amber-400"}`} />
              {status === "open" ? "System Operational" : "Connecting..."}
            </div>
            <Link
              href="/learn"
              className="rounded-full bg-surface-hover border border-border px-4 py-1.5 text-xs font-semibold text-text-main transition hover:bg-white/10"
            >
              Start Learning
            </Link>
          </div>
        </header>

        {/* Hero Area */}
        <section className="mb-12 grid gap-6 lg:grid-cols-3">
          {/* Main Chart Card */}
          <div className="glass lg:col-span-2 relative overflow-hidden rounded-3xl p-1">
            <div className="absolute top-0 right-0 p-40 bg-primary/10 blur-[100px] pointer-events-none rounded-full" />

            <div className="relative z-10 p-6 h-full flex flex-col items-center text-center">

              <h2 className="text-xl font-bold text-text-muted mb-4 uppercase tracking-widest">S&P 500 <span className="text-text-dim font-normal text-xs ml-2 normal-case border border-border rounded px-2 py-0.5">SPY Proxy</span></h2>

              <div className="flex flex-col items-center gap-2 mb-4">
                <span className="text-5xl font-bold text-text-main tracking-tighter drop-shadow-2xl">
                  {heroCandles.length ? `$${heroCandles[heroCandles.length - 1].close.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-lg font-bold text-up flex items-center gap-1 bg-up/10 px-3 py-1 rounded-full border border-up/20">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    +{heroCandles.length ? ((heroCandles[heroCandles.length - 1].close - heroCandles[0].close) / heroCandles[0].close * 100).toFixed(2) : "0.00"}%
                  </span>
                  <span className="text-text-dim font-medium text-xs">Past 90 Days</span>
                </div>
              </div>

              <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border w-fit shadow-lg mb-4">
                {["1D", "1W", "1M", "3M", "YTD", "ALL"].map((t) => (
                  <button key={t} className={`rounded-lg px-3 py-1 text-[10px] font-bold transition ${t === "3M" ? "bg-white/10 text-text-main shadow-sm" : "text-text-muted hover:bg-white/5 hover:text-text-main"}`}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-[280px] w-full mt-2">
                <div ref={heroChartRef} className="h-full w-full" />
              </div>
            </div>
          </div>

          {/* Indices List */}
          <div className="glass rounded-3xl p-6 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-text-main">Major Indices</h3>
              <Link href="/markets" className="text-xs font-medium text-primary hover:text-accent transition">View All</Link>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {mockIndices.map((i) => (
                <div key={i.code} className="group flex items-center justify-between rounded-xl bg-white/5 p-3 transition hover:bg-white/10 border border-transparent hover:border-border">
                  <div>
                    <p className="font-medium text-text-main text-sm">{i.symbol}</p>
                    <p className="text-[10px] uppercase tracking-wider text-text-dim">{i.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-main">{i.value.toLocaleString()}</p>
                    <p className={`text-xs ${changeColor(i.change)}`}>
                      {i.change >= 0 ? "+" : ""}{i.change}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Macro Cards */}
        <section className="mb-16">
          <h3 className="mb-6 text-xl font-semibold text-text-main">Market Pulse</h3>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

            {/* Card 1: Crypto */}
            <div className="glass-hover glass rounded-3xl p-6 hover:-translate-y-1 transition duration-300">
              <div className="mb-4 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-text-dim">Crypto</span>
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">High Vol</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-text-main">${macroCards.crypto.totalMcap}T</span>
                <span className="text-xs text-up font-medium">+2.4%</span>
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[10px] text-text-dim uppercase tracking-wide mb-0.5">24h Vol</p>
                  <p className="text-sm font-semibold text-text-main">${macroCards.crypto.vol24h}B</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-dim uppercase tracking-wide mb-0.5">Sentiment</p>
                  <p className="text-sm font-semibold text-up">Greed</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-dim uppercase tracking-wide mb-0.5">BTC Dom</p>
                  <p className="text-sm font-semibold text-text-main">{macroCards.crypto.btcDom}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-dim uppercase tracking-wide mb-0.5">ETH Dom</p>
                  <p className="text-sm font-semibold text-text-main">{macroCards.crypto.ethDom}%</p>
                </div>
              </div>
            </div>

            {/* Card 2: DXY */}
            <div className="glass-hover glass rounded-3xl p-6 hover:-translate-y-1 transition duration-300">
              <div className="mb-4 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-text-dim">DXY Index</span>
                <span className="text-xs text-text-dim">USD Strength</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-text-main">{macroCards.dxy.value.toFixed(2)}</span>
                <span className={`text-xs font-medium ${changeColor(macroCards.dxy.change)}`}>{macroCards.dxy.change}%</span>
              </div>
              <p className="text-[10px] text-text-muted mb-4">Intraday</p>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-dim">Day Range</span>
                  <span className="text-text-main">{macroCards.dxy.rangeLow} - {macroCards.dxy.rangeHigh}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
                  <div className="h-full bg-text-muted w-[60%]" />
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-text-dim">52W Range</span>
                  <span className="text-text-main">{macroCards.dxy.yearLow} - {macroCards.dxy.yearHigh}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Commodities */}
            <div className="glass-hover glass rounded-3xl p-6 hover:-translate-y-1 transition duration-300">
              <div className="mb-4 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-text-dim">Commodities</span>
                <span className="text-xs text-text-dim">Futures</span>
              </div>
              <div className="space-y-3">
                {mockCommodities.map(c => (
                  <div key={c.symbol} className="flex justify-between items-center text-sm">
                    <div className="flex flex-col">
                      <span className="text-text-main font-medium text-xs dark:text-gray-200">{c.symbol}</span>
                      <span className="text-[10px] text-text-dim">H: {c.high} L: {c.low}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-text-main font-medium">{c.value}</div>
                      <div className={`text-[10px] ${changeColor(c.change)}`}>{c.change > 0 ? "+" : ""}{c.change}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 4: Yields */}
            <div className="glass-hover glass rounded-3xl p-6 hover:-translate-y-1 transition duration-300">
              <div className="mb-4 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-text-dim">US Treasuries</span>
                <span className="text-xs text-up bg-up/10 px-2 py-0.5 rounded-full">Yields Rising</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] text-text-dim uppercase tracking-wide mb-1">10-Year</p>
                  <p className="text-2xl font-bold text-text-main">{macroCards.yields.us10y}%</p>
                  <p className="text-xs text-up">+{macroCards.yields.us10yChange}bps</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-dim uppercase tracking-wide mb-1">2-Year</p>
                  <p className="text-2xl font-bold text-text-main">{macroCards.yields.us2y}%</p>
                  <p className="text-xs text-up">+{macroCards.yields.us2yChange}bps</p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-text-dim">10Y-2Y Spread</span>
                  <span className="text-down font-medium">{(macroCards.yields.us10y - macroCards.yields.us2y).toFixed(2)}% (Inverted)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-dim">Real Yield (10Y)</span>
                  <span className="text-text-main font-medium">1.95%</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Live Board */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-main">Live Board</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${viewMode === "list"
                  ? "bg-primary text-white"
                  : "bg-surface text-text-muted hover:bg-surface-hover hover:text-text-main"
                  }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${viewMode === "grid"
                  ? "bg-primary text-white"
                  : "bg-surface text-text-muted hover:bg-surface-hover hover:text-text-main"
                  }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div
            className={`${viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-2"
              }`}
          >
            {topMovers.map((t) => {
              const up = (t.change_24h ?? 0) >= 0;

              if (viewMode === "list") {
                return (
                  <Link
                    key={t.symbol}
                    href={`/asset/${t.symbol}`}
                    className="glass group flex items-center justify-between rounded-xl p-4 transition hover:border-primary/30 hover:bg-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg bg-surface font-bold ${up ? "text-up" : "text-down"
                          }`}
                      >
                        {t.symbol[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-text-main">{t.symbol}</h4>
                        <span className="text-xs text-text-dim">
                          Vol: {(Math.random() * 10).toFixed(1)}M
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-text-main">
                        ${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <span className={`text-xs font-bold ${up ? "text-up" : "text-down"}`}>
                        {up ? "+" : ""}
                        {t.change_24h.toFixed(2)}%
                      </span>
                    </div>
                  </Link>
                );
              }

              return (
                <Link
                  key={t.symbol}
                  href={`/asset/${t.symbol}`}
                  className="glass group relative overflow-hidden rounded-2xl p-5 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                >
                  <div
                    className={`absolute left-0 top-0 h-1 w-full ${up ? "bg-up" : "bg-down"
                      } opacity-50`}
                  ></div>
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-text-main">{t.symbol}</h4>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`flex items-center text-xs font-bold ${up ? "text-up" : "text-down"}`}>
                          {up ? "▲" : "▼"} {Math.abs(t.change_24h).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-text-muted transition group-hover:bg-primary/20 group-hover:text-primary">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-2xl font-semibold tracking-tight text-text-main">
                      ${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="mt-1 text-[10px] text-text-dim">Vol: {(Math.random() * 10).toFixed(1)}M · Live</p>
                  </div>
                </Link>
              );
            })}

            {!topMovers.length && (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-white/5 py-12 text-center">
                <p className="text-text-muted">Waiting for market feed connection...</p>
                <span className="loading-spinner mt-2 text-primary"></span>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
