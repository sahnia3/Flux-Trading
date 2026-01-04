"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TradeModal } from "@/components/TradeModal";

type Snapshot = Record<string, { price: number; change_24h: number; updated_at: string }>;
type Holding = { symbol: string; quantity: number; average_buy_price: number };
type Portfolio = { balance: number; currency: string; holdings: Holding[] };
type Enriched = Holding & {
  price: number;
  value: number;
  pnl: number;
  pnlPct: number;
};

const wsUrl =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/^http/, "ws") ?? "ws://localhost:8080/ws/prices";
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function HoldingsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [prices, setPrices] = useState<Snapshot>({});
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "gainers" | "losers">("all");
  const [sort, setSort] = useState<"value" | "pnl">("value");
  const [tradeConfig, setTradeConfig] = useState<{ open: boolean; symbol: string; side: "buy" | "sell" }>({
    open: false,
    symbol: "",
    side: "buy",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("flux_token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry = 2000;
    const connect = () => {
      setStatus("connecting");
      socket = new WebSocket(wsUrl);
      socket.onopen = () => setStatus("open");
      socket.onclose = () => {
        setStatus("closed");
        setTimeout(connect, retry);
        retry = Math.min(retry * 2, 10000);
      };
      socket.onerror = () => {
        setStatus("closed");
        socket?.close();
      };
      socket.onmessage = (e) => {
        const payload = JSON.parse(e.data) as Snapshot;
        setPrices((prev) => ({ ...prev, ...payload }));
      };
    };
    connect();
    return () => socket?.close();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${apiBase}/portfolio`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as Portfolio;
        setPortfolio(data);
      } catch {
        setMessage("Failed to load portfolio");
      }
    };
    void load();
  }, [token]);

  // Fetch missing prices for symbols not in WebSocket
  useEffect(() => {
    const fetchMissingPrices = async () => {
      if (!portfolio?.holdings) return;

      const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_KEY;
      const cryptoMap: Record<string, string> = {
        'BTC': 'bitcoin', 'ETH': 'ethereum', 'XRP': 'ripple',
        'ADA': 'cardano', 'SOL': 'solana', 'DOGE': 'dogecoin',
        'META': '', 'AMD': '', 'NVDA': '', 'GOOGL': '', 'MSFT': '',
        'AAPL': '', 'TSLA': '', 'AMZN': '', 'KOLD': ''
      };

      const missingSymbols = portfolio.holdings
        .filter(h => !prices[h.symbol] || prices[h.symbol].price === 0)
        .map(h => h.symbol);

      if (missingSymbols.length === 0) return;

      const newPrices: Snapshot = { ...prices };

      for (const sym of missingSymbols) {
        try {
          // Try Finnhub for stocks
          if (finnhubKey && !cryptoMap[sym]) {
            const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${finnhubKey}`);
            if (res.ok) {
              const data = await res.json();
              if (data.c > 0) {
                newPrices[sym] = { price: data.c, change_24h: data.dp || 0, updated_at: new Date().toISOString() };
                continue;
              }
            }
          }

          // Try CoinGecko for crypto
          const cgId = cryptoMap[sym];
          if (cgId) {
            const cgRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true`);
            if (cgRes.ok) {
              const cgData = await cgRes.json();
              if (cgData[cgId]?.usd) {
                newPrices[sym] = {
                  price: cgData[cgId].usd,
                  change_24h: cgData[cgId].usd_24h_change || 0,
                  updated_at: new Date().toISOString()
                };
              }
            }
          }

          // For stocks in cryptoMap that have empty string (not crypto)
          if (cryptoMap[sym] === '' && finnhubKey) {
            const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${finnhubKey}`);
            if (res.ok) {
              const data = await res.json();
              if (data.c > 0) {
                newPrices[sym] = { price: data.c, change_24h: data.dp || 0, updated_at: new Date().toISOString() };
              }
            }
          }
        } catch {
          // Ignore errors for individual symbols
        }
      }

      setPrices(newPrices);
    };

    // Run after a small delay to let WebSocket populate first
    const timer = setTimeout(fetchMissingPrices, 2000);
    return () => clearTimeout(timer);
  }, [portfolio?.holdings, prices]);

  const rows = useMemo<Enriched[]>(() => {
    const holdings = portfolio?.holdings ?? [];
    return holdings.map((h) => {
      const price = prices[h.symbol]?.price ?? 0;
      const value = price * h.quantity;
      const cost = h.average_buy_price * h.quantity;
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      return { ...h, price, value, pnl, pnlPct };
    });
  }, [portfolio?.holdings, prices]);

  const filtered = useMemo(() => {
    let data = rows;
    if (filter === "gainers") data = data.filter((r) => r.pnl > 0);
    if (filter === "losers") data = data.filter((r) => r.pnl < 0);
    data = [...data].sort((a, b) =>
      sort === "value" ? b.value - a.value : Math.abs(b.pnl) - Math.abs(a.pnl),
    );
    return data;
  }, [filter, rows, sort]);

  const totals = useMemo(() => {
    const val = rows.reduce((sum, r) => sum + r.value, 0);
    const cost = rows.reduce((sum, r) => sum + r.average_buy_price * r.quantity, 0);
    const pnl = val - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    return { val, pnl, pnlPct };
  }, [rows]);

  const changeColor = (v: number) => (v >= 0 ? "text-emerald-300" : "text-rose-300");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Portfolio</p>
            <h1 className="text-3xl font-semibold text-slate-50">Holdings overview</h1>
            <p className="text-sm text-slate-400">
              Live valuation via WebSocket. Token is session-based per tab.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-emerald-400"
          >
            ← Back home
          </Link>
        </div>

        <div className="mb-4 flex items-center gap-2 text-xs text-slate-300">
          <span
            className={`h-2 w-2 rounded-full ${status === "open" ? "bg-emerald-400" : status === "connecting" ? "bg-amber-400" : "bg-rose-400"
              }`}
          />
          {status === "open" ? "Live" : status}
        </div>

        {/* Summary bar */}
        <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm shadow-xl shadow-black/40 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Portfolio value</p>
            <p className="mt-1 text-2xl font-semibold text-slate-50">
              ${totals.val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">PnL</p>
            <p className={`mt-1 text-2xl font-semibold ${changeColor(totals.pnl)}`}>
              ${totals.pnl.toFixed(2)} ({totals.pnlPct.toFixed(2)}%)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
            >
              <option value="all">All</option>
              <option value="gainers">Gainers</option>
              <option value="losers">Losers</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
            >
              <option value="value">Sort by value</option>
              <option value="pnl">Sort by PnL</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/40">
          <div className="grid grid-cols-7 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
            <span>Symbol</span>
            <span>Qty</span>
            <span>Avg</span>
            <span>Last</span>
            <span>Value</span>
            <span>PnL</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-white/5">
            {filtered.map((r) => (
              <div
                key={r.symbol}
                className="grid grid-cols-7 items-center px-4 py-3 text-sm text-slate-100"
              >
                <span className="font-semibold">{r.symbol}</span>
                <span>{r.quantity}</span>
                <span>${r.average_buy_price.toFixed(2)}</span>
                <span>${r.price ? r.price.toFixed(2) : "—"}</span>
                <span>${r.value ? r.value.toFixed(2) : "—"}</span>
                <span className={changeColor(r.pnl)}>
                  ${r.pnl.toFixed(2)} ({r.pnlPct.toFixed(2)}%)
                </span>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setTradeConfig({ open: true, symbol: r.symbol, side: "buy" })}
                    className="rounded bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTradeConfig({ open: true, symbol: r.symbol, side: "sell" })}
                    className="rounded bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
                  >
                    Sell
                  </button>
                </div>
              </div>
            ))}
            {!rows.length && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                {message || "No holdings yet."}
              </div>
            )}
          </div>
        </div>

        <TradeModal
          isOpen={tradeConfig.open}
          onClose={() => setTradeConfig((prev) => ({ ...prev, open: false }))}
          initialSymbol={tradeConfig.symbol}
          initialSide={tradeConfig.side}
        />
      </div>
    </main>
  );
}
