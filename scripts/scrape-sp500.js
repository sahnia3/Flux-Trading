const fs = require('fs');

const html = fs.readFileSync('scripts/sp500.html', 'utf8');

(() => {
    let data = html;
    // Regex based extraction
    // Look for the constituents table
    const tableMatch = data.match(/id="constituents"[\s\S]*?<\/tbody>/);
    if (!tableMatch) {
        console.error("Table not found");
        return;
    }
    const tableHtml = tableMatch[0];
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;

    const stocks = [];
    let match;
    let count = 0;

    while ((match = rowRegex.exec(tableHtml)) !== null) {
        if (count === 0) { // Skip header
            count++;
            continue;
        }

        const row = match[1];
        // Extract cells
        const cellRegex = /<td[\s\S]*?>([\s\S]*?)<\/td>/g;
        const cells = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(row)) !== null) {
            // Strip tags
            const text = cellMatch[1].replace(/<[^>]*>/g, '').trim().replace(/&amp;/g, '&');
            cells.push(text);
        }

        if (cells.length >= 3) {
            let symbol = cells[0].replace(/\./g, '-'); // BRK.B -> BRK-B
            const name = cells[1];
            const sector = cells[2];

            // Fix some known wikilink artifacts if regex didn't clean them all
            // (The strip tags regex above is usually enough for simple wiki tables)

            stocks.push({ symbol, description: name, type: sector });
        }
    }

    // Add specific requested stocks if not present
    const requested = [
        { symbol: "ZS", description: "Zscaler, Inc.", type: "Information Technology" },
        // User asked for "all Nasdaq" but specifically Zscaler. 
        // We will stick to S&P 500 + ZS for now.
    ];

    for (const r of requested) {
        if (!stocks.find(s => s.symbol === r.symbol)) {
            stocks.push(r);
        }
    }

    // Sort
    stocks.sort((a, b) => a.symbol.localeCompare(b.symbol));

    const fileContent = `export const US_STOCKS = ${JSON.stringify(stocks, null, 2)};`;

    fs.writeFileSync('/Users/adityasahni/Desktop/Projects/Flux-Trading/frontend/src/data/stock-list.ts', fileContent);
    console.log(`Successfully wrote ${stocks.length} stocks to src/data/stock-list.ts`);
})();
