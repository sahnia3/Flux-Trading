"use client";

import { useRef, useState } from "react";

type Props = {
  categories: string[];
  onSelect: (c: string) => void;
  active: string;
};

export function MarketCategoryNav({ categories, onSelect, active }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState(active);

  return (
    <div
      ref={containerRef}
      className="mb-4 flex gap-2 overflow-x-auto rounded-full bg-slate-900/80 p-2 ring-1 ring-white/5"
    >
      {categories.map((c) => (
        <button
          key={c}
          onClick={() => {
            setCurrent(c);
            onSelect(c);
          }}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
            current === c ? "bg-emerald-500 text-emerald-900" : "bg-slate-800 text-slate-200"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
