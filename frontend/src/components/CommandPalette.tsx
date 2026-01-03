"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SearchResult = {
    symbol: string;
    name: string;
    type: "stock" | "crypto" | "forex" | "nav";
    href: string;
};

// Expanded dataset for Global Search
const staticData: SearchResult[] = [
    // Navigation
    { symbol: "Markets", name: "Go to Markets Dashboard", type: "nav", href: "/markets" },
    { symbol: "Crypto", name: "All Cryptocurrencies", type: "nav", href: "/crypto" },
    { symbol: "Stocks", name: "US Stocks", type: "nav", href: "/stocks" },

    // Tech / AI
    { symbol: "AAPL", name: "Apple Inc.", type: "stock", href: "/asset/AAPL" },
    { symbol: "MSFT", name: "Microsoft Corp.", type: "stock", href: "/asset/MSFT" },
    { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock", href: "/asset/NVDA" },
    { symbol: "TSLA", name: "Tesla Inc.", type: "stock", href: "/asset/TSLA" },
    { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", href: "/asset/GOOGL" },
    { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", href: "/asset/AMZN" },
    { symbol: "META", name: "Meta Platforms", type: "stock", href: "/asset/META" },
    { symbol: "AMD", name: "Advanced Micro Devices", type: "stock", href: "/asset/AMD" },
    { symbol: "PLTR", name: "Palantir Technologies", type: "stock", href: "/asset/PLTR" },

    // Finance / Blue Chips
    { symbol: "AXP", name: "American Express", type: "stock", href: "/asset/AXP" },
    { symbol: "JPM", name: "JPMorgan Chase", type: "stock", href: "/asset/JPM" },
    { symbol: "V", name: "Visa Inc.", type: "stock", href: "/asset/V" },
    { symbol: "MA", name: "Mastercard", type: "stock", href: "/asset/MA" },
    { symbol: "KO", name: "Coca-Cola", type: "stock", href: "/asset/KO" },
    { symbol: "DIS", name: "Disney", type: "stock", href: "/asset/DIS" },
    { symbol: "JNJ", name: "Johnson & Johnson", type: "stock", href: "/asset/JNJ" },

    // Crypto
    { symbol: "BTC", name: "Bitcoin", type: "crypto", href: "/asset/BTC-USD" },
    { symbol: "ETH", name: "Ethereum", type: "crypto", href: "/asset/ETH-USD" },
    { symbol: "SOL", name: "Solana", type: "crypto", href: "/asset/SOL-USD" },
    { symbol: "DOGE", name: "Dogecoin", type: "crypto", href: "/asset/DOGE-USD" },
    { symbol: "SHIB", name: "Shiba Inu", type: "crypto", href: "/asset/SHIB-USD" },
    { symbol: "PEPE", name: "Pepe", type: "crypto", href: "/asset/PEPE-USD" },
    { symbol: "XRP", name: "Ripple", type: "crypto", href: "/asset/XRP-USD" },
    { symbol: "ADA", name: "Cardano", type: "crypto", href: "/asset/ADA-USD" },
    { symbol: "LINK", name: "Chainlink", type: "crypto", href: "/asset/LINK-USD" },
    { symbol: "MATIC", name: "Polygon", type: "crypto", href: "/asset/MATIC-USD" },

    // Indices (mapped symbols)
    { symbol: "SPX", name: "S&P 500", type: "stock", href: "/asset/%5EGSPC" },
    { symbol: "NDX", name: "Nasdaq 100", type: "stock", href: "/asset/%5EIXIC" },
    { symbol: "DJI", name: "Dow Jones 30", type: "stock", href: "/asset/%5EDJI" },
    { symbol: "NI225", name: "Nikkei 225", type: "stock", href: "/asset/%5EN225" },
];

export function CommandPalette({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);

    const filtered = useMemo(() => {
        if (!query) return staticData.slice(0, 5);
        const lower = query.toLowerCase();
        return staticData.filter(
            (item) =>
                item.symbol.toLowerCase().includes(lower) ||
                item.name.toLowerCase().includes(lower)
        ).slice(0, 8); // Limit results
    }, [query]);

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((i) => (i + 1) % filtered.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[selectedIndex]) {
                    router.push(filtered[selectedIndex].href);
                    onClose();
                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, filtered, selectedIndex, router, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a]/80 backdrop-blur-2xl shadow-2xl ring-1 ring-white/5 animate-in zoom-in-95 duration-200">

                {/* Search Input */}
                <div className="flex items-center border-b border-white/5 px-4">
                    <svg
                        className="mr-3 h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        autoFocus
                        className="flex-1 bg-transparent py-4 text-base text-gray-100 placeholder-gray-500 focus:outline-none"
                        placeholder="Search assets (e.g. 'Pepe', 'American Express')..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <kbd className="hidden rounded bg-white/10 px-2 py-0.5 text-xs font-light text-gray-400 sm:inline-block">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto py-2">
                    {filtered.length === 0 ? (
                        <div className="py-12 text-center text-sm text-gray-500">
                            No results matching "{query}"
                        </div>
                    ) : (
                        filtered.map((item, index) => (
                            <div
                                key={item.symbol + item.type}
                                onClick={() => {
                                    router.push(item.href);
                                    onClose();
                                }}
                                className={`mx-2 flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm transition-all ${index === selectedIndex
                                    ? "bg-emerald-500/20 text-emerald-100"
                                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' :
                                        item.type === 'stock' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-gray-700/50 text-gray-400'
                                        }`}>
                                        {item.type === 'crypto' ? '₿' : item.type === 'stock' ? '$' : '#'}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`font-semibold ${index === selectedIndex ? 'text-white' : 'text-gray-200'}`}>
                                            {item.symbol}
                                        </span>
                                        <span className="text-xs opacity-70">{item.name}</span>
                                    </div>
                                </div>
                                {index === selectedIndex && (
                                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-white/5 bg-black/20 px-4 py-2 text-xs text-gray-500 flex justify-between">
                    <span>Pro tip: Use arrow keys to navigate</span>
                    <span>Flux-Trading v0.3</span>
                </div>
            </div>
        </div>
    );
}
