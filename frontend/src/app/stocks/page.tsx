"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SymbolItem = {
  symbol: string;
  description: string;
  displaySymbol?: string;
  type?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function StocksPage() {
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${apiBase}/api/symbols${query ? `?q=${encodeURIComponent(query)}` : ""}`,
        );
        if (!res.ok) throw new Error("Failed to load symbols");
        const data = (await res.json()) as SymbolItem[];
        if (active) {
          // Normalize to lower noise
          setSymbols(
            data.map((d) => ({
              symbol: d.symbol,
              description: d.description,
              displaySymbol: d.displaySymbol,
              type: d.type,
            })),
          );
          setError(null);
        }
      } catch {
        if (active) setError("Could not load symbols (rate limit?)");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [query]);

  const visible = useMemo(
    () => symbols.slice(0, 300), // prevent rendering thousands at once
    [symbols],
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Market</p>
            <h1 className="text-3xl font-semibold text-slate-50">US Stocks Universe</h1>
            <p className="text-sm text-slate-400">
              Search across all US-listed symbols. Click to view live chart & details.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-emerald-400"
          >
            ← Back to dashboard
          </Link>
        </header>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol or company (e.g., AAPL or Apple)"
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none sm:max-w-md"
          />
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="rounded-full bg-white/5 px-3 py-1">
              Showing {visible.length} symbols
            </span>
            {loading && <span className="text-emerald-300">Loading…</span>}
            {error && <span className="text-rose-300">{error}</span>}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => {
            const logo = `https://storage.googleapis.com/iex/api/logos/${s.symbol}.png`;
            return (
              <Link
                key={s.symbol}
                href={`/asset/${encodeURIComponent(s.symbol)}`}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:border-emerald-400/70"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-slate-800 ring-1 ring-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo}
                    alt={s.symbol}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-50">
                    {s.symbol}
                    {s.displaySymbol && s.displaySymbol !== s.symbol
                      ? ` · ${s.displaySymbol}`
                      : ""}
                  </p>
                  <p className="text-xs text-slate-400 line-clamp-2">{s.description}</p>
                  {s.type && (
                    <span className="mt-1 inline-flex rounded-full bg-white/5 px-2 py-0.5 text-[11px] uppercase text-slate-300">
                      {s.type}
                    </span>
                  )}
                </div>
                <span className="text-xs text-emerald-300 opacity-0 transition group-hover:opacity-100">
                  View →
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
