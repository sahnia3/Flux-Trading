"use client";

import React, { useEffect, useRef, useState } from "react";

const MAX_ITEMS = 6; // Duplicate string less often if we have many items

export function MarketTicker({ items }: { items?: { symbol: string, price: string, change: string }[] }) {
    // Default placeholder if no items
    const displayItems = items && items.length > 0 ? items : [
        { symbol: "Loading...", price: "—", change: "0.00%" }
    ];

    return (
        <div className="w-full bg-[#0B1120]/80 backdrop-blur-md border-b border-white/5 overflow-hidden h-10 flex items-center">
            <div className="animate-ticker flex whitespace-nowrap">
                {/* Triple the items to ensure smooth infinite loop coverage */}
                {[...displayItems, ...displayItems, ...displayItems, ...displayItems].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 mx-6 text-xs font-mono">
                        <span className="font-bold text-slate-300">{item.symbol}</span>
                        <span className="text-slate-400">{item.price}</span>
                        <span
                            className={
                                item.change.startsWith("+")
                                    ? "text-emerald-400"
                                    : item.change.startsWith("-")
                                        ? "text-rose-400"
                                        : "text-slate-400"
                            }
                        >
                            {item.change}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
