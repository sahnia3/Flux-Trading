
const yahooFinance = require('yahoo-finance2').default;

async function testYahoo() {
    console.log("Testing Yahoo Finance Connection...");
    try {
        const symbol = "^GSPC";
        console.log(`Fetching ${symbol}...`);

        // Try strict quoteSummary as implemented
        const summary = await yahooFinance.quoteSummary(symbol, { modules: ['price'] });
        console.log("Success! Result:");
        console.log(JSON.stringify(summary, null, 2));
    } catch (e) {
        console.error("Yahoo Finance Failed:");
        console.error(e);
    }
}

testYahoo();
