"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-white/10 bg-slate-950/90 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-100">Flux Trading</p>
          <p className="text-sm text-slate-400">
            Paper trading only. Educational, not financial advice.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-300">
          <Link href="https://github.com" className="hover:text-emerald-300">
            GitHub
          </Link>
          <span className="text-slate-500">•</span>
          <Link href="/learn" className="hover:text-emerald-300">
            Learn
          </Link>
          <span className="text-slate-500">•</span>
          <Link href="/community" className="hover:text-emerald-300">
            Community
          </Link>
          <span className="text-slate-500">•</span>
          <Link href="#" className="hover:text-emerald-300">
            Privacy
          </Link>
          <span className="text-slate-500">•</span>
          <Link href="#" className="hover:text-emerald-300">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
