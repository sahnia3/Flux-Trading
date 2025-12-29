"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  "ws://localhost:8081/ws/prices";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

export default function Home() {
  const [prices, setPrices] = useState<Snapshot>({});
  const [status, setStatus] = useState<"connecting" | "open" | "closed">(
    "connecting",
  );
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [topUpAmount, setTopUpAmount] = useState(1000);
  const [tradeSymbol, setTradeSymbol] = useState("BTC");
  const [tradeQty, setTradeQty] = useState(0.01);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [message, setMessage] = useState("");
  const [holdingsView, setHoldingsView] = useState<"qty" | "value">("qty");

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
  }, [tradeSymbol]);

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

  const handleAuth = async () => {
    try {
      const endpoint = authMode === "login" ? "/login" : "/register";
      const res = await api(endpoint, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const t = res.token as string;
      setToken(t);
      localStorage.setItem("flux_token", t);
      setMessage("Authenticated!");
      await fetchPortfolio();
    } catch (err) {
      setMessage(getErrorMessage(err));
    }
  };

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

  const handleTrade = async (side: "buy" | "sell") => {
    try {
      const priceToUse = prices[tradeSymbol]?.price ?? 0;
      if (priceToUse <= 0) {
        setMessage("No live price available for this symbol");
        return;
      }
      await api(`/trade/${side}`, {
        method: "POST",
        body: JSON.stringify({
          symbol: tradeSymbol,
          quantity: tradeQty,
          price: priceToUse,
        }),
      });
      setMessage(`${side.toUpperCase()} executed`);
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
          </div>
        </header>

        {/* Auth + Wallet */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-5 shadow-lg shadow-black/40">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Auth
            </p>
            <div className="mt-3 flex gap-2 text-sm">
              <button
                className={`rounded-lg px-3 py-1 ${
                  authMode === "login"
                    ? "bg-emerald-500 text-emerald-900"
                    : "bg-slate-800 text-slate-200"
                }`}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                className={`rounded-lg px-3 py-1 ${
                  authMode === "register"
                    ? "bg-emerald-500 text-emerald-900"
                    : "bg-slate-800 text-slate-200"
                }`}
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                placeholder="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                placeholder="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-400"
                onClick={handleAuth}
              >
                {authMode === "login" ? "Login" : "Register"}
              </button>
              {token && (
                <p className="text-xs text-emerald-300">
                  Token stored. Dashboard unlocked.
                </p>
              )}
            </div>
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
                className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-400"
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
            <div className="mt-3 space-y-2 text-sm">
              <label className="text-slate-300">Symbol</label>
              <select
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                value={tradeSymbol}
                onChange={(e) => setTradeSymbol(e.target.value)}
              >
                {formattedPrices.map((p) => (
                  <option key={p.symbol} value={p.symbol}>
                    {p.symbol} {isStock(p.symbol) ? "(Stock)" : "(Crypto)"}
                  </option>
                ))}
              </select>
              <label className="text-slate-300">Quantity</label>
              <input
                type="number"
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                value={tradeQty}
                onChange={(e) => setTradeQty(Number(e.target.value))}
              />
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-400"
                  onClick={() => {
                    const price = livePrice(tradeSymbol);
                    const bal = portfolio?.balance ?? 0;
                    if (price > 0) setTradeQty(Math.max((bal / price) * 0.25, 0.0001));
                  }}
                  disabled={!token}
                >
                  Buy 1/4
                </button>
                <button
                  className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-400"
                  onClick={() => {
                    const price = livePrice(tradeSymbol);
                    const bal = portfolio?.balance ?? 0;
                    if (price > 0) setTradeQty(Math.max((bal / price) * 0.5, 0.0001));
                  }}
                  disabled={!token}
                >
                  Buy 1/2
                </button>
                <button
                  className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-200 hover:border-rose-400"
                  onClick={() => {
                    const qty = holdings.find((h) => h.symbol === tradeSymbol)?.quantity ?? 0;
                    if (qty > 0) setTradeQty(qty * 0.5);
                  }}
                  disabled={!token}
                >
                  Sell 1/2
                </button>
                <button
                  className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-200 hover:border-rose-400"
                  onClick={() => {
                    const qty = holdings.find((h) => h.symbol === tradeSymbol)?.quantity ?? 0;
                    if (qty > 0) setTradeQty(qty);
                  }}
                  disabled={!token}
                >
                  Sell Max
                </button>
              </div>
              <label className="text-slate-300">
                Price (live only)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                value={prices[tradeSymbol]?.price ?? 0}
                readOnly
              />
              <div className="flex gap-2">
                <button
                  className="w-1/2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-400 disabled:opacity-50"
                  onClick={() => handleTrade("buy")}
                  disabled={!token}
                >
                  Buy
                </button>
                <button
                  className="w-1/2 rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-rose-50 hover:bg-rose-400 disabled:opacity-50"
                  onClick={() => handleTrade("sell")}
                  disabled={!token}
                >
                  Sell
                </button>
              </div>
            </div>
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
    </main>
  );
}
