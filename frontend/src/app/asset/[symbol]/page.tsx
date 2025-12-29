 "use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function AssetPage() {
  const { symbol: rawSymbol } = useParams<{ symbol: string }>();
  const symbol = rawSymbol?.toUpperCase?.() ?? "";
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [status, setStatus] = useState<"connecting" | "open" | "closed">(
    "connecting",
  );

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

  const up = (ticker?.change_24h ?? 0) >= 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Asset Detail
            </p>
            <h1 className="text-3xl font-semibold text-slate-50">{symbol}</h1>
            <p className="text-sm text-slate-400">
              Live via WebSocket · Status: {status}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-emerald-400"
          >
            ← Back to dashboard
          </Link>
        </header>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/30 p-6 shadow-2xl shadow-black/50">
          {ticker ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Last price</p>
                  <div className="text-4xl font-semibold text-slate-50">
                    ${ticker.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <span
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    up
                      ? "bg-emerald-500/15 text-emerald-200"
                      : "bg-rose-500/15 text-rose-200"
                  }`}
                >
                  {up ? "▲" : "▼"} {ticker.change_24h.toFixed(2)}%
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Updated: {new Date(ticker.updated_at).toLocaleTimeString()}
              </p>
            </>
          ) : (
            <p className="text-slate-300">Waiting for live data…</p>
          )}
        </div>
      </div>
    </main>
  );
}
