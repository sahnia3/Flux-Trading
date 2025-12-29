"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const api = useCallback(async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || "Request failed");
    }
    return res.json();
  }, []);

  const submit = async () => {
    try {
      const endpoint = mode === "login" ? "/login" : "/register";
      const res = await api(endpoint, { email, password });
      const token = res.token as string;
      sessionStorage.setItem("flux_token", token);
      setMessage("Success! Redirecting…");
      router.push("/");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4">
        <div className="mb-6 text-sm">
          <Link href="/" className="text-emerald-300 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-900/40 p-6 shadow-2xl shadow-black/50">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Auth
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">Login / Register</h1>
          <div className="mt-4 flex gap-2 text-sm">
            <button
              className={`rounded-lg px-3 py-1 ${mode === "login" ? "bg-emerald-500 text-emerald-900" : "bg-slate-800 text-slate-200"}`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              className={`rounded-lg px-3 py-1 ${mode === "register" ? "bg-emerald-500 text-emerald-900" : "bg-slate-800 text-slate-200"}`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <input
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
              placeholder="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-400"
              onClick={submit}
            >
              {mode === "login" ? "Login" : "Register"}
            </button>
            {message && <p className="text-xs text-slate-300">{message}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
