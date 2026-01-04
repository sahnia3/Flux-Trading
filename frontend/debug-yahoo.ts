
import yahooFinance from 'yahoo-finance2';

async function main() {
    console.log("--- DEBUG: Yahoo Finance (Commodities) ---");
    // Removed suppressNotices

    try {
        const symbol = "GLD";
        console.log(`Fetching ${symbol}...`);
        const q = await yahooFinance.quote(symbol);
        console.log("Result:", JSON.stringify(q, null, 2));
    } catch (e: any) {
        console.error("Yahoo Error:", e.message);
    }
}

main();
