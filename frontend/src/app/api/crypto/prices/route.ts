import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");
    if (!ids) return NextResponse.json({});

    try {
        // Proxy to CoinGecko
        // Note: Free API has rate limits (approx 10-30/min). 
        // In a real app we would cache this response for 60s.
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`, {
            headers: {
                "Accept": "application/json"
            },
            next: { revalidate: 60 } // Cache for 1 min
        });

        if (!res.ok) {
            console.error("CoinGecko Error:", res.status, res.statusText);
            // Return empty object on error so UI doesn't break
            return NextResponse.json({});
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e) {
        console.error("Price Proxy Error:", e);
        return NextResponse.json({}, { status: 500 });
    }
}
