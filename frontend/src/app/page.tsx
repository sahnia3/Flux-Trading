"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";
import { LearnSidebar } from "@/components/LearnSidebar";

type Ticker = { symbol: string; price: number; change_24h: number; updated_at: string };
type Snapshot = Record<string, Ticker>;
type Candle = { time: number; close: number };

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

const changeColor = (val: number) => (val >= 0 ? "text-emerald-300" : "text-rose-300");
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

  // Fetch SPY (proxy for S&P 500) candles for hero chart; fallback to synthetic
  useEffect(() => {
    const load = async () => {
      const now = Math.floor(Date.now() / 1000);
      const from = now - 90 * 24 * 3600;
      try {
        const res = await fetch(
          `/api/market-data/SPY/D?from=${from}&to=${now}`,
        );
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

  // Render hero chart
  useEffect(() => {
    const el = heroChartRef.current;
    if (!el || heroCandles.length === 0) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 220,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: { borderColor: "rgba(255,255,255,0.1)" },
    });
    const area = chart.addAreaSeries({
      lineColor: "#22c55e",
      topColor: "rgba(34,197,94,0.25)",
      bottomColor: "rgba(34,197,94,0.05)",
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Flux Trading</p>
            <h1 className="text-3xl font-semibold text-slate-50">Market summary</h1>
            <p className="text-sm text-slate-400">
              Paper trading · Live WS feed · Stocks + Crypto · Inspired by TradingView layout.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  status === "open"
                    ? "bg-emerald-400"
                    : status === "connecting"
                      ? "bg-amber-400"
                      : "bg-rose-400"
                }`}
              />
              {status === "open" ? "Live" : status === "connecting" ? "Connecting" : "Reconnecting"}
            </div>
            <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 backdrop-blur">
              Live symbols: {topMovers.length} · Updated {lastUpdated || "—"}
            </div>
            <button
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:border-emerald-400"
              onClick={() => setShowLearn(true)}
            >
              Learn
            </button>
          </div>
        </header>

        {/* Hero: primary index area + major indices list */}
        <section className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-slate-900/85 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-50">S&P 500 (SPY proxy)</p>
                <p className="text-3xl font-semibold text-slate-50">
                  {heroCandles.length
                    ? `$${heroCandles[heroCandles.length - 1].close.toFixed(2)}`
                    : "—"}
                </p>
                <p className="text-sm text-emerald-300">Live chart</p>
              </div>
              <div className="text-xs text-slate-400">1M • Area</div>
            </div>
            <div className="mt-5 h-56 rounded-2xl border border-white/5 bg-slate-950/40">
              <div ref={heroChartRef} className="h-full w-full" />
            </div>
            <div className="mt-4 flex gap-2 text-xs text-slate-300">
              {["1D", "1W", "1M", "1Y", "All"].map((t) => (
                <span key={t} className="rounded-full bg-white/5 px-3 py-1">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/85 p-5 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-50">Major indices</p>
              <Link href="/markets" className="text-xs text-emerald-300 hover:underline">
                See all →
              </Link>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-200 sm:grid-cols-1">
              {mockIndices.map((i) => (
                <div
                  key={i.code}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-50">
                      {i.symbol} <span className="text-xs text-slate-400">{i.code}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{i.value.toLocaleString()}</p>
                    <p className={changeColor(i.change)}>
                      {i.change >= 0 ? "▲" : "▼"} {Math.abs(i.change).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Macro cards row */}
        <section className="mb-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-slate-900/85 p-5 shadow-xl shadow-black/45">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Crypto market cap</p>
              <Link href="/markets" className="text-xs text-emerald-300 hover:underline">
                See all coins
              </Link>
            </div>
            <div className="mt-3 text-3xl font-semibold text-slate-50">
              ${macroCards.crypto.totalMcap}T
            </div>
            <div className="mt-3 h-24 rounded-xl bg-gradient-to-b from-emerald-500/20 to-transparent text-xs text-slate-400">
              <div className="p-3">Mock 1M chart</div>
            </div>
            <div className="mt-3 text-sm">
              <p className="text-slate-200">BTC Dominance</p>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/2 bg-emerald-400" />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>BTC {macroCards.crypto.btcDom}%</span>
                <span>ETH 20%</span>
                <span>Alt 29%</span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Bitcoin</span>
                  <span>${macroCards.crypto.btc.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ethereum</span>
                  <span>${macroCards.crypto.eth.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/85 p-5 shadow-xl shadow-black/45">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">US Dollar index</p>
              <span className="text-xs text-slate-400">1 month</span>
            </div>
            <div className="mt-3 text-3xl font-semibold text-slate-50">104.8</div>
            <p className="text-sm text-rose-300">-1.52%</p>
            <div className="mt-3 h-24 rounded-xl bg-gradient-to-b from-white/10 to-transparent">
              <div className="p-3 text-xs text-slate-400">Mock 1M chart</div>
            </div>
            <div className="mt-3 text-xs text-slate-400">See all FX →</div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/85 p-5 shadow-xl shadow-black/45">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Commodities</p>
              <Link href="/markets" className="text-xs text-emerald-300 hover:underline">
                See all futures
              </Link>
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              {mockCommodities.map((c) => (
                <div key={c.symbol} className="flex justify-between">
                  <span>{c.symbol}</span>
                  <span className={changeColor(c.change)}>
                    {c.value} ({c.change}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/85 p-5 shadow-xl shadow-black/45">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">US 10Y yield</p>
              <span className="text-xs text-slate-400">1 month</span>
            </div>
            <div className="mt-3 text-3xl font-semibold text-slate-50">4.12%</div>
            <p className="text-sm text-emerald-300">+2.57%</p>
            <div className="mt-3 h-24 rounded-xl bg-gradient-to-b from-emerald-500/15 to-transparent">
              <div className="p-3 text-xs text-slate-400">Mock 1M chart</div>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              US annual inflation: mock bar chart • Interest rate: 3.75% · Next release Jan 28, 2026
            </div>
          </div>
        </section>

        {/* Live board */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">Live board</h2>
            <p className="text-xs text-slate-400">Top movers across stocks & crypto</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topMovers.map((t) => {
              const up = (t.change_24h ?? 0) >= 0;
              return (
                <Link
                  key={t.symbol}
                  href={`/asset/${t.symbol}`}
                  className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-4 shadow-lg shadow-black/40 transition hover:-translate-y-0.5 hover:border-emerald-400/60"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-50">{t.symbol}</p>
                      <p className="text-xs uppercase text-slate-400">Live feed</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        up ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"
                      }`}
                    >
                      {up ? "▲" : "▼"} {t.change_24h?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-slate-50">
                    ${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500">
                    Updated: {new Date(t.updated_at).toLocaleTimeString()}
                  </p>
                </Link>
              );
            })}
            {!topMovers.length && (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-400">
                Waiting for live feed…
              </div>
            )}
          </div>
        </section>
      </div>
      <LearnSidebar open={showLearn} onClose={() => setShowLearn(false)} />
    </main>
  );
}
