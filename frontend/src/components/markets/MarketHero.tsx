"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { MarketSparkline } from "@/components/MarketSparkline";



export function MarketHero({ indices, crypto }: { indices: any[], crypto: any[] }) {
    // Helper to get data for specific symbols
    const getIndexData = (symbol: string) => indices.find(i => i.symbol === symbol) || { price: 0, change: 0, percentage: 0 };
    const getCryptoData = (symbol: string) => crypto.find(c => c.symbol === symbol) || { price: 0, change: 0, percentage: 0 };

    const sp500 = getIndexData("GSPC");
    const nasdaq = getIndexData("IXIC");
    const btc = getCryptoData("BTC");

    // Mock chart data generation (replacing static constant to at least vary slightly or be consistent)
    // In a real app, you'd fetch history. For now, we generate a sparkline based on the current price trend.
    const generateSparkline = (currentPrice: number, isPositive: boolean) => {
        return Array.from({ length: 50 }, (_, i) => ({
            time: Math.floor(Date.now() / 1000) - (50 - i) * 3600,
            value: currentPrice * (1 + (Math.random() * 0.02 - 0.01) + (isPositive ? i * 0.0001 : -i * 0.0001))
        }));
    };

    return (
        <div className="mb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Market Overview</h1>
                    <p className="text-slate-400">Global market performance and key movers today.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard">
                        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors">
                            Market Dashboard
                        </button>
                    </Link>
                    <Link href="/calendar">
                        <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm font-semibold transition-colors">
                            Economic Calendar
                        </button>
                    </Link>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <IndexCard
                    title="S&P 500"
                    value={sp500.price ? sp500.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                    change={`${sp500.change > 0 ? "+" : ""}${sp500.change ? sp500.change.toFixed(2) : "0.00"}%`}
                    isPositive={sp500.change >= 0}
                    data={generateSparkline(sp500.price || 5000, sp500.change >= 0)}
                    symbol="^GSPC"
                />
                <IndexCard
                    title="Nasdaq 100"
                    value={nasdaq.price ? nasdaq.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                    change={`${nasdaq.change > 0 ? "+" : ""}${nasdaq.change ? nasdaq.change.toFixed(2) : "0.00"}%`}
                    isPositive={nasdaq.change >= 0}
                    data={generateSparkline(nasdaq.price || 18000, nasdaq.change >= 0)}
                    symbol="^IXIC"
                />
                <IndexCard
                    title="Bitcoin"
                    value={btc.price ? btc.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                    change={`${btc.change > 0 ? "+" : ""}${btc.change ? btc.change.toFixed(2) : "0.00"}%`}
                    isPositive={btc.change >= 0}
                    data={generateSparkline(btc.price || 60000, btc.change >= 0)}
                    symbol="BTC"
                />
            </div>
        </div>
    );
}

function IndexCard({ title, value, change, isPositive, data, symbol }: { title: string, value: string, change: string, isPositive: boolean, data: any[], symbol: string }) {
    return (
        <Link href={`/asset/${symbol}`} className="block">
            <div className="bg-[#0f172a]/40 border border-white/5 rounded-2xl p-6 hover:border-white/10 hover:bg-white/5 transition-all group backdrop-blur-sm cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="text-slate-400 text-sm font-medium mb-1">{title}</div>
                        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-lg ${isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        }`}>
                        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {change}
                    </div>
                </div>

                {/* Chart Area */}
                <div className="h-32 w-full mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <MarketSparkline
                        data={data}
                        height={128}
                        color={isPositive ? "#10b981" : "#f43f5e"}
                    />
                </div>
            </div>
        </Link>
    );
}

