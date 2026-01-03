
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getMultiBars } from './src/lib/alpaca';
import yahooFinance from 'yahoo-finance2';
import { COMMODITY_ETFS } from './src/data/commodity-list';

async function main() {
    // 1. Verify Env Vars
    const key = process.env.NEXT_PUBLIC_ALPACA_KEY;
    console.log("Alpaca Key loaded?", key ? `Yes (starts with ${key.substring(0, 4)})` : "NO");

    // 2. Test Yahoo Detailed
    console.log("\n--- DEBUGGING FOREX (Yahoo Detailed) ---");
    const symbol = "EURUSD=X";
    try {
        console.log(`Fetching ${symbol}...`);
        const q = await yahooFinance.quote(symbol);
        console.log("Success:", JSON.stringify(q, null, 2));
    } catch (e: any) {
        console.error("Yahoo Failed!");
        console.error("Error Name:", e.name);
        console.error("Error Message:", e.message);
        if (e.errors) console.error("Validation Errors:", JSON.stringify(e.errors, null, 2));
    }

    // 3. Test Alpaca with verified key
    if (key) {
        console.log("\n--- DEBUGGING COMMODITIES (Alpaca Single) ---");
        try {
            const bar = await getMultiBars(["GLD"]);
            console.log("Alpaca Result:", JSON.stringify(bar, null, 2));
        } catch (e: any) {
            console.error("Alpaca Error:", e.message);
        }
    }
}

main();
