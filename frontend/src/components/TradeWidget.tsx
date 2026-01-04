"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type OrderType = "market" | "limit" | "stop";
type OrderSide = "buy" | "sell";

interface TradeWidgetProps {
    symbol?: string; // Optional, can be typed in if global
    defaultSide?: OrderSide;
    initialPrice?: number;
    className?: string;
    onOrderPlaced?: () => void;
}

// Fetch live price - prioritizes CoinGecko for crypto, Finnhub for stocks
async function fetchLivePrice(symbol: string): Promise<number | null> {
    const cryptoMap: Record<string, string> = {
        'BTC': 'bitcoin', 'ETH': 'ethereum', 'XRP': 'ripple',
        'ADA': 'cardano', 'SOL': 'solana', 'DOGE': 'dogecoin',
        'AVAX': 'avalanche-2', 'DOT': 'polkadot', 'MATIC': 'matic-network',
        'LINK': 'chainlink', 'UNI': 'uniswap', 'SHIB': 'shiba-inu'
    };

    try {
        // Check if crypto FIRST (prioritize CoinGecko for accuracy)
        if (cryptoMap[symbol]) {
            const cgRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoMap[symbol]}&vs_currencies=usd`);
            if (cgRes.ok) {
                const cgData = await cgRes.json();
                if (cgData[cryptoMap[symbol]]?.usd) {
                    return cgData[cryptoMap[symbol]].usd;
                }
            }
        }

        // For stocks, use Finnhub
        const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_KEY;
        if (finnhubKey) {
            const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`);
            if (res.ok) {
                const data = await res.json();
                if (data.c > 0) return data.c;
            }
        }

        return null;
    } catch {
        return null;
    }
}

export function TradeWidget({
    symbol: defaultSymbol = "",
    defaultSide = "buy",
    initialPrice,
    className = "",
    onOrderPlaced,
}: TradeWidgetProps) {
    const [symbol, setSymbol] = useState(defaultSymbol);
    const [side, setSide] = useState<OrderSide>(defaultSide);
    const [type, setType] = useState<OrderType>("market");
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState<string>(initialPrice ? String(initialPrice) : "");
    const [loading, setLoading] = useState(false);
    const [fetchingPrice, setFetchingPrice] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // If props change, update state if needed (e.g. searching a new asset)
        if (defaultSymbol) setSymbol(defaultSymbol);
        if (initialPrice) setPrice(String(initialPrice));
    }, [defaultSymbol, initialPrice]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setToken(sessionStorage.getItem("flux_token"));
        }
    }, []);

    // Auto-fetch price when symbol changes and no initial price
    useEffect(() => {
        const fetchPrice = async () => {
            if (!symbol || price) return; // Skip if no symbol or price already set
            setFetchingPrice(true);
            const livePrice = await fetchLivePrice(symbol.toUpperCase());
            if (livePrice) {
                setPrice(String(livePrice.toFixed(2)));
            }
            setFetchingPrice(false);
        };

        const timer = setTimeout(fetchPrice, 300); // Debounce
        return () => clearTimeout(timer);
    }, [symbol]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setLoading(true);

        if (!token) {
            setMessage({ text: "Please sign in to trade.", type: "error" });
            setLoading(false);
            return;
        }

        const payload = {
            symbol: symbol.toUpperCase(),
            side,
            type,
            quantity: Number(quantity),
            price: type === "market" ? undefined : Number(price), // Market orders rely on backend executing at best
        };

        // For Market, if we have a known price, frontend might send it as estimate, 
        // but our backend handler expects 'price' for validation on wallet check currently.
        // Let's pass the price if it's set, even for market, as an "estimate".
        if (type === "market" && price) {
            payload.price = Number(price);
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/orders`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(text || "Request failed");
            }

            if (!res.ok) {
                throw new Error(data.error || "Order failed");
            }

            setMessage({ text: `Order placed: ${side.toUpperCase()} ${quantity} ${symbol}`, type: "success" });
            if (onOrderPlaced) onOrderPlaced();

            // Reset sensitive fields?
            // setQuantity(1);
        } catch (err) {
            setMessage({ text: err instanceof Error ? err.message : "Order failed", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`p-6 rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-md ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-100">Trade</h3>
                <div className="flex bg-slate-800/50 rounded-lg p-1">
                    <button
                        onClick={() => setSide("buy")}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${side === "buy" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-slate-200"
                            }`}
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => setSide("sell")}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${side === "sell" ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "text-slate-400 hover:text-slate-200"
                            }`}
                    >
                        Sell
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Symbol Input (if not fixed) */}
                {!defaultSymbol && (
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Asset</label>
                        <input
                            type="text"
                            required
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            placeholder="BTC, AAPL..."
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                        />
                    </div>
                )}

                {/* Order Type */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Order Type</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(["market", "limit", "stop"] as OrderType[]).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`px-2 py-2 text-xs font-medium rounded-lg border transition-all capitalized ${type === t
                                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                                    : "border-white/5 bg-slate-950/30 text-slate-400 hover:border-white/10 hover:text-slate-300"
                                    }`}
                            >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quantity */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Quantity</label>
                    <input
                        type="number"
                        required
                        min="0.000001"
                        step="any"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                    />
                </div>

                {/* Price (Conditional) */}
                <div className={`transition-all duration-300 overflow-hidden ${type === "market" ? "opacity-50" : "opacity-100"}`}>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                        {type === "market" ? "Estimated Price" : type === "stop" ? "Stop Price" : "Limit Price"}
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input
                            type="number"
                            required={type !== "market"}
                            min="0.01"
                            step="any"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            disabled={type === "market"} // Allow edit if not market? No, market takes current.
                            placeholder="0.00"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>

                {/* Total Estimate */}
                {quantity > 0 && Number(price) > 0 && (
                    <div className="flex justify-between text-xs px-1">
                        <span className="text-slate-500">Total Value</span>
                        <span className="text-slate-300 font-mono">
                            ${(quantity * Number(price)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                )}

                {/* Status Message */}
                {message && (
                    <div
                        className={`p-3 rounded-lg text-xs text-center border ${message.type === "success"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !token}
                    className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${side === "buy"
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/20"
                        : "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-rose-500/20"
                        }`}
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        `${side === "buy" ? "Buy" : "Sell"} ${symbol || "..."}`
                    )}
                </button>
            </form>
        </div>
    );
}
