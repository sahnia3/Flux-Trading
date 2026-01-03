"use client";

import { useEffect, useState } from "react";

export type NewsItem = {
    id: number;
    headline: string;
    source: string;
    url: string;
    summary: string;
    sentiment: "Bullish" | "Bearish" | "Neutral";
    time: string;
};

// Mocks with real fallback URLs
const mockNews: NewsItem[] = [
    {
        id: 101,
        headline: "Analyst Upgrades Target Price citing AI Growth",
        source: "Bloomberg",
        url: "https://www.google.com/search?q=analyst+upgrades+target+price+ai+growth",
        summary: "New revenue streams from enhanced AI capabilities are expected to drive Q4 earnings beat.",
        sentiment: "Bullish",
        time: "2h ago",
    },
    {
        id: 102,
        headline: "Sector Rotation: Tech cools off as Utilities rise",
        source: "Reuters",
        url: "https://www.google.com/search?q=sector+rotation+tech+utilities",
        summary: "Investors are taking profits from high-flyers and moving into defensive positions ahead of CPI data.",
        sentiment: "Neutral",
        time: "4h ago",
    },
    {
        id: 103,
        headline: "Supply Chain constraints may impact holiday shipments",
        source: "CNBC",
        url: "https://www.google.com/search?q=supply+chain+constraints+holiday+shipments",
        summary: "Logistics partners warn of delays due to renewed port congestion.",
        sentiment: "Bearish",
        time: "6h ago",
    },
];

export function NewsFeed({ symbol, initialNews }: { symbol: string; initialNews?: any[] }) {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (initialNews && initialNews.length > 0) {
            const mapped: NewsItem[] = initialNews.map((n, i) => ({
                id: n.id ?? i,
                headline: n.headline,
                source: n.source,
                url: n.url || `https://www.google.com/search?q=${encodeURIComponent(n.headline)}`,
                summary: n.summary || n.headline,
                sentiment: "Neutral",
                time: n.datetime ? new Date(n.datetime * 1000).toLocaleDateString() : "Recent",
            }));
            setNews(mapped);
        } else {
            setNews(mockNews);
        }
    }, [symbol, initialNews]);

    const visibleNews = expanded ? news : news.slice(0, 4);

    return (
        <div className="flex flex-col gap-4">
            {visibleNews.map((item) => (
                <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/10 hover:-translate-y-1"
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className="flex items-center gap-2 text-xs font-semibold text-text-dim uppercase tracking-wider">
                            {item.source} • {item.time}
                        </span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${item.sentiment === "Bullish"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                    : item.sentiment === "Bearish"
                                        ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                        : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                                }`}
                        >
                            {item.sentiment}
                        </span>
                    </div>
                    <h3 className="text-base font-bold text-text-main mb-1 group-hover:text-primary transition-colors">
                        {item.headline}
                    </h3>
                    <p className="text-sm text-text-muted line-clamp-2">{item.summary}</p>
                </a>
            ))}

            {news.length > 4 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="mx-auto mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                    {expanded ? "Show Less" : `View All (${news.length})`}
                </button>
            )}
        </div>
    );
}
