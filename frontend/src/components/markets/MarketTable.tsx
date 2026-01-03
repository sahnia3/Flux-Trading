"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";

interface RowData {
    symbol: string;
    name: string;
    price: number;
    change: number;
    volume: string;
    marketCap: string;
    type?: string;
    logo?: string;
}

interface MarketTableProps {
    data: RowData[];
    type: string;
    minimal?: boolean; // If true, hide extra cols (Volume/MktCap) for "Top Gainers" cards
}

export function MarketTable({ data, type, minimal = false }: MarketTableProps) {
    const [rows, setRows] = useState(data);

    useEffect(() => {
        setRows(data);
    }, [data]);

    // Generate a placeholder "Avatar" color based on symbol char code
    const getAvatarColor = (sym: string) => {
        const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500", "bg-cyan-500", "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500"];
        const charCode = sym.charCodeAt(0);
        return colors[charCode % colors.length];
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0f172a]/40 backdrop-blur-sm shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    {!minimal && (
                        <thead>
                            <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500">
                                <th className="p-6 font-medium pl-8">Asset</th>
                                <th className="p-6 font-medium text-right">Price</th>
                                <th className="p-6 font-medium text-right">Change %</th>
                                <th className="p-6 font-medium text-right">Volume</th>
                                <th className="p-6 font-medium text-right hidden md:table-cell">Mkt Cap</th>
                                <th className="p-6 font-medium text-center">Trend</th>
                            </tr>
                        </thead>
                    )}
                    <tbody className="divide-y divide-white/5 text-sm">
                        {rows.map((row) => (
                            <tr
                                key={row.symbol}
                                className="group hover:bg-white/[0.03] transition-colors"
                            >
                                <td className="p-4 pl-6">
                                    <Link href={`/asset/${row.symbol}`} className="flex items-center gap-4 group-hover:translate-x-1 transition-transform duration-300">
                                        {/* Dynamic Logo */}
                                        <div className="h-10 w-10 relative flex-shrink-0">
                                            <img
                                                src={
                                                    row.logo ||
                                                    (row.type === "Crypto"
                                                        ? `https://assets.coincap.io/assets/icons/${row.symbol.toLowerCase()}@2x.png`
                                                        : `https://logo.clearbit.com/${row.name.split(' ')[0].toLowerCase()}.com`)
                                                }
                                                onError={(e) => {
                                                    // Fallback to avatar if image fails
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                }}
                                                className="h-10 w-10 rounded-full object-cover shadow-sm bg-white/10"
                                                alt={row.symbol}
                                            />
                                            <div className={`hidden h-10 w-10 rounded-full ${getAvatarColor(row.symbol)} flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/5 absolute top-0 left-0`}>
                                                {row.symbol.substring(0, 1)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors text-base">{row.symbol}</div>
                                            <div className="text-slate-500 text-xs mt-0.5 font-medium">{row.name}</div>
                                        </div>
                                    </Link>
                                </td>

                                <td className="p-4 text-right font-mono text-slate-200 text-base">
                                    {new Intl.NumberFormat("en-US", {
                                        style: "currency",
                                        currency: row.currency || "USD",
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }).format(row.price)}
                                </td>

                                <td className="p-4 text-right">
                                    <div className={`inline-flex items-center justify-end gap-1 font-bold ${row.change >= 0 ? "text-emerald-400" : "text-rose-400"
                                        }`}>
                                        {row.change >= 0 ? "+" : ""}{row.change.toFixed(2)}%
                                    </div>
                                </td>

                                {!minimal && (
                                    <>
                                        <td className="p-4 text-right text-slate-500 font-mono">{row.volume}</td>
                                        <td className="p-4 text-right text-slate-500 font-mono hidden md:table-cell">{row.marketCap}</td>
                                        <td className="p-4 text-center w-32">
                                            <div className="h-8 w-24 mx-auto opacity-40 group-hover:opacity-100 transition-opacity">
                                                <Sparkline isPositive={row.change >= 0} />
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Sparkline({ isPositive }: { isPositive: boolean }) {
    const color = isPositive ? "#34d399" : "#fb7185";
    return (
        <svg viewBox="0 0 100 25" className="w-full h-full overflow-visible">
            <path d={`M0,12 L10,8 L20,15 L30,5 L40,12 L50,8 L60,18 L70,5 L80,10 L90,2`}
                fill="none"
                stroke={color}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    )
}
