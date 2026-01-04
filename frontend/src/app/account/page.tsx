"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AccountPage() {
    const [user, setUser] = useState<{ email: string } | null>(null);

    useEffect(() => {
        // In a real app, fetch from backend via /api/me
        const token = sessionStorage.getItem("flux_token");
        if (token) {
            // Mock user data for UI demo
            setUser({ email: "demo@flux.trade" });
        }
    }, []);

    if (!user) {
        return (
            <main className="min-h-screen pt-24 pb-20 px-4">
                <div className="max-w-xl mx-auto text-center">
                    <h1 className="text-2xl font-bold text-slate-100 mb-4">Access Denied</h1>
                    <p className="text-slate-400 mb-8">Please sign in to view your profile.</p>
                    <Link href="/login" className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 px-6 rounded-lg transition-colors">
                        Sign In
                    </Link>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen pt-24 pb-20 px-4">
            <div className="max-w-2xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-slate-100">Account Settings</h1>
                    <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Profile Card */}
                <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
                    <h2 className="text-lg font-semibold text-slate-200 border-b border-white/5 pb-2">Profile Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">Email Address</label>
                            <div className="text-slate-200 font-medium">{user.email}</div>
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">Account Type</label>
                            <div className="text-emerald-400 font-bold bg-emerald-500/10 inline-block px-2 py-0.5 rounded text-sm">Pro (Demo)</div>
                        </div>
                    </div>
                </div>

                {/* Preferences */}
                <div className="glass p-6 rounded-2xl border border-white/10 space-y-6 opacity-60 pointer-events-none grayscale">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <h2 className="text-lg font-semibold text-slate-200">Preferences</h2>
                        <span className="text-xs text-slate-500 border border-slate-700 px-2 py-0.5 rounded">Coming Soon</span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-slate-200">Dark Mode</div>
                                <div className="text-xs text-slate-500">Adjust the appearance of the platform</div>
                            </div>
                            <div className="w-10 h-6 bg-emerald-500 rounded-full relative">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow"></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-slate-200">Trading Notifications</div>
                                <div className="text-xs text-slate-500">Receive alerts for filled orders</div>
                            </div>
                            <div className="w-10 h-6 bg-slate-700 rounded-full relative">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full shadow"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
                    <h2 className="text-lg font-semibold text-slate-200 border-b border-white/5 pb-2">Security</h2>

                    <button disabled className="w-full text-left p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors flex justify-between items-center group cursor-not-allowed">
                        <div>
                            <div className="text-sm font-medium text-slate-200 group-hover:text-white">Change Password</div>
                            <div className="text-xs text-slate-500">Update your account password</div>
                        </div>
                        <span className="text-xs text-slate-600">Disabled in Demo</span>
                    </button>
                </div>

            </div>
        </main>
    );
}
