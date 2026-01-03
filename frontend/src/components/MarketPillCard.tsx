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
      className={`glass group flex h-full flex-col justify-between rounded-2xl p-4 transition duration-300 ${disabled
        ? "opacity-60 pointer-events-none"
        : "hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
        }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-text-main group-hover:text-primary transition">{symbol.replace(/^(BINANCE:|COINBASE:|\^)/, "")}</p>
          {name && <p className="text-xs text-text-dim">{name}</p>}
        </div>
        <span className={`text-xs font-medium ${change >= 0 ? "text-up" : "text-down"}`}>
          {change >= 0 ? "+" : ""}{Math.abs(change).toFixed(2)}%
        </span>
      </div>
      <div className="mt-2 text-xl font-bold text-text-main">{value}</div>
      <div className="mt-3 h-12 w-full opacity-60 group-hover:opacity-100 transition">
        {spark && spark.length > 0 ? (
          <MarketSparkline data={spark} height={48} color={change >= 0 ? "#10b981" : "#f43f5e"} />
        ) : (
          <div className="h-full rounded-lg bg-surface" />
        )}
      </div>
    </div>
  );

  if (disabled || !href) return body;
  return <Link href={href} className="block h-full">{body}</Link>;
}
