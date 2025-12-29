"use client";

import Link from "next/link";
import { MarketSparkline } from "@/components/MarketSparkline";

type Props = {
  href?: string;
  symbol: string;
  name?: string;
  value: string;
  change: number;
  spark?: { time: number; value: number }[];
  disabled?: boolean;
};

export function MarketPillCard({ href, symbol, name, value, change, spark, disabled }: Props) {
  const body = (
    <div
      className={`flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-lg shadow-black/30 transition ${
        disabled ? "opacity-60" : "hover:-translate-y-0.5 hover:border-emerald-400/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-50">{symbol}</p>
          {name && <p className="text-xs text-slate-400">{name}</p>}
        </div>
        <span className={`text-sm ${change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
        </span>
      </div>
      <div className="mt-2 text-xl font-semibold text-slate-50">{value}</div>
      <div className="mt-3 h-12">
        {spark && spark.length > 0 ? (
          <MarketSparkline data={spark} height={48} color={change >= 0 ? "#22c55e" : "#ef4444"} />
        ) : (
          <div className="h-full rounded-lg bg-white/5" />
        )}
      </div>
    </div>
  );

  if (disabled || !href) return body;
  return <Link href={href}>{body}</Link>;
}
