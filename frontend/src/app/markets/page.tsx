"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MarketCategoryNav } from "@/components/MarketCategoryNav";
import { MarketPillCard } from "@/components/MarketPillCard";
import { MarketTileCard } from "@/components/MarketTileCard";
import { MarketTable, TableRow } from "@/components/MarketTable";
import { MarketSparkline } from "@/components/MarketSparkline";

type Snapshot = Record<string, { price: number; change_24h: number; updated_at: string }>;

const wsUrl =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/^http/, "ws") ?? "ws://localhost:8080/ws/prices";

const categories = [
  "Indices",
  "US stocks",
  "World stocks",
  "Crypto",
  "Futures",
  "Forex",
  "Government bonds",
  "Corporate bonds",
  "ETFs",
  "Economy",
] as const;

const baseIndexPrices: Record<string, number> = {
  SPX: 5250.0,
  NDX: 18500.0,
  DJI: 39650.0,
};

const baseStockPrices: Record<string, number> = {
  AAPL: 190,
  NVDA: 490,
  AMZN: 150,
  MSFT: 330,
  TSLA: 54, // fallback if WS missing
  GOOGL: 140,
  AMD: 110,
};

const mockVolumes: Record<string, string> = {
  AAPL: "78M",
  NVDA: "48M",
  AMZN: "62M",
  MSFT: "35M",
  TSLA: "120M",
  AMD: "82M",
  GOOGL: "28M",
};

const featuredMap: Record<string, { symbol: string; name: string }[]> = {
  Indices: [
    { symbol: "SPX", name: "S&P 500" },
    { symbol: "NDX", name: "Nasdaq 100" },
    { symbol: "DJI", name: "Dow 30" },
  ],
  "US stocks": [
    { symbol: "AAPL", name: "Apple" },
    { symbol: "NVDA", name: "NVIDIA" },
    { symbol: "AMZN", name: "Amazon" },
    { symbol: "MSFT", name: "Microsoft" },
    { symbol: "TSLA", name: "Tesla" },
  ],
  "World stocks": [
    { symbol: "TSM", name: "Taiwan Semi" },
    { symbol: "SAMSUNG", name: "Samsung" },
    { symbol: "TCEHY", name: "Tencent" },
    { symbol: "LVMUY", name: "LVMH" },
  ],
  Crypto: [
    { symbol: "BTC", name: "Bitcoin" },
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "SOL", name: "Solana" },
  ],
  Futures: [
    { symbol: "CL", name: "Crude Oil" },
    { symbol: "NG", name: "Natural Gas" },
    { symbol: "GC", name: "Gold" },
  ],
  Forex: [
    { symbol: "DXY", name: "US Dollar Index" },
    { symbol: "EURUSD", name: "EUR/USD" },
    { symbol: "USDJPY", name: "USD/JPY" },
  ],
};

const worldIndices = [
  { symbol: "NI225", name: "Nikkei 225", price: 50526.87, change: -0.44 },
  { symbol: "UKX", name: "FTSE 100", price: 9862.45, change: -0.08 },
  { symbol: "DAX", name: "DAX", price: 18450.33, change: 0.12 },
  { symbol: "PX1", name: "CAC 40", price: 8100.16, change: -0.04 },
  { symbol: "SSE", name: "SSE Comp", price: 3965.27, change: 0.04 },
  { symbol: "HSI", name: "Hang Seng", price: 17650.22, change: 0.18 },
  { symbol: "NIFTY50", name: "Nifty 50", price: 22200.0, change: 0.15 },
  { symbol: "BSESN", name: "BSE Sensex", price: 73500.0, change: 0.10 },
];

const mockSpark = (base = 100, points = 20) =>
  Array.from({ length: points }).map((_, i) => ({
    time: Math.floor(Date.now() / 1000) - (points - i) * 3600,
    value: base + Math.sin(i / 3) * 5 + (Math.random() - 0.5) * 3,
  }));

export default function MarketsPage() {
  const [prices, setPrices] = useState<Snapshot>({});
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [active, setActive] = useState<(typeof categories)[number]>("Indices");
  const sectionsRef = useRef<Record<string, HTMLElement | null>>({});
  const [alphaQuotes, setAlphaQuotes] = useState<Record<string, { price: number; change: number; volume?: string }>>(
    {},
  );
  const [finnhubQuotes, setFinnhubQuotes] = useState<Record<string, { price: number; change: number }>>({});

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

  const livePrice = (sym: string, isIndex = false) => {
    if (finnhubQuotes[sym]?.price) return finnhubQuotes[sym].price;
    if (alphaQuotes[sym]?.price) return alphaQuotes[sym].price;
    if (prices[sym]?.price) return prices[sym].price;
    return isIndex ? baseIndexPrices[sym] ?? 0 : baseStockPrices[sym] ?? 0;
  };

  const liveChange = (sym: string) => {
    if (finnhubQuotes[sym]?.change !== undefined) return finnhubQuotes[sym].change;
    if (alphaQuotes[sym]?.change !== undefined) return alphaQuotes[sym].change;
    if (prices[sym]?.change_24h !== undefined) return prices[sym].change_24h;
    return 0;
  };

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryMs = 2000;
    const alphaKey = process.env.NEXT_PUBLIC_ALPHA_KEY;
    const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_KEY;
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

  // Alpha Vantage fallback for key US tickers (AMD, TSLA, AAPL, NVDA, AMZN, MSFT)
  useEffect(() => {
    const alphaKey = process.env.NEXT_PUBLIC_ALPHA_KEY;
    if (!alphaKey) return;
    const symbols = ["AMD", "TSLA", "AAPL", "NVDA", "AMZN", "MSFT"];
    let cancelled = false;

    const fetchQuote = async (sym: string) => {
      try {
        const res = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${alphaKey}`,
        );
        const data = await res.json();
        const q = data?.["Global Quote"];
        if (!q) return null;
        const price = parseFloat(q["05. price"]) || 0;
        const change = parseFloat(q["10. change percent"]) || 0;
        const volume = q["06. volume"] ? Number(q["06. volume"]).toLocaleString() : "—";
        return { sym, price, change, volume };
      } catch {
        return null;
      }
    };

    const load = async () => {
      const results = await Promise.all(symbols.map(fetchQuote));
      if (cancelled) return;
      const next: Record<string, { price: number; change: number; volume?: string }> = {};
      results.forEach((r) => {
        if (r) next[r.sym] = { price: r.price, change: r.change, volume: r.volume };
      });
      if (Object.keys(next).length > 0) setAlphaQuotes(next);
    };
    load();
    const timer = setInterval(load, 60_000); // refresh every minute
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Finnhub quote fallback for TSLA + major indices
  useEffect(() => {
    const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_KEY;
    if (!finnhubKey) return;
    const symbols = ["TSLA", "SPX", "NDX", "DJI"];
    let cancelled = false;

    const fetchFinnhub = async (sym: string) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${finnhubKey}`,
        );
        if (!res.ok) return null;
        const data = await res.json();
        const price = typeof data?.c === "number" ? data.c : 0;
        const change = typeof data?.dp === "number" ? data.dp : 0;
        return { sym, price, change };
      } catch {
        return null;
      }
    };

    const load = async () => {
      const results = await Promise.all(symbols.map(fetchFinnhub));
      if (cancelled) return;
      const next: Record<string, { price: number; change: number }> = {};
      results.forEach((r) => {
        if (r) next[r.sym] = { price: r.price, change: r.change };
      });
      if (Object.keys(next).length > 0) setFinnhubQuotes(next);
    };
    load();
    const timer = setInterval(load, 45_000); // refresh every 45s
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const heroData = useMemo(() => {
    const list = featuredMap[active] ?? [];
    return list.map((item) => {
      return {
        ...item,
        price: livePrice(item.symbol, true),
        change: liveChange(item.symbol),
        spark: mockSpark(livePrice(item.symbol, true) || 100),
      };
    });
  }, [active, prices, alphaQuotes, finnhubQuotes]);

  const topTableRows = (symbols: { symbol: string; name?: string }[]): TableRow[] =>
    symbols.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      price:
        finnhubQuotes[s.symbol]?.price ??
        alphaQuotes[s.symbol]?.price ??
        prices[s.symbol]?.price ??
        baseStockPrices[s.symbol] ??
        0,
      change: finnhubQuotes[s.symbol]?.change ?? alphaQuotes[s.symbol]?.change ?? prices[s.symbol]?.change_24h ?? 0,
      volume: alphaQuotes[s.symbol]?.volume ?? mockVolumes[s.symbol] ?? "—",
    }));

  const changeColor = (v: number) => (v >= 0 ? "text-emerald-300" : "text-rose-300");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Markets</p>
            <h1 className="text-3xl font-semibold text-slate-50">Markets, everywhere</h1>
            <p className="text-sm text-slate-400">
              Indices, stocks, crypto, futures, FX — all in one place.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span
              className={`h-2 w-2 rounded-full ${
                status === "open" ? "bg-emerald-400" : status === "connecting" ? "bg-amber-400" : "bg-rose-400"
              }`}
            />
            <span>Live</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-slate-300">
              Last update: {lastUpdated || "—"}
            </span>
          </div>
        </header>

        <MarketCategoryNav
          categories={categories as unknown as string[]}
          active={active}
          onSelect={(c) => {
            setActive(c as (typeof categories)[number]);
            const el = sectionsRef.current[c];
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />

        {/* Featured strip */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/40">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-slate-900/70 p-4">
              <p className="text-sm font-semibold text-slate-50">
                {heroData[0]?.symbol ?? "—"} • {heroData[0]?.name ?? "Featured"}
              </p>
              <p className="text-3xl font-semibold text-slate-50">
                {heroData[0]?.price ? heroData[0].price.toLocaleString() : "—"}
              </p>
              <p className={`text-sm ${changeColor(heroData[0]?.change ?? 0)}`}>
                {heroData[0]?.change >= 0 ? "▲" : "▼"} {Math.abs(heroData[0]?.change ?? 0).toFixed(2)}%
              </p>
              <div className="mt-3 h-32 rounded-xl border border-white/5 bg-slate-950/40">
                {heroData[0]?.spark && (
                  <MarketSparkline
                    data={heroData[0].spark.map((s) => ({ time: s.time, value: s.value }))}
                    height={120}
                    color={heroData[0].change >= 0 ? "#22c55e" : "#ef4444"}
                  />
                )}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {heroData.slice(1, 5).map((h) => (
                <MarketPillCard
                  key={h.symbol}
                  symbol={h.symbol}
                  name={h.name}
                  value={h.price ? h.price.toLocaleString() : "—"}
                  change={h.change ?? 0}
                  spark={h.spark}
                  href={`/asset/${h.symbol}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Indices */}
        <section ref={(el) => (sectionsRef.current["Indices"] = el)} className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">Indices</h2>
            <p className="text-xs text-slate-400">Major + world indices</p>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">World indices</p>
              <a href="#world-indices" className="text-xs text-emerald-300 hover:underline">
                View all →
              </a>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {worldIndices.map((w) => (
                <MarketTileCard
                  key={w.symbol}
                  symbol={w.symbol}
                  name={w.name}
                  value={w.price.toLocaleString()}
                  change={w.change}
                  spark={mockSpark(w.price)}
                  href={`/asset/${w.symbol}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* US stocks */}
        <section ref={(el) => (sectionsRef.current["US stocks"] = el)} className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">US stocks</h2>
            <a href="/stocks" className="text-xs text-emerald-300 hover:underline">
              View all US stocks →
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredMap["US stocks"].map((s) => (
              <MarketPillCard
                key={s.symbol}
                symbol={s.symbol}
                name={s.name}
                value={formatPrice(livePrice(s.symbol))}
                change={liveChange(s.symbol)}
                spark={mockSpark(livePrice(s.symbol) || 100)}
                href={`/asset/${s.symbol}`}
              />
            ))}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-200">Community trends</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {["AMD", "AMZN", "TSLA", "AAPL"].map((s) => (
                  <MarketTileCard
                    key={s}
                    symbol={s}
                    name={s}
                    value={formatPrice(livePrice(s))}
                    change={liveChange(s)}
                    spark={mockSpark(livePrice(s) || 100)}
                    href={`/asset/${s}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-200">Highest volume</p>
              <MarketTable
                rows={topTableRows(featuredMap["US stocks"]).map((r) => ({
                  ...r,
                  volume: mockVolumes[r.symbol] ?? "—",
                }))}
                label="Volume leaders"
                sortable={["change"]}
                hideVolume={false}
              />
            </div>
          </div>
        </section>

        {/* World stocks */}
        <section
          ref={(el) => (sectionsRef.current["World stocks"] = el)}
          className="mb-10"
          id="world-indices"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">World stocks</h2>
            <p className="text-xs text-slate-400">Regional highlights (mocked)</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["Europe", "Asia", "Americas"].map((r) => (
              <span
                key={r}
                className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300"
              >
                {r}
              </span>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {worldIndices.map((w) => (
              <MarketTileCard
                key={w.symbol}
                symbol={w.symbol}
                name={w.name}
                value={w.price.toLocaleString()}
                change={w.change}
                spark={mockSpark(w.price)}
                href={`/asset/${w.symbol}`}
              />
            ))}
          </div>
          <div className="mt-4">
            <MarketTable
              label="World biggest companies (mock)"
              rows={worldIndices.map((w) => ({
                symbol: w.symbol,
                name: w.name,
                price: w.price,
                change: w.change,
                volume: "Cap: mock",
              }))}
              sortable={["change"]}
            />
          </div>
        </section>

        {/* Crypto */}
        <section ref={(el) => (sectionsRef.current["Crypto"] = el)} className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">Crypto</h2>
            <p className="text-xs text-slate-400">Top coins with live prices</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredMap.Crypto.map((c) => (
              <MarketPillCard
                key={c.symbol}
                symbol={c.symbol}
                name={c.name}
                value={prices[c.symbol]?.price?.toLocaleString() ?? "—"}
                change={prices[c.symbol]?.change_24h ?? 0}
                spark={mockSpark(prices[c.symbol]?.price || 100)}
                href={`/asset/${c.symbol}`}
              />
            ))}
          </div>
          <div className="mt-4">
            <MarketTable
              label="Top crypto (mock volume)"
              rows={featuredMap.Crypto.map((c) => ({
                symbol: c.symbol,
                name: c.name,
                price: prices[c.symbol]?.price ?? 0,
                change: prices[c.symbol]?.change_24h ?? 0,
                volume: "TODO",
              }))}
              sortable={["change"]}
            />
          </div>
        </section>

        {/* Futures */}
        <section ref={(el) => (sectionsRef.current["Futures"] = el)} className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">Futures</h2>
            <p className="text-xs text-slate-400">Energy & metals (mock)</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["CL", "NG", "GC", "HG"].map((s) => (
              <MarketTileCard
                key={s}
                symbol={s}
                name={s}
                value={prices[s]?.price?.toLocaleString() ?? "—"}
                change={prices[s]?.change_24h ?? 0}
                spark={mockSpark(prices[s]?.price || 100)}
                href={`/asset/${s}`}
              />
            ))}
          </div>
        </section>

        {/* Forex */}
        <section ref={(el) => (sectionsRef.current["Forex"] = el)} className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">Forex</h2>
            <p className="text-xs text-slate-400">Top pairs (mock)</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredMap.Forex.map((f) => (
              <MarketTileCard
                key={f.symbol}
                symbol={f.symbol}
                name={f.name}
                value={prices[f.symbol]?.price?.toLocaleString() ?? "—"}
                change={prices[f.symbol]?.change_24h ?? 0}
                spark={mockSpark(prices[f.symbol]?.price || 100)}
                href={`/asset/${f.symbol}`}
              />
            ))}
          </div>
        </section>

        {/* Placeholders */}
        {["Government bonds", "Corporate bonds", "ETFs", "Economy"].map((sec) => (
          <section key={sec} ref={(el) => (sectionsRef.current[sec] = el)} className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-50">{sec}</h2>
              <span className="text-xs text-slate-400">TODO: hook real data</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
              Placeholder cards/tables for {sec}. Add data when available.
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
