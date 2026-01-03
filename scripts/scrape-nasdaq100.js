const fs = require('fs');

const html = fs.readFileSync('scripts/nasdaq100.html', 'utf8');

(() => {
    let data = html;
    // Look for the constituents table
    // The id usually is "constituents" or similar on wiki pages
    const tableMatch = data.match(/id="constituents"[\s\S]*?<\/tbody>/);
    let tableHtml;

    if (!tableMatch) {
        // Fallback: Nasdaq 100 page might use a different ID or structure. 
        // Searching for table with "Ticker" and "Company"
        const fallbackMatch = data.match(/<table class="wikitable sortable"[\s\S]*?<th>Ticker[\s\S]*?<\/tbody>/);
        if (!fallbackMatch) {
            console.error("Table not found");
            return;
        }
        tableHtml = fallbackMatch[0];
    } else {
        tableHtml = tableMatch[0];
    }

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

        if (cells.length >= 2) {
            // Wikipedia Nasdaq 100 table columns: Company, Ticker, GICS Sector, ...?
            // Let's verify typical column order: Company | Ticker | GICS Sector | GICS Sub-Industry
            // OR checks locally.

            // Wikipedia Nasdaq 100 table columns: Ticker | Company | ...
            let symbol = cells[0];
            let name = cells[1];
            let sector = cells[2];

            // Clean symbol
            symbol = symbol.replace(/\./g, '-');

            stocks.push({ symbol, description: name, type: sector });
        }
    }

    // Sort
    stocks.sort((a, b) => a.symbol.localeCompare(b.symbol));

    // Output to JSON file for merging
    fs.writeFileSync('scripts/nasdaq100_data.json', JSON.stringify(stocks, null, 2));
    console.log(`Successfully wrote ${stocks.length} Nasdaq 100 stocks to scripts/nasdaq100_data.json`);
})();
