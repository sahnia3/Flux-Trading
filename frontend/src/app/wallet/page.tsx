"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function WalletPage() {
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState(1000);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("flux_token");
    if (stored) setToken(stored);
  }, []);

  const fetchBalance = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/portfolio`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      setBalance(data.balance);
      setCurrency(data.currency);
    } catch {
      setMessage("Failed to load wallet");
    }
  };

  useEffect(() => {
    void fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const topUp = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/wallet/topup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("fail");
      await fetchBalance();
      setMessage("Top-up successful");
    } catch {
      setMessage("Top-up failed");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Wallet</p>
            <h1 className="text-3xl font-semibold text-slate-50">Manage balance</h1>
            <p className="text-sm text-slate-400">
              Session-based login per tab. Add fake USD to trade.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-emerald-400"
          >
            ← Back home
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-900/40 p-6 shadow-2xl shadow-black/50">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Balance</p>
          <div className="mt-3 text-4xl font-semibold text-slate-50">
            {balance !== null ? `$${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}` : "—"}
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <label className="text-slate-300">Top up amount</label>
            <input
              type="number"
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <button
              className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-400 disabled:opacity-50"
              onClick={topUp}
              disabled={!token}
            >
              Top Up
            </button>
            {message && <p className="text-xs text-slate-300">{message}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
