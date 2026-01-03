"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SymbolItem = {
  symbol: string;
  description: string;
  displaySymbol?: string;
  type?: string;
};

export default function StocksPage() {
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<
    "All" | "Tech" | "AI" | "Mega-cap" | "Large-cap" | "Mid-cap" | "Small-cap"
  >("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        // Use local proxy API for accurate search
        const res = await fetch(
          `/api/search${query ? `?q=${encodeURIComponent(query)}` : ""}`,
        );
        if (!res.ok) throw new Error("Failed to load symbols");
        const data = (await res.json()) as SymbolItem[];
        if (active) {
          // Normalize
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
        if (active) setError("Could not load symbols");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [query]);

  const megaCaps = new Set(["AAPL", "MSFT", "AMZN", "GOOGL", "GOOG", "META", "NVDA", "TSLA"]);

  const visible = useMemo(() => {
    // 1. Filter for "Clean" US Stocks
    const isUSStock = (s: SymbolItem) => {
      const sym = s.symbol.toUpperCase();
      // Exclude common OTC/Foreign indicators (5 chars ending in F/Y/Q/Z - except GOOGL which is fine)
      if (sym.length === 5 && (sym.endsWith("F") || sym.endsWith("Y") || sym.endsWith("Q") || sym.endsWith("Z"))) {
        // Special case allow GOOGL? No, GOOGL is standard. OTCs are usually 5 letters.
        // GOOGL ends in L. So it passes.
        return false;
      }
      // Exclude dots unless strictly BRK (preferreds often have dots)
      if (sym.includes(".") && !sym.startsWith("BRK")) return false;
      return true;
    };

    const clean = symbols.filter(isUSStock);
    const base = clean.slice(0, 600);

    if (bucket === "All") return base;
    return base.filter((s) => {
      const desc = `${s.description} ${s.type ?? ""}`.toUpperCase();
      if (bucket === "Mega-cap") return megaCaps.has(s.symbol.toUpperCase());
      if (bucket === "Tech")
        return (
          megaCaps.has(s.symbol.toUpperCase()) ||
          desc.includes("TECH") ||
          desc.includes("SOFTWARE") ||
          desc.includes("SEMICONDUCTOR") ||
          desc.includes("IT")
        );
      if (bucket === "AI") return desc.includes("AI") || desc.includes("ARTIFICIAL");
      if (bucket === "Large-cap") return !megaCaps.has(s.symbol.toUpperCase()) && desc.includes("LARGE");
      if (bucket === "Mid-cap") return desc.includes("MID") || desc.includes("MID-CAP");
      if (bucket === "Small-cap") return desc.includes("SMALL") || desc.includes("SMALL-CAP");
      return true;
    });
  }, [symbols, bucket]);

  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></span>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Market Universe</p>
            </div>
            <h1 className="text-3xl font-bold text-text-main">US Stocks Universe</h1>
            <p className="text-sm text-text-muted mt-1">
              Search across all major US-listed equities.
            </p>
          </div>
          <Link
            href="/markets"
            className="rounded-full border border-white/10 bg-surface px-5 py-2 text-sm font-medium text-text-main transition hover:bg-white/5 hover:border-primary/50"
          >
            ← Back to Markets
          </Link>
        </header>

        <div className="glass mb-8 flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol or company (e.g., AAPL or Apple)"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-text-main placeholder:text-text-dim focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 sm:max-w-md"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            {["All", "Tech", "AI", "Mega-cap", "Large-cap", "Mid-cap", "Small-cap"].map((b) => (
              <button
                key={b}
                onClick={() => setBucket(b as typeof bucket)}
                className={`rounded-full px-3 py-1 transition ${bucket === b ? "bg-primary text-white shadow-lg shadow-primary/25" : "bg-surface text-text-muted hover:bg-white/5 hover:text-text-main"
                  }`}
              >
                {b}
              </button>
            ))}
            <span className="ml-2 rounded-full bg-white/5 px-3 py-1 text-text-dim">
              Showing {visible.length} symbols
            </span>
            {loading && <span className="text-primary ml-2 animate-pulse">Loading…</span>}
            {error && <span className="text-down ml-2">{error}</span>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => {
            // Reliable logo source
            const logo = `https://assets.parqet.com/logos/symbol/${s.symbol}?format=png`;
            return (
              <Link
                key={s.symbol}
                href={`/asset/${encodeURIComponent(s.symbol)}`}
                className="group glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-surface p-2 ring-1 ring-white/5 transition group-hover:scale-110 group-hover:bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo}
                    alt={s.symbol}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      (e.currentTarget.parentElement as HTMLElement).innerHTML = `<span class="text-sm font-bold text-text-main">${s.symbol
                        .charAt(0)
                        .toUpperCase()}</span>`;
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold text-text-main group-hover:text-primary transition">
                      {s.symbol}
                    </p>
                    {s.type && (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-text-dim border border-white/5">
                        {s.type === 'cs' ? 'Stock' : s.type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted line-clamp-1 mt-0.5 group-hover:text-text-main transition">{s.description}</p>
                </div>
                <div className="text-text-dim opacity-0 transition group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
