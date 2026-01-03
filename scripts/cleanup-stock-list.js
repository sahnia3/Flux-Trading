const fs = require('fs');

const filePath = '/Users/adityasahni/Desktop/Projects/Flux-Trading/frontend/src/data/stock-list.ts';
const content = fs.readFileSync(filePath, 'utf8');
const jsonMatch = content.match(/export const US_STOCKS = (\[[\s\S]*?\]);/);

if (!jsonMatch) {
    console.error("Could not parse stock-list.ts");
    process.exit(1);
}

const stocks = JSON.parse(jsonMatch[1]);
console.log(`Initial count: ${stocks.length}`);

// 1. Identify and remove garbage "Symbol as Name" entries
// The bad entries from the failed scrape looked like: { symbol: "Adobe Inc-", description: "ADBE", ... }
// Real entries look like: { symbol: "ADBE", description: "Adobe Inc.", ... }

// Metric: Valid symbols are usually short (<=5 chars) and all caps.
const isValidSymbol = (s) => {
    // Regex for valid ticker: 1-5 chars, A-Z, optional dot or hyphen?
    // S&P 500 tickers are like BRK.B, BF.B. 
    // Nasdaq tickers are 1-4/5 chars.
    // Anything with a space or lowercase is definitely bad in this context.
    if (/[a-z]/.test(s)) return false; // has lowercase
    if (/\s/.test(s)) return false; // has space
    if (s.length > 6) return false; // too long
    return true;
};

const cleanList = [];
const seenSymbols = new Set();
// We want to prioritize the "Good" entries.
// The "Bad" entries usually have a description that matches a ticker (short, caps).
// The "Good" entries have a description that is a Company Name (Longer, title case).

// Heuristic: If we have duplicates, prefer the one with the longer description?
// Or simply: Valid Symbol is strict.

let badCount = 0;
let duplicatesCount = 0;

// Sort by symbol length? or just process.
// Let's filter first for validity.
const validCandidates = stocks.filter(s => {
    if (!isValidSymbol(s.symbol)) {
        // console.log(`Removing invalid symbol: ${s.symbol}`);
        badCount++;
        return false;
    }
    return true;
});

// Now deduplicate. 
// If we catch a duplicate, we need to pick the "Better" one.
// Usually the first one encountered if we trust the original list order?
// But the list is mixed.
// Let's group by symbol.
const buckets = new Map();

validCandidates.forEach(s => {
    const key = s.symbol.toUpperCase();
    if (!buckets.has(key)) {
        buckets.set(key, []);
    }
    buckets.get(key).push(s);
});

buckets.forEach((items, key) => {
    if (items.length === 1) {
        cleanList.push(items[0]);
    } else {
        duplicatesCount++;
        // Multiple entries for same symbol. Pick the best one.
        // Prefer the one where description !== symbol
        // Prefer the one where description is longer.
        items.sort((a, b) => b.description.length - a.description.length);
        cleanList.push(items[0]);
    }
});

// Sort final list
cleanList.sort((a, b) => a.symbol.localeCompare(b.symbol));

const newContent = `export const US_STOCKS = ${JSON.stringify(cleanList, null, 2)};`;
fs.writeFileSync(filePath, newContent);

console.log(`Final count: ${cleanList.length}`);
console.log(`Removed ${badCount} invalid symbols (e.g. 'Adobe Inc-')`);
console.log(`Resolved ${duplicatesCount} duplicates`);
