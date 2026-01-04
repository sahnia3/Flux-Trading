
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getLatestBar } from './src/lib/alpaca';
import https from 'https';

async function testAlpaca() {
    console.log("--- Alpaca GLD ---");
    try {
        const bar = await getLatestBar("GLD");
        console.log("GLD Bar:", bar);
    } catch (e) {
        console.log("Alpaca Error:", e.message);
    }
}

function testFinnhub(sym: string) {
    const key = process.env.NEXT_PUBLIC_FINNHUB_KEY;
    const url = `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`;
    console.log(`--- Finnhub ${sym} ---`);
    https.get(url, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => console.log(`${sym} Data:`, d));
    });
}

async function main() {
    await testAlpaca();
    testFinnhub("AAPL");
    testFinnhub("GLD");
}

main();
