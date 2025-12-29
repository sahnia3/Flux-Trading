"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HoldingsModal } from "@/components/HoldingsModal";
import { LearnSidebar } from "@/components/LearnSidebar";

type Ticker = {
  symbol: string;
  price: number;
  change_24h: number;
  updated_at: string;
};

type Snapshot = Record<string, Ticker>;

type Holding = {
  symbol: string;
  quantity: number;
  average_buy_price: number;
};

type Portfolio = {
  balance: number;
  currency: string;
  holdings: Holding[];
};

const wsUrl =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/^http/, "ws") ??
  "ws://localhost:8080/ws/prices";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function Home() {
  const [prices, setPrices] = useState<Snapshot>({});
  const [status, setStatus] = useState<"connecting" | "open" | "closed">(
    "connecting",
  );
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [topUpAmount, setTopUpAmount] = useState(1000);
  const [message, setMessage] = useState("");
  const [holdingsView, setHoldingsView] = useState<"qty" | "value">("qty");
  const [showHoldingsModal, setShowHoldingsModal] = useState(false);
  const [showLearn, setShowLearn] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0); // 0 = hidden

  // Load token after hydration to avoid SSR/CSR mismatch.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("flux_token");
    if (stored && !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(stored);
    }
  }, [token]);

  // WebSocket connection for prices
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryMs = 2000;

    const connect = () => {
      setStatus("connecting");
      socket = new WebSocket(wsUrl);
      socket.onopen = () => {
        setStatus("open");
      };
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

    return () => {
      socket?.close();
    };
  }, []);

  const formattedPrices = useMemo(() => {
    return Object.values(prices).sort((a, b) =>
      a.symbol.localeCompare(b.symbol),
    );
  }, [prices]);

  const isStock = (sym: string) =>
    ["BTC", "ETH", "SOL"].indexOf(sym) === -1;

  const livePrice = (sym: string) => prices[sym]?.price ?? 0;
  const computePnL = (h: Holding) => {
    const cp = livePrice(h.symbol);
    const value = cp * h.quantity;
    const cost = h.average_buy_price * h.quantity;
    return { value, pnl: value - cost };
  };

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

  const getErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : "Request failed";

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await api("/portfolio", { method: "GET" });
      setPortfolio(res as Portfolio);
      setMessage("");
    } catch (err) {
      setMessage(getErrorMessage(err));
    }
  }, [api]);

  // Fetch portfolio when token changes
  useEffect(() => {
    if (!token) return;
    void (async () => {
      await fetchPortfolio();
    })();
  }, [token, fetchPortfolio]);

  const handleTopUp = async () => {
    try {
      await api("/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ amount: topUpAmount }),
      });
      setMessage("Top-up successful");
      await fetchPortfolio();
    } catch (err) {
      setMessage(getErrorMessage(err));
    }
  };

  const holdings = portfolio?.holdings ?? [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Tutorial overlay */}
      {tutorialStep > 0 && tutorialStep < 4 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="max-w-lg rounded-2xl bg-slate-900 p-6 shadow-2xl shadow-black/60">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Guided Onboarding
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-50">
              {tutorialStep === 1 && "Step 1: Authenticate"}
              {tutorialStep === 2 && "Step 2: Top up your wallet"}
              {tutorialStep === 3 && "Step 3: Place a trade"}
            </h2>
            <p className="mt-2 text-slate-300">
              {tutorialStep === 1 &&
                "Register or log in to get your JWT. This unlocks your dashboard."}
              {tutorialStep === 2 &&
                "Add fake USD to your wallet. No real payments involved."}
              {tutorialStep === 3 &&
                "Use the price cards or trade panel to buy/sell simulated assets."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              {tutorialStep > 1 && (
                <button
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 hover:border-white/40"
                  onClick={() => setTutorialStep((s) => s - 1)}
                >
                  Back
                </button>
              )}
              <button
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-400"
                onClick={() =>
                  setTutorialStep((s) => (s >= 3 ? 0 : s + 1))
                }
              >
                {tutorialStep >= 3 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Flux Trading
            </p>
            <h1 className="text-3xl font-semibold text-slate-50">
              Paper Trading Simulator
            </h1>
            <p className="text-sm text-slate-400">
              Crypto + NYSE stocks · JWT-protected · Live prices via WebSocket.
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
              {status === "open"
                ? "Live"
                : status === "connecting"
                  ? "Connecting"
                  : "Reconnecting"}
            </div>
            <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 backdrop-blur">
              Live symbols: {formattedPrices.length}
            </div>
            <button
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:border-emerald-400"
              onClick={() => setShowLearn(true)}
            >
              Learn
            </button>
          </div>
        </header>

        {/* Market shortcuts */}
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <Link
            href="/stocks"
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-800/40 p-5 shadow-xl shadow-black/40 transition hover:-translate-y-0.5 hover:border-emerald-400/70"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Explore</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-50">US Stocks Universe</h3>
            <p className="mt-1 text-sm text-slate-300">
              Browse every listed US stock, view company info, and jump into detail pages.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
              View all stocks →
            </div>
          </Link>
          <Link
            href="/"
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-800/40 p-5 shadow-xl shadow-black/40 transition hover:-translate-y-0.5 hover:border-emerald-400/70"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live Crypto</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-50">Crypto board</h3>
            <p className="mt-1 text-sm text-slate-300">
              Track BTC, ETH, SOL in real time. Use the cards below or trade panel to simulate moves.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              Live feed ↓
            </div>
          </Link>
        </div>

        {/* CTA + Wallet */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-5 shadow-lg shadow-black/40">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Auth
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Manage your account and secure JWT session.
            </p>
            <Link
              href="/auth"
              className="mt-4 inline-block w-full rounded-lg bg-emerald-500 px-3 py-2 text-center text-sm font-semibold text-emerald-900 hover:bg-emerald-400"
            >
              Go to Login / Register
            </Link>
          </div>

          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-900/40 p-5 shadow-2xl shadow-black/50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Wallet
            </p>
            <div className="mt-3 text-3xl font-semibold text-slate-50">
              {portfolio
                ? `$${portfolio.balance.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })} ${portfolio.currency}`
                : "—"}
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <label className="text-slate-300">Top up (fake USD)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(Number(e.target.value))}
              />
              <button
                className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-400 disabled:opacity-50"
                onClick={handleTopUp}
                disabled={!token}
              >
                Top Up
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-900/40 p-5 shadow-2xl shadow-black/50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Trade
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Place simulated orders with live prices for stocks and crypto.
            </p>
            <Link
              href="/trade"
              className="mt-4 inline-block w-full rounded-lg bg-emerald-500 px-3 py-2 text-center text-sm font-semibold text-emerald-900 hover:bg-emerald-400"
            >
              Go to Trade
            </Link>
          </div>
        </div>

        {/* Live prices */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {formattedPrices.length === 0 && (
            <div className="col-span-full rounded-xl border border-white/10 bg-slate-900/80 p-6 text-center text-slate-300">
              Waiting for first tick…
            </div>
          )}
          {formattedPrices.map((asset) => {
            const change = asset.change_24h ?? 0;
            const up = change >= 0;
            return (
              <div
                key={asset.symbol}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/30 p-6 shadow-2xl shadow-black/50"
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-50">
                    {asset.symbol} {isStock(asset.symbol) ? "· Stock" : "· Crypto"}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      up
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-rose-500/15 text-rose-200"
                    }`}
                  >
                    {up ? "▲" : "▼"} {change.toFixed(2)}%
                  </span>
                </div>
                <div className="mt-3 text-3xl font-semibold text-slate-50">
                  ${asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Updated: {new Date(asset.updated_at).toLocaleTimeString()}
                </p>
                <div className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">
                  Live Feed
                </div>
              </div>
            );
          })}
        </div>

        {/* Holdings */}
        <div className="mt-6 rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-900/30 p-5 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Holdings
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>View:</span>
              <button
                className={`rounded-full px-3 py-1 ${holdingsView === "qty" ? "bg-emerald-500 text-emerald-900" : "bg-slate-800 text-slate-200"}`}
                onClick={() => setHoldingsView("qty")}
              >
                Shares/Tokens
              </button>
              <button
                className={`rounded-full px-3 py-1 ${holdingsView === "value" ? "bg-emerald-500 text-emerald-900" : "bg-slate-800 text-slate-200"}`}
                onClick={() => setHoldingsView("value")}
              >
                Value & PnL
              </button>
              <button
                className="rounded-full border border-white/10 px-3 py-1 text-slate-200 hover:border-emerald-400"
                onClick={() => setShowHoldingsModal(true)}
              >
                Expand
              </button>
            </div>
          </div>
          {holdings.length === 0 ? (
            <p className="mt-3 text-sm text-slate-300">
              No holdings yet. Buy something to see it here.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {holdings.map((h) => {
                const { value, pnl } = computePnL(h);
                const changeUp = pnl >= 0;
                return (
                  <a
                    key={h.symbol}
                    href={`/asset/${h.symbol}`}
                    className="group overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 p-4 transition hover:-translate-y-0.5 hover:border-emerald-400/50 hover:shadow-emerald-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-50">
                          {h.symbol} {isStock(h.symbol) ? "· Stock" : "· Crypto"}
                        </p>
                        <p className="text-xs text-slate-400">
                          Avg ${h.average_buy_price.toFixed(2)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          changeUp
                            ? "bg-emerald-500/15 text-emerald-200"
                            : "bg-rose-500/15 text-rose-200"
                        }`}
                      >
                        {changeUp ? "▲" : "▼"} {pnl.toFixed(2)}
                      </span>
                    </div>
                    {holdingsView === "qty" ? (
                      <div className="mt-3 text-lg font-semibold text-slate-50">
                        {h.quantity} units
                      </div>
                    ) : (
                      <div className="mt-3 text-lg font-semibold text-slate-50">
                        ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} value
                      </div>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      Live @ ${livePrice(h.symbol).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <footer className="mt-6 text-xs text-slate-500">
          WebSocket: {wsUrl}
          {lastUpdated ? ` · Last tick: ${new Date(lastUpdated).toLocaleTimeString()}` : ""}
          {message ? ` · ${message}` : ""}
        </footer>
      </div>
      <HoldingsModal
        open={showHoldingsModal}
        onClose={() => setShowHoldingsModal(false)}
        holdings={holdings}
        prices={prices}
        onTrade={(sym) => {
          if (typeof window !== "undefined") window.location.href = `/trade?symbol=${sym}`;
        }}
      />
      <LearnSidebar open={showLearn} onClose={() => setShowLearn(false)} />
    </main>
  );
}
