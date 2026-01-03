"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MarketTicker } from "@/components/markets/MarketTicker";
import { MarketHero } from "@/components/markets/MarketHero";
import { MarketTable } from "@/components/markets/MarketTable";
import { Flame, TrendingDown, TrendingUp } from "lucide-react";

const VIEW_TABS = ["Indices", "US Stocks", "Crypto", "Forex", "Commodities"];

export default function MarketsContent({
    initialIndices,
    initialStocks,
    initialCrypto,
    globalGainers = [],
    globalLosers = [],
    initialCommodities = [],
    initialForex = []
}: {
    initialIndices: any[],
    initialStocks: any[],
    initialCrypto: any[],
    globalGainers?: any[],
    globalLosers?: any[],
    initialCommodities?: any[],
    initialForex?: any[]
}) {
    const [activeTab, setActiveTab] = useState("Indices");

    // Use props as initial data
    const [indices] = useState(initialIndices);
    const [usStocks] = useState(initialStocks);
    const [crypto] = useState(initialCrypto);
    const [commodities] = useState(initialCommodities);
    const [forex] = useState(initialForex);

    const allData = [...indices, ...usStocks, ...crypto, ...commodities, ...forex];
    const currentData = allData.filter(d => d.type === activeTab);

    // Sort Logic
    // If US Stocks active, use the Global props passed from server
    // Else use local sort of the displayed data
    let gainers = [...currentData].sort((a, b) => b.change - a.change).slice(0, 3);
    let losers = [...currentData].sort((a, b) => a.change - b.change).slice(0, 3);

    if (activeTab === "US Stocks" && globalGainers.length > 0) {
        gainers = globalGainers.slice(0, 3);
        losers = globalLosers.slice(0, 3);
    }

    // Construct Ticker Data (Indices + Core Assets)
    const tickerItems = [
        ...indices.filter(i => ["S&P 500", "Nasdaq 100", "Dow 30"].includes(i.name)).map(i => ({
            symbol: i.name,
            price: i.price.toLocaleString(),
            change: `${i.change >= 0 ? "+" : ""}${i.change.toFixed(2)}%`
        })),
        ...crypto.filter(c => ["BTC", "ETH"].includes(c.symbol)).map(c => ({
            symbol: `${c.symbol}/USD`,
            price: `$${c.price.toLocaleString()}`,
            change: `${c.change >= 0 ? "+" : ""}${c.change.toFixed(2)}%`
        })),
        ...commodities.filter(c => ["SPDR Gold Shares", "United States Oil Fund, LP"].includes(c.name)).map(c => ({
            symbol: c.name === "SPDR Gold Shares" ? "Gold" : "Crude Oil",
            price: `$${c.price.toLocaleString()}`,
            change: `${c.change >= 0 ? "+" : ""}${c.change.toFixed(2)}%`
        })),
        ...forex.filter(f => ["EUR/USD", "GBP/USD"].includes(f.symbol)).map(f => ({
            symbol: f.symbol,
            price: f.price.toFixed(4),
            change: `${f.change >= 0 ? "+" : ""}${f.change.toFixed(2)}%`
        }))
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-slate-50 font-sans selection:bg-indigo-500/30">
            <div className="fixed top-16 left-0 right-0 z-40">
                <MarketTicker items={tickerItems} />
            </div>

            <div className="pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <MarketHero indices={indices} crypto={crypto} />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-indigo-500/10 mb-8 gap-4">
                    <div className="flex overflow-x-auto">
                        {VIEW_TABS.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-8 py-4 text-sm font-bold tracking-wide transition-all relative ${activeTab === tab
                                    ? "text-indigo-400"
                                    : "text-slate-500 hover:text-slate-300"
                                    }`}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    <Link href={activeTab === "Crypto" ? "/crypto" : activeTab === "US Stocks" ? "/stocks" : "#"}
                        className="hidden md:flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-white transition-colors pr-2">
                        View All {activeTab} &rarr;
                    </Link>
                </div>

                <div className="space-y-12">
                    {currentData.length > 0 ? (
                        <>
                            {activeTab !== "Forex" && (
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-sm">
                                            <TrendingUp size={16} /> Top Gainers
                                        </div>
                                        <MarketTable data={gainers} type={activeTab} minimal={true} />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-rose-400 font-bold uppercase tracking-wider text-sm">
                                            <TrendingDown size={16} /> Top Losers
                                        </div>
                                        <MarketTable data={losers} type={activeTab} minimal={true} />
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-sm mb-4">
                                    <Flame size={16} /> Market Data
                                </div>
                                <MarketTable data={currentData} type={activeTab} minimal={false} />
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-20 text-slate-500 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                            No data available for {activeTab}.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
