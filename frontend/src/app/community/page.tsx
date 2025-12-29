"use client";

import Link from "next/link";

const ideas = [
  {
    symbol: "AAPL",
    title: "Earnings momentum play",
    thesis: "Looking for continuation if services growth beats; watch 190 level.",
    risk: "Stop below 182 swing low.",
  },
  {
    symbol: "BTC",
    title: "Range reclaim",
    thesis: "Reclaim of 85k opens path to prior highs; strong on-chain inflow.",
    risk: "Invalidation on daily close below 80k.",
  },
  {
    symbol: "MSFT",
    title: "AI capex tailwind",
    thesis: "Cloud + AI guidance strength; potential break over 470.",
    risk: "Breakdown under 440 voids setup.",
  },
];

export default function CommunityPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Community</p>
            <h1 className="text-3xl font-semibold text-slate-50">Trade ideas (read-only)</h1>
            <p className="text-sm text-slate-400">
              Curated mock ideas with brief rationale. No posting/liking yet.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-emerald-400"
          >
            ← Back home
          </Link>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {ideas.map((idea) => (
            <div
              key={idea.symbol}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/30"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Idea</p>
              <div className="mt-1 flex items-center justify-between">
                <h3 className="text-xl font-semibold">{idea.symbol}</h3>
                <Link
                  href={`/asset/${idea.symbol}`}
                  className="text-xs text-emerald-300 hover:underline"
                >
                  View asset →
                </Link>
              </div>
              <p className="text-sm text-slate-200">{idea.title}</p>
              <p className="mt-2 text-sm text-slate-300">
                <span className="font-semibold">Thesis: </span>
                {idea.thesis}
              </p>
              <p className="mt-1 text-sm text-rose-300">
                <span className="font-semibold">Risk: </span>
                {idea.risk}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
