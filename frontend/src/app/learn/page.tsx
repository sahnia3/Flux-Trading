"use client";

import { LearnSidebar } from "@/components/LearnSidebar";
import Link from "next/link";
import { useState } from "react";

export default function LearnPage() {
  const [open, setOpen] = useState(true);
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Learn</p>
            <h1 className="text-3xl font-semibold text-slate-50">Learning modules</h1>
            <p className="text-sm text-slate-400">Open the sidebar to browse lessons and quizzes.</p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-emerald-400"
          >
            ← Back home
          </Link>
        </div>
        <button
          onClick={() => setOpen((s) => !s)}
          className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-emerald-400"
        >
          {open ? "Hide modules" : "Show modules"}
        </button>
        <p className="mt-4 text-sm text-slate-300">
          The Learn sidebar contains concise lessons on candles, chart reading, and risk management,
          each with quick quizzes and visuals.
        </p>
      </div>
      <LearnSidebar open={open} onClose={() => setOpen(false)} />
    </main>
  );
}
