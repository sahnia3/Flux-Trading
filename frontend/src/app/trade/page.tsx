"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuickSize } from "@/components/QuickSize";

type Snapshot = Record<string, { price: number; change_24h: number; updated_at: string }>;
type Holding = { symbol: string; quantity: number; average_buy_price: number };
type Portfolio = { balance: number; currency: string; holdings: Holding[] };
type SymbolItem = { symbol: string; description: string };

const wsUrl =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/^http/, "ws") ??
  "ws://localhost:8080/ws/prices";
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function TradePage() {
  const [prices, setPrices] = useState<Snapshot>({});
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [token, setToken] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [message, setMessage] = useState("");
  const [symbol, setSymbol] = useState("BTC");
  const [qty, setQty] = useState(0.01);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [symbolQuery, setSymbolQuery] = useState("");
  const [symbolResults, setSymbolResults] = useState<SymbolItem[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("flux_token");
    if (stored && !token) {
      setToken(stored);
    }
  }, [token]);

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
        setPrices(payload);
      };
    };
    connect();
    return () => socket?.close();
  }, []);

  const api = useCallback(
    async (path: string, opts: RequestInit = {}) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(opts.headers as Record<string, string> | undefined),
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${apiBase}${path}`, { ...opts, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Request failed");
      }
      return res.json();
    },
    [token],
  );

  const fetchPortfolio = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api("/portfolio", { method: "GET" });
      setPortfolio(res as Portfolio);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed");
    }
  }, [api, token]);

  useEffect(() => {
    void fetchPortfolio();
  }, [fetchPortfolio]);

  const holdings = portfolio?.holdings ?? [];
  const livePrice = prices[symbol]?.price ?? 0;

  // Fallback price fetch for symbols not in WS snapshot
  const [fallbackPrice, setFallbackPrice] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (prices[symbol]) {
        setFallbackPrice(null);
        return;
      }
      try {
        const now = Math.floor(Date.now() / 1000);
        const from = now - 24 * 60 * 60;
        const res = await fetch(
          `${apiBase}/api/market-data/${symbol}/D?from=${from}&to=${now}`,
        );
        if (!res.ok) throw new Error("no data");
        const data = await res.json();
        if (active && Array.isArray(data) && data.length > 0) {
          const last = data[data.length - 1];
          setFallbackPrice(Number(last.close));
        }
      } catch {
        if (active) setFallbackPrice(null);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [symbol, prices]);

  const effectivePrice = livePrice || fallbackPrice || 0;

  const setFromFraction = (fraction: number) => {
    if (side === "buy") {
      const bal = portfolio?.balance ?? 0;
      if (effectivePrice > 0) setQty(Math.max((bal / effectivePrice) * fraction, 0.0001));
    } else {
      const h = holdings.find((h) => h.symbol === symbol);
      const q = h?.quantity ?? 0;
      setQty(q * fraction);
    }
  };

  const submit = async () => {
    try {
      if (effectivePrice <= 0) {
        setMessage("No live price for this symbol");
        return;
      }
      await api(`/trade/${side}`, {
        method: "POST",
        body: JSON.stringify({ symbol, quantity: qty, price: effectivePrice }),
      });
      setMessage(`${side.toUpperCase()} executed`);
      await fetchPortfolio();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed");
    }
  };

  const formattedPrices = useMemo(
    () =>
      Object.entries(prices)
        .map(([symbol, data]) => ({ symbol, ...data }))
        .sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [prices],
  );

  // Symbol search across US universe (cached on backend)
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      if (!symbolQuery) {
        setSymbolResults([]);
        return;
      }
      try {
        const res = await fetch(
          `${apiBase}/api/symbols?q=${encodeURIComponent(symbolQuery)}`,
        );
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as SymbolItem[];
        setSymbolResults(data.slice(0, 10));
      } catch {
        setSymbolResults([]);
      }
    }, 250);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [symbolQuery]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between text-sm">
          <Link href="/" className="text-emerald-300 hover:underline">
            ← Back to dashboard
          </Link>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
            {status === "open" ? "Live" : status}
          </span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/30 p-6 shadow-2xl shadow-black/50">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Trade</p>
          <h1 className="text-2xl font-semibold text-slate-50">Place simulated orders</h1>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-3 text-sm">
              <label className="text-slate-300">Side</label>
              <div className="flex gap-2">
                <button
                  className={`flex-1 rounded-lg px-3 py-2 ${side === "buy" ? "bg-emerald-500 text-emerald-900" : "bg-slate-800 text-slate-200"}`}
                  onClick={() => setSide("buy")}
                >
                  Buy
                </button>
                <button
                  className={`flex-1 rounded-lg px-3 py-2 ${side === "sell" ? "bg-rose-500 text-rose-50" : "bg-slate-800 text-slate-200"}`}
                  onClick={() => setSide("sell")}
                >
                  Sell
                </button>
              </div>
              <label className="text-slate-300">Symbol (stocks or crypto)</label>
              <div className="space-y-2">
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                  value={symbolQuery}
                  placeholder="Type to search (e.g., AAPL, MSFT, BTC)"
                  onChange={(e) => setSymbolQuery(e.target.value)}
                  onFocus={() => {
                    if (!symbolQuery) setSymbolResults(formattedPrices.map((p) => ({ symbol: p.symbol, description: "" })).slice(0, 8));
                  }}
                />
                <div className="space-y-1">
                  {(symbolResults.length > 0 ? symbolResults : formattedPrices.slice(0, 8) as any[]).map(
                    (s) => (
                      <button
                        key={s.symbol}
                        type="button"
                        onClick={() => {
                          setSymbol(s.symbol);
                          setSymbolQuery(s.symbol);
                          setSymbolResults([]);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-left text-sm transition hover:border-emerald-400/60 ${symbol === s.symbol
                          ? "bg-emerald-500/15 text-emerald-100"
                          : "bg-slate-900/60 text-slate-100"
                          }`}
                      >
                        <span className="font-semibold">{s.symbol}</span>
                        {s.description && (
                          <span className="truncate text-xs text-slate-400">
                            {s.description}
                          </span>
                        )}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <label className="text-slate-300">Quantity</label>
              <input
                type="number"
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
              <QuickSize onSelect={setFromFraction} disabled={!token || livePrice <= 0} />
              <label className="text-slate-300">Price (live)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                value={effectivePrice}
                readOnly
              />
              <button
                className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-400 disabled:opacity-50"
                onClick={submit}
                disabled={!token}
              >
                Submit {side === "buy" ? "Buy" : "Sell"}
              </button>
              {message && <p className="text-xs text-slate-300">{message}</p>}
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Wallet
              </p>
              <div className="mt-2 text-3xl font-semibold text-slate-50">
                {portfolio
                  ? `$${portfolio.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : "—"}
              </div>
              <p className="mt-1 text-xs text-slate-400">Token required to trade.</p>
              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <p>Holdings preview:</p>
                {(holdings || []).slice(0, 4).map((h) => (
                  <div key={h.symbol} className="flex justify-between border-b border-white/5 py-1">
                    <span>{h.symbol}</span>
                    <span>
                      {h.quantity} @ ${h.average_buy_price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
