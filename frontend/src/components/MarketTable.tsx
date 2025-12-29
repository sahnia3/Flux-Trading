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

const changeColor = (v: number) => (v >= 0 ? "text-emerald-300" : "text-rose-300");

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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/40">
      {label && (
        <div className="flex items-center justify-between bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
          <span>{label}</span>
          <div className="flex gap-2 text-[11px]">
            {sortable.includes("change") && (
              <button
                onClick={() => setSortKey("change")}
                className={`rounded-full px-2 py-1 ${
                  sortKey === "change" ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-slate-300"
                }`}
              >
                Sort % Change
              </button>
            )}
            {!hideVolume && sortable.includes("volume") && (
              <button
                onClick={() => setSortKey("volume")}
                className={`rounded-full px-2 py-1 ${
                  sortKey === "volume" ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-slate-300"
                }`}
              >
                Sort Volume
              </button>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-5 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
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
            className="grid grid-cols-5 items-center px-4 py-3 text-sm text-slate-100 transition hover:bg-white/5"
          >
            <span className="font-semibold">{r.symbol}</span>
            <span className="text-slate-300">{r.name ?? "—"}</span>
            <span>{r.price?.toLocaleString?.() ?? r.price}</span>
            <span className={changeColor(r.change)}>{r.change?.toFixed?.(2) ?? r.change}%</span>
            {!hideVolume && <span className="text-slate-400">{r.volume ?? "—"}</span>}
          </Link>
        ))}
        {!rows.length && (
          <div className="px-4 py-6 text-center text-sm text-slate-400">No data available.</div>
        )}
      </div>
    </div>
  );
}
