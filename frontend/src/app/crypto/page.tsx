"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SymbolItem = {
    symbol: string;
    description: string;
    displaySymbol?: string;
    type?: string;
    logo?: string;
    id?: string;
};

type PriceData = {
    [key: string]: {
        usd: number;
        usd_24h_change: number;
    };
};

export default function CryptoPage() {
    const [symbols, setSymbols] = useState<SymbolItem[]>([]);
    const [prices, setPrices] = useState<PriceData>({});
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                setLoading(true);
                // Use local proxy API with type=crypto
                const res = await fetch(
                    `/api/search?type=crypto${query ? `&q=${encodeURIComponent(query)}` : ""}`,
                );
                if (!res.ok) throw new Error("Failed to load crypto");
                const data = (await res.json()) as SymbolItem[];

                if (active) {
                    setSymbols(data);
                    setError(null);

                    // Fetch batch prices for crypto assets (limit to 50 for URL length safety per batch)
                    const cryptoIds = data
                        .filter(d => d.type === 'Crypto' && d.id)
                        .map(d => d.id)
                        .filter(Boolean);

                    if (cryptoIds.length > 0) {
                        // Batch fetch logic
                        // CoinGecko allows 50-100 ids per call check.
                        const chunks = [];
                        for (let i = 0; i < cryptoIds.length; i += 50) {
                            chunks.push(cryptoIds.slice(i, i + 50));
                        }

                        const priceMap: PriceData = {};

                        await Promise.all(chunks.map(async chunk => {
                            try {
                                // Use local proxy to avoid CORS
                                const pRes = await fetch(`/api/crypto/prices?ids=${chunk.join(',')}`);
                                if (pRes.ok) {
                                    const pData = await pRes.json();
                                    Object.assign(priceMap, pData);
                                }
                            } catch { /* ignore individual batch fail */ }
                        }));

                        if (active) setPrices(prev => ({ ...prev, ...priceMap }));
                    }
                }
            } catch {
                if (active) setError("Could not load crypto assets");
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [query]);

    // Helper to format currency
    const formatPrice = (p: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: p < 1 ? 4 : 2,
            maximumFractionDigits: p < 1 ? 6 : 2
        }).format(p);
    };

    return (
        <main className="min-h-screen pt-24 pb-20">
            <div className="mx-auto max-w-6xl px-4 py-10">
                <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></span>
                            <p className="text-xs uppercase tracking-[0.2em] text-primary">Crypto Universe</p>
                        </div>
                        <h1 className="text-3xl font-bold text-text-main">Cryptocurrency & ETF</h1>
                        <p className="text-sm text-text-muted mt-1">
                            Top 60+ coins and major ETFs. Live prices via CoinGecko.
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
                        placeholder="Search crypto (e.g., Bitcoin, PEPE, IBIT)"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-text-main placeholder:text-text-dim focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 sm:max-w-md"
                    />
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span className="ml-2 rounded-full bg-white/5 px-3 py-1 text-text-dim">
                            Showing {symbols.length} assets
                        </span>
                        {loading && <span className="text-primary ml-2 animate-pulse">Loading…</span>}
                        {error && <span className="text-down ml-2">{error}</span>}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {symbols.map((s) => {
                        const priceInfo = s.id ? prices[s.id] : null;
                        const price = priceInfo?.usd;
                        const change = priceInfo?.usd_24h_change;

                        return (
                            <Link
                                key={s.symbol}
                                href={`/asset/${encodeURIComponent(s.symbol)}`}
                                className="group glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                            >
                                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-surface p-2 ring-1 ring-white/5 transition group-hover:scale-110 group-hover:bg-white/5">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={s.logo || `https://assets.parqet.com/logos/symbol/${s.displaySymbol}?format=png`}
                                        alt={s.description}
                                        className="h-full w-full object-contain"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = "none";
                                            (e.currentTarget.parentElement as HTMLElement).innerHTML = `<span class="text-sm font-bold text-text-main">${s.displaySymbol?.charAt(0) ?? "?"}</span>`;
                                        }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-bold text-text-main group-hover:text-primary transition truncate">
                                            {s.displaySymbol}
                                        </p>
                                        {s.type === 'ETF' && (
                                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] uppercase text-blue-300 border border-blue-500/20">
                                                ETF
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-xs text-text-muted truncate pr-2" title={s.description}>{s.description}</p>
                                        {price !== undefined && (
                                            <div className="text-right">
                                                <p className="text-sm font-mono text-text-main">{formatPrice(price)}</p>
                                            </div>
                                        )}
                                    </div>
                                    {change !== undefined && (
                                        <p className={`text-[10px] text-right ${change >= 0 ? "text-up" : "text-down"}`}>
                                            {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                                        </p>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
