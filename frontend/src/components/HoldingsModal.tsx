"use client";

import { useMemo, useState } from "react";

type Holding = {
  symbol: string;
  quantity: number;
  average_buy_price: number;
};
type PriceMap = Record<string, { price: number }>;

type Props = {
  open: boolean;
  onClose: () => void;
  holdings: Holding[];
  prices: PriceMap;
  onTrade: (symbol: string) => void;
};

const defaultColumns = ["Symbol", "Qty", "Avg Cost", "Value", "PnL"];

export function HoldingsModal({ open, onClose, holdings, prices, onTrade }: Props) {
  const [visibleCols, setVisibleCols] = useState<string[]>(defaultColumns);
  const [order, setOrder] = useState<string[]>(defaultColumns);

  const toggleCol = (col: string) => {
    setVisibleCols((cols) =>
      cols.includes(col) ? cols.filter((c) => c !== col) : [...cols, col],
    );
  };

  const moveCol = (col: string, dir: "up" | "down") => {
    const idx = order.indexOf(col);
    if (idx === -1) return;
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  };

  const rows = useMemo(() => {
    return holdings.map((h) => {
      const live = prices[h.symbol]?.price ?? 0;
      const value = live * h.quantity;
      const cost = h.average_buy_price * h.quantity;
      const pnl = value - cost;
      return { ...h, live, value, pnl };
    });
  }, [holdings, prices]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Holdings</p>
            <h3 className="text-xl font-semibold text-slate-50">Expanded view</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-1 text-sm text-slate-200 hover:border-emerald-400"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-800/60 p-3">
            <p className="text-xs text-slate-300">Show columns</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {defaultColumns.map((col) => (
                <label key={col} className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-1">
                  <input
                    type="checkbox"
                    checked={visibleCols.includes(col)}
                    onChange={() => toggleCol(col)}
                  />
                  <span>{col}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-800/60 p-3">
            <p className="text-xs text-slate-300">Reorder columns</p>
            <div className="mt-2 space-y-2 text-xs">
              {order.map((col) => (
                <div key={col} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900 px-2 py-1">
                  <span>{col}</span>
                  <div className="flex gap-1">
                    <button
                      className="rounded border border-white/10 px-2 py-1"
                      onClick={() => moveCol(col, "up")}
                    >
                      ↑
                    </button>
                    <button
                      className="rounded border border-white/10 px-2 py-1"
                      onClick={() => moveCol(col, "down")}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-slate-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                {order.filter((c) => visibleCols.includes(c)).map((col) => (
                  <th key={col} className="px-3 py-2">
                    {col}
                  </th>
                ))}
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.symbol}>
                  {order.filter((c) => visibleCols.includes(c)).map((col) => {
                    switch (col) {
                    case "Symbol":
                      return (
                        <td key={col} className="px-3 py-2 font-semibold">
                          {r.symbol}
                        </td>
                      );
                    case "Qty":
                      return (
                        <td key={col} className="px-3 py-2">
                          {r.quantity}
                        </td>
                      );
                    case "Avg Cost":
                      return (
                        <td key={col} className="px-3 py-2">
                          ${r.average_buy_price.toFixed(2)}
                        </td>
                      );
                    case "Value":
                      return (
                        <td key={col} className="px-3 py-2">
                          ${r.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                      );
                    case "PnL":
                      return (
                        <td key={col} className="px-3 py-2">
                          <span className={r.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}>
                            {r.pnl >= 0 ? "▲" : "▼"} ${r.pnl.toFixed(2)}
                          </span>
                        </td>
                      );
                    default:
                      return null;
                    }
                  })}
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg bg-emerald-500 px-2 py-1 text-xs font-semibold text-emerald-900"
                        onClick={() => onTrade(r.symbol)}
                      >
                        Buy
                      </button>
                      <button
                        className="rounded-lg bg-rose-500 px-2 py-1 text-xs font-semibold text-rose-50"
                        onClick={() => onTrade(r.symbol)}
                      >
                        Sell
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
