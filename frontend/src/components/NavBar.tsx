"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Products" },
  { href: "/markets", label: "Markets" },
  { href: "/community", label: "Community" },
  { href: "/learn", label: "Learn" },
];

export function NavBar() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-emerald-300">
            Flux Trading
          </Link>
          <div className="hidden items-center gap-4 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm ${pathname === l.href ? "text-emerald-300" : "text-slate-300 hover:text-emerald-200"}`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickers…"
            className="hidden w-48 rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none sm:block"
          />
          <Link
            href="/holdings"
            className="hidden rounded-full border border-emerald-400/60 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10 sm:inline-flex"
          >
            Holdings
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-700 text-sm font-semibold text-slate-200 ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => setMenuOpen((s) => !s)}
              aria-label="Profile menu"
              className="h-full w-full"
            >
              👤
            </button>
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className="absolute right-4 mt-1 w-48 rounded-xl border border-white/10 bg-slate-900/95 p-2 text-sm text-slate-200 shadow-xl shadow-black/40">
          <Link
            href="/auth"
            className="block rounded-lg px-3 py-2 hover:bg-white/5"
            onClick={() => setMenuOpen(false)}
          >
            Account / Login
          </Link>
          <Link
            href="/holdings"
            className="block rounded-lg px-3 py-2 hover:bg-white/5"
            onClick={() => setMenuOpen(false)}
          >
            Holdings
          </Link>
          <Link
            href="/wallet"
            className="block rounded-lg px-3 py-2 hover:bg-white/5"
            onClick={() => setMenuOpen(false)}
          >
            Wallet
          </Link>
          <button
            type="button"
            className="block w-full rounded-lg px-3 py-2 text-left text-slate-400 hover:bg-white/5"
            onClick={() => setMenuOpen(false)}
          >
            Logout (placeholder)
          </button>
        </div>
      )}
    </nav>
  );
}
