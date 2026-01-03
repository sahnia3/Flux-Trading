import Alpaca from '@alpacahq/alpaca-trade-api';

// Initialize Alpaca client
// Note: We use process.env directly. Make sure NEXT_PUBLIC_ALPACA_KEY and NEXT_PUBLIC_ALPACA_SECRET are set in .env.local
// For server-side calls, we ideally use the non-public keys if available, but consistent naming helps.
const alpaca = new Alpaca({
    keyId: process.env.NEXT_PUBLIC_ALPACA_KEY || process.env.ALPACA_KEY,
    secretKey: process.env.NEXT_PUBLIC_ALPACA_SECRET || process.env.ALPACA_SECRET,
    paper: true, // Default to paper for free data usually
});

export interface BarData {
    t: string; // Timestamp
    o: number; // Open
    h: number; // High
    l: number; // Low
    c: number; // Close
    v: number; // Volume
}

export async function getLatestBar(symbol: string): Promise<BarData | null> {
    try {
        const bars = alpaca.getBarsV2(symbol, {
            start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Look back 3 days to ensure we get last close if weekend
            end: new Date().toISOString(),
            limit: 1,
            timeframe: '1Day',
        });

        for await (const bar of bars) {
            // Explicitly cast or map to match BarData interface
            const b = bar as any;
            return {
                t: b.t,
                o: b.o,
                h: b.h,
                l: b.l,
                c: b.c,
                v: b.v
            } as BarData;
        }
        return null;
    } catch (error) {
        console.warn(`Alpaca fetch failed for ${symbol}:`, error);
        return null;
    }
}

export async function getMultiBars(symbols: string[]) {
    const results: Record<string, BarData> = {};
    // Alpaca SDK might not support multi-symbol getBarsV2 directly in a single call easily for latest, 
    // but we can iterate.
    // Optimization: Use getLatestBars / snapshots if available in this SDK version, but getBarsV2 is robust for historical.

    // Attempt concurrent fetch
    await Promise.all(symbols.map(async (sym) => {
        const bar = await getLatestBar(sym);
        if (bar) results[sym] = bar;
    }));

    return results;
}

// Efficiently fetch snapshots for a large list of symbols (for Top Gainers/Losers)
export async function getMultiSnapshots(symbols: string[]) {
    try {
        // Chunking to avoid URL length issues or SDK limits (usually 1000 is safe, but let's be safe with 200)
        const chunkSize = 200;
        const allSnapshots: Record<string, any> = {};

        for (let i = 0; i < symbols.length; i += chunkSize) {
            const chunk = symbols.slice(i, i + chunkSize);
            // @ts-ignore - The SDK types might be incomplete for getSnapshots in some versions
            const snapshots = await alpaca.getSnapshots(chunk);
            if (snapshots) {
                // snapshots is a Map or Object depending on SDK version. 
                // Usually array of Snapshot objects or keyed object.
                // Assuming keyed object or Map.
                if (snapshots instanceof Map) {
                    snapshots.forEach((val, key) => {
                        allSnapshots[key] = val;
                    });
                } else {
                    Object.assign(allSnapshots, snapshots);
                }
            }
        }

        return allSnapshots;
    } catch (e) {
        console.error("Alpaca MultiSnapshot Error:", e);
        return {};
    }
}

// Helper for Indices specifically (if Alpaca supports them via specific symbols like SPX)
export async function getIndexData(symbol: string) {
    // Note: Alpaca Free tier might not have direct Index data (SPX), usually it has SPY (ETF).
    // We will try fetching, but if it fails, the caller should handle fallback.
    return getLatestBar(symbol);
}
