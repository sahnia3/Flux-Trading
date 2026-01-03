import { NextResponse } from "next/server";

const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_KEY;

// Top US Stocks for default view
import { CRYPTO_ASSETS } from "@/data/crypto-list";
import { US_STOCKS } from "@/data/stock-list";

// Top US Stocks for default view
// Replaced hardcoded list with S&P 500 + user requests
const POPULAR_STOCKS = US_STOCKS;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const type = searchParams.get("type");

    // Handle Crypto Request
    if (type === "crypto") {
        const assets = CRYPTO_ASSETS.map(c => ({
            symbol: c.type === "etf" ? c.symbol : `BINANCE:${c.symbol}USDT`, // Tech symbol for charts
            description: c.name,
            displaySymbol: c.symbol, // Clean symbol for UI
            type: c.type === "etf" ? "ETF" : "Crypto",
            logo: c.logo,
            id: c.id
        }));

        if (!q) return NextResponse.json(assets);
        const filtered = assets.filter(c =>
            c.description.toLowerCase().includes(q.toLowerCase()) ||
            c.displaySymbol.toLowerCase().includes(q.toLowerCase())
        );
        return NextResponse.json(filtered);
    }

    // Handle Stock Request (Default)
    if (!q) {
        return NextResponse.json(POPULAR_STOCKS);
    }

    if (!FINNHUB_KEY) {
        // Fallback if no key, just filter popular
        const filtered = POPULAR_STOCKS.filter(s =>
            s.symbol.toLowerCase().includes(q.toLowerCase()) ||
            s.description.toLowerCase().includes(q.toLowerCase())
        );
        return NextResponse.json(filtered);
    }

    try {
        const res = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB_KEY}`);
        if (!res.ok) throw new Error("Finnhub error");
        const data = await res.json();

        // Transform Finnhub result to our SymbolItem format
        // Finnhub returns { count, result: [{ description, displaySymbol, symbol, type }] }
        // We want to prioritize US stocks (Common Stock)
        const items = data.result || [];

        // Simple dedupe and format
        const formatted = items.map((i: any) => ({
            symbol: i.symbol,
            description: i.description,
            displaySymbol: i.displaySymbol,
            type: i.type
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error("Search API Error:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
