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
      className="glass mb-8 flex flex-wrap gap-2 rounded-2xl p-2"
    >
      {categories.map((c) => (
        <button
          key={c}
          onClick={() => {
            setCurrent(c);
            onSelect(c);
          }}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition duration-300 ${current === c
            ? "bg-primary text-white shadow-lg shadow-primary/25"
            : "bg-transparent text-text-muted hover:bg-white/5 hover:text-text-main"
            }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
