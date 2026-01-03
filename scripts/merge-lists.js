const fs = require('fs');
const path = require('path');

// Read existing S&P 500 list (we'll just read the file and extract the JSON part to avoid TS execution issues)
const sp500Content = fs.readFileSync('/Users/adityasahni/Desktop/Projects/Flux-Trading/frontend/src/data/stock-list.ts', 'utf8');
const sp500JsonMatch = sp500Content.match(/export const US_STOCKS = (\[[\s\S]*?\]);/);

if (!sp500JsonMatch) {
    console.error("Could not parse existing stock-list.ts");
    process.exit(1);
}

const sp500 = JSON.parse(sp500JsonMatch[1]);

// Read Nasdaq 100
const nasdaq100 = JSON.parse(fs.readFileSync('scripts/nasdaq100_data.json', 'utf8'));

// Specific requests
const extraRequests = [
    { symbol: "ZS", description: "Zscaler, Inc.", type: "Information Technology" },
    { symbol: "CRWD", description: "CrowdStrike Holdings, Inc.", type: "Information Technology" },
    { symbol: "PLTR", description: "Palantir Technologies Inc.", type: "Information Technology" },
    { symbol: "SQ", description: "Block, Inc.", type: "Information Technology" },
    { symbol: "COIN", description: "Coinbase Global, Inc.", type: "Financials" },
    { symbol: "DASH", description: "DoorDash, Inc.", type: "Consumer Discretionary" },
    { symbol: "NET", description: "Cloudflare, Inc.", type: "Information Technology" },
    { symbol: "SNOW", description: "Snowflake Inc.", type: "Information Technology" }
];

// Merge
const map = new Map();

// Initial map with S&P 500
// Normalize keys to upper case for robust checking
sp500.forEach(s => {
    map.set(s.symbol.toUpperCase(), s);
});

// Add Nasdaq 100 (only if not present)
let nasdaqAdded = 0;
nasdaq100.forEach(s => {
    const key = s.symbol.toUpperCase();
    if (!map.has(key)) {
        // Validation: Symbol shouldn't be too long (likely an error if so)
        if (s.symbol.length <= 6 && !s.symbol.includes(' ')) {
            map.set(key, s);
            nasdaqAdded++;
        }
    }
});
console.log(`Added ${nasdaqAdded} unique Nasdaq 100 stocks not in S&P 500`);

// Add extras
extraRequests.forEach(s => {
    const key = s.symbol.toUpperCase();
    if (!map.has(key)) {
        map.set(key, s);
    }
});

const merged = Array.from(map.values());
merged.sort((a, b) => a.symbol.localeCompare(b.symbol));

const fileContent = `export const US_STOCKS = ${JSON.stringify(merged, null, 2)};`;

fs.writeFileSync('/Users/adityasahni/Desktop/Projects/Flux-Trading/frontend/src/data/stock-list.ts', fileContent);
console.log(`Successfully merged lists. Total stocks: ${merged.length}`);
