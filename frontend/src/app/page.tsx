"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  UTCTimestamp,
  createChart,
  ISeriesApi,
} from "lightweight-charts";


// --- Types ---
type Ticker = { symbol: string; price: number; change_24h: number; updated_at: string };
type Snapshot = Record<string, Ticker>;
type Candle = { time: number; close: number };

// --- Configuration ---
const wsUrl =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/^http/, "ws") ?? "ws://localhost:8080/ws/prices";
const mockIndices = [
  { symbol: "S&P 500", code: "SPX", value: 5250.23, change: -0.03 },
  { symbol: "Nasdaq 100", code: "NDX", value: 18250.12, change: -0.18 },
  { symbol: "Japan 225", code: "NI225", value: 50526.87, change: -0.44 },
  { symbol: "SSE Composite", code: "000001", value: 3965.27, change: 0.04 },
  { symbol: "FTSE 100", code: "UKX", value: 9862.45, change: -0.08 },
  { symbol: "DAX", code: "DAX", value: 18450.33, change: 0.12 },
  { symbol: "CAC 40", code: "PX1", value: 8100.16, change: -0.04 },
];

const mockCommodities = [
  { symbol: "Crude Oil", value: 78.4, change: -0.45 },
  { symbol: "Natural Gas", value: 2.65, change: 1.2 },
  { symbol: "Gold", value: 2325.5, change: 0.22 },
  { symbol: "Copper", value: 5.69, change: -2.47 },
];

const macroCards = {
  crypto: { totalMcap: 2.1, btcDom: 51.2, btc: 87660, eth: 2935 },
};

// --- Helpers ---
const changeColor = (val: number) => (val >= 0 ? "text-up" : "text-down");
const toUtc = (value: number): UTCTimestamp =>
  Math.floor(Number(value) || 0) as UTCTimestamp;

const generateSynthetic = (points = 60): Candle[] => {
  const now = Math.floor(Date.now() / 1000);
  const out: Candle[] = [];
  let price = 6900;
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
  const [showLearn, setShowLearn] = useState(false);
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
        const payload = JSON.parse(event.data) as Snapshot;
        setPrices(payload);
        const first = Object.values(payload)[0];
        if (first?.updated_at) setLastUpdated(first.updated_at);
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
      height: 240,
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

            <div className="relative z-10 p-6 h-full flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-main">S&P 500 <span className="text-text-dim font-normal text-sm ml-2">SPY Proxy</span></h2>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-text-main">
                      {heroCandles.length ? `$${heroCandles[heroCandles.length - 1].close.toFixed(2)}` : "—"}
                    </span>
                    <span className="text-sm font-medium text-up flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                      +1.2%
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 bg-surface rounded-lg p-1 border border-border">
                  {["1D", "1W", "1M", "YTD"].map((t) => (
                    <button key={t} className="rounded-md px-3 py-1 text-xs font-medium text-text-muted hover:bg-white/5 hover:text-text-main transition">
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-h-[240px] w-full mt-6">
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
            <div className="glass-hover glass rounded-3xl p-5 hover:-translate-y-1 transition duration-300">
              <div className="mb-4 flex justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-dim">Crypto Total</span>
                <span className="text-xs text-primary">High Vol</span>
              </div>
              <div className="text-2xl font-bold text-text-main mb-1">${macroCards.crypto.totalMcap}T</div>
              <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-primary to-accent w-[65%]" />
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>BTC Dom: {macroCards.crypto.btcDom}%</span>
                <span className="text-up">+2.4%</span>
              </div>
            </div>

            {/* Card 2: DXY */}
            <div className="glass-hover glass rounded-3xl p-5 hover:-translate-y-1 transition duration-300">
              <div className="mb-4 flex justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-dim">DXY Index</span>
                <span className="text-xs text-text-dim">USD strength</span>
              </div>
              <div className="text-2xl font-bold text-text-main mb-1">104.80</div>
              <p className="text-xs text-down mb-4 font-medium">-0.32% (Intraday)</p>
              <div className="h-12 w-full rounded-lg bg-gradient-to-t from-down/20 to-transparent border-b border-down/30 relative">
                <div className="absolute bottom-1 right-2 text-[10px] text-down">Bearish</div>
              </div>
            </div>

            {/* Card 3: Commodities */}
            <div className="glass-hover glass rounded-3xl p-5 hover:-translate-y-1 transition duration-300">
              <div className="mb-4 flex justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-dim">Commodities</span>
              </div>
              <div className="space-y-2.5">
                {mockCommodities.slice(0, 3).map(c => (
                  <div key={c.symbol} className="flex justify-between text-sm">
                    <span className="text-text-muted">{c.symbol}</span>
                    <span className={changeColor(c.change)}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 4: Yields */}
            <div className="glass-hover glass rounded-3xl p-5 hover:-translate-y-1 transition duration-300">
              <div className="mb-4 flex justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-dim">US 10Y Yield</span>
              </div>
              <div className="text-2xl font-bold text-text-main mb-1">4.12%</div>
              <p className="text-xs text-up mb-3 font-medium">+5bps</p>
              <div className="mt-auto text-[10px] text-text-dim leading-relaxed">
                Bond markets pricing in rate cuts. Next Fed meeting in 12 days.
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

