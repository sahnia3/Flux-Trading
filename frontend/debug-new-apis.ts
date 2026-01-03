
const https = require('https');

// 1. Test Frankfurter (Forex)
function testFrankfurter() {
    console.log("--- DEBUG: Frankfurter (Forex) ---");
    const url = "https://api.frankfurter.app/latest?from=USD";

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log("USD->EUR:", json.rates.EUR);
                console.log("USD->JPY:", json.rates.JPY);
                console.log("USD->GBP:", json.rates.GBP);
                // Invert for EUR/USD
                console.log("EUR/USD (calc):", 1 / json.rates.EUR);
            } catch (e) {
                console.error("Frankfurter Parse Error:", e);
            }
        });
    }).on('error', (e) => console.error("Frankfurter Error:", e));
}

// 2. Test Finnhub (Commodities)
function testFinnhub() {
    console.log("\n--- DEBUG: Finnhub (Commodities) ---");
    // Retrieve key from process env if running with header, but here hard to pass.
    // I will try to read from env var strictly, assuming I run with 'NEXT_PUBLIC_FINNHUB_KEY=... npx tsx ...'
    // Or I'll just print instructions to run it.
    const key = process.env.NEXT_PUBLIC_FINNHUB_KEY;
    if (!key) {
        console.log("Skipping Finnhub test (No KEY in env). Run with: NEXT_PUBLIC_FINNHUB_KEY=... npx tsx debug-new-apis.ts");
        return;
    }

    const symbol = "GLD";
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`;
    console.log("Fetching:", url.replace(key, "REDACTED"));

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log(`Price for ${symbol}:`, json.c); // c = current price
                console.log(`Prev Close for ${symbol}:`, json.pc);
            } catch (e) {
                console.error("Finnhub Parse Error:", e);
            }
        });
    }).on('error', (e) => console.error("Finnhub Error:", e));
}

testFrankfurter();
testFinnhub();
