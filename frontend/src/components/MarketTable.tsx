"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type TableRow = {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  volume?: string;
  extra?: string;
};

type Props = {
  rows: TableRow[];
  sortable?: ("change" | "volume")[];
  label?: string;
  hideVolume?: boolean;
};

const changeColor = (v: number) => (v >= 0 ? "text-up" : "text-down");

export function MarketTable({ rows, sortable = ["change", "volume"], label, hideVolume }: Props) {
  const [sortKey, setSortKey] = useState<"change" | "volume" | null>(null);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    if (sortKey === "change") copy.sort((a, b) => (b.change || 0) - (a.change || 0));
    if (sortKey === "volume" && !hideVolume) {
      copy.sort((a, b) => ((b.volume || "").localeCompare(a.volume || "")));
    }
    return copy;
  }, [rows, sortKey, hideVolume]);

  return (
    <div className="glass overflow-hidden rounded-2xl border-none">
      {label && (
        <div className="flex items-center justify-between bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.2em] text-text-muted">
          <span>{label}</span>
          <div className="flex gap-2 text-[11px]">
            {sortable.includes("change") && (
              <button
                onClick={() => setSortKey("change")}
                className={`rounded-full px-2 py-1 transition ${sortKey === "change" ? "bg-primary/20 text-primary" : "bg-white/5 text-text-dim hover:text-text-main"
                  }`}
              >
                Sort % Change
              </button>
            )}
            {!hideVolume && sortable.includes("volume") && (
              <button
                onClick={() => setSortKey("volume")}
                className={`rounded-full px-2 py-1 transition ${sortKey === "volume" ? "bg-primary/20 text-primary" : "bg-white/5 text-text-dim hover:text-text-main"
                  }`}
              >
                Sort Volume
              </button>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-5 bg-black/20 px-4 py-3 text-xs uppercase tracking-[0.2em] text-text-dim font-semibold border-b border-white/5">
        <span>Symbol</span>
        <span>Name</span>
        <span>Last</span>
        <span>%</span>
        {!hideVolume && <span>Volume</span>}
      </div>
      <div className="divide-y divide-white/5">
        {sorted.map((r) => (
          <Link
            key={r.symbol}
            href={`/asset/${r.symbol}`}
            className="grid grid-cols-5 items-center px-4 py-3 text-sm text-text-main transition hover:bg-white/5"
          >
            <span className="font-bold">{r.symbol}</span>
            <span className="text-text-muted">{r.name ?? "—"}</span>
            <span className="font-medium">{r.price?.toLocaleString?.() ?? r.price}</span>
            <span className={`font-semibold ${changeColor(r.change)}`}>{r.change?.toFixed?.(2) ?? r.change}%</span>
            {!hideVolume && <span className="text-text-dim">{r.volume ?? "—"}</span>}
          </Link>
        ))}
        {!rows.length && (
          <div className="px-4 py-6 text-center text-sm text-text-muted">No data available.</div>
        )}
      </div>
    </div>
  );
}
