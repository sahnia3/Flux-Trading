"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommandPalette } from "./CommandPalette";
import { TradeModal } from "./TradeModal";
import { Zap } from "lucide-react";

const links = [
  { href: "/", label: "Products" },
  { href: "/markets", label: "Markets" },
  { href: "/community", label: "Community" },
  { href: "/learn", label: "Academy" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // ... (checkAuth logic remains same)
    // Check auth status
    const checkAuth = () => {
      const token = sessionStorage.getItem("flux_token");
      const email = sessionStorage.getItem("flux_email");
      setIsLoggedIn(!!token);
      setUserEmail(email);
    };

    checkAuth();

    // Listen for auth changes (login/logout)
    window.addEventListener("flux-auth-change", checkAuth);
    // Listen for storage events (cross-tab sync)
    window.addEventListener("storage", checkAuth);

    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("flux-auth-change", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  const handleSignOut = () => {
    // ... (remain same)
    sessionStorage.removeItem("flux_token");
    sessionStorage.removeItem("flux_email");
    window.dispatchEvent(new Event("flux-auth-change"));
    setIsLoggedIn(false);
    setUserEmail(null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <TradeModal isOpen={isTradeOpen} onClose={() => setIsTradeOpen(false)} />

      <nav className="fixed top-0 left-0 right-0 z-40 w-full transition-all duration-300">
        {/* Top Glow Bar */}
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50" />

        {/* Glass Container */}
        <div className="mx-auto border-b border-white/5 bg-[#030712]/60 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link href="/" className="group flex items-center gap-2.5">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-500/20 transition-all group-hover:scale-105 group-hover:shadow-emerald-500/40">
                  <span className="text-white font-bold text-lg">F</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-100">
                  Flux<span className="text-emerald-400">Trading</span>
                </span>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden items-center gap-1 md:flex">
                {links.map((l) => {
                  const isActive = pathname === l.href;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive
                        ? "text-emerald-400"
                        : "text-slate-400 hover:text-slate-100"
                        }`}
                    >
                      {l.label}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Search Trigger */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="group hidden items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-1.5 text-sm text-slate-400 transition-all hover:bg-white/10 hover:border-white/10 hover:text-slate-200 sm:flex w-48"
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search assets...</span>
                </div>
                <kbd className="rounded bg-black/30 px-1.5 py-0.5 text-xs font-sans font-medium text-slate-500">
                  ⌘K
                </kbd>
              </button>

              {/* Mobile Search Icon */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-all hover:bg-white/10 sm:hidden"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>


              {/* Profile Menu Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((s) => !s)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-gradient-to-b from-slate-700 to-slate-800 text-sm font-semibold text-white shadow-inner transition-all hover:scale-105 active:scale-95"
                >
                  {isLoggedIn ? (userEmail ? userEmail[0].toUpperCase() : "U") : "?"}
                  {/* Status Dot */}
                  <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[#030712] ${isLoggedIn ? "bg-emerald-500" : "bg-slate-500"}`} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-4 w-56 origin-top-right rounded-2xl border border-white/10 bg-[#0f172a]/90 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="mb-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Signed in as</p>
                      <p className="truncate text-sm font-bold text-white max-w-[180px]">
                        {isLoggedIn ? (userEmail || "Trader") : "Guest"}
                      </p>
                    </div>

                    {isLoggedIn ? (
                      <>
                        <Link
                          href="/account"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                          onClick={() => setMenuOpen(false)}
                        >
                          Profile Settings
                        </Link>
                        <Link
                          href="/holdings"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                          onClick={() => setMenuOpen(false)}
                        >
                          Holdings
                        </Link>
                        <Link
                          href="/wallet"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                          onClick={() => setMenuOpen(false)}
                        >
                          Wallet
                        </Link>
                        <div className="h-px w-full bg-white/5 my-1" />
                        <button
                          type="button"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                          onClick={handleSignOut}
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/wallet"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                          onClick={() => setMenuOpen(false)}
                        >
                          Wallet
                        </Link>
                        <Link
                          href="/login"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors font-semibold"
                          onClick={() => setMenuOpen(false)}
                        >
                          Sign In
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      {/* Spacer for fixed nav */}
      <div className="h-16" />
    </>
  );
}
