# API Usage Model

This document outlines the nested API architecture used for fetching live prices, historical data, and fundamentals across Stocks, Indices, and Cryptocurrencies.

## Overview

The application uses a tiered approach with primary sources and automatic fallbacks to ensure data availability.

### 1. Stocks (US Equities)

*   **Primary Live Price**: **Alpaca**
    *   Used in the Markets Dashboard (`/markets`) to fetch real-time bars for the watchlisted stocks.
    *   Implementation: `frontend/src/lib/alpaca.ts`, `frontend/src/app/markets/page.tsx`.
*   **Backup Live Price**: **Finnhub**
    *   Used if Alpaca fails to return data for a symbol.
    *   Used as the fallback source for the individual Asset Detail page (`/asset/[symbol]`) if the WebSocket feed is unavailable.
    *   Implementation: `frontend/src/app/markets/page.tsx` (fallback logic), `frontend/src/app/asset/[symbol]/page.tsx`.
*   **Company Profile & Metrics**: **Finnhub**
    *   Fetch company logo, market cap, industry, P/E ratio, etc.
    *   Implementation: `backend/handlers/symbols.go` (`/stock/profile2`, `/stock/metric`).
*   **Backup Profile**: **Alpha Vantage**
    *   Used if Finnhub returns incomplete profile data (specifically missing market cap).
    *   Implementation: `backend/handlers/symbols.go` (Function: `OVERVIEW`).
*   **News**: **Finnhub** (Primary), **Alpha Vantage** (Backup).

### 2. Indices (SPY, QQQ, DIA)

*   **Source**: **Yahoo Finance**
    *   Implementation exists to fetch index data using `yahoo-finance2`.
    *   *Note*: Currently, the Markets Dashboard uses hardcoded fallback values for indices stability, but the infrastructure is set up to use Yahoo Finance.
    *   File: `frontend/src/lib/yahoo.ts`.

### 3. Cryptocurrencies

*   **Primary Price & List**: **CoinGecko**
    *   Fetches the top coins (Prices, 24h Change, Market Cap, Sparkline).
    *   Implementation: `frontend/src/app/markets/page.tsx`, `backend/handlers/symbols.go`.
*   **Rich Profile Data**: **CoinGecko**
    *   Used in the backend to fetch detailed description, homepage, and genesis date.
*   **Failsafe Profile**: **DeFi Llama**
    *   Used if CoinGecko fails to return profile data for a known crypto asset.
    *   Implementation: `backend/handlers/symbols.go` (Endpoint: `https://api.llama.fi`).
*   **News**: **CryptoCompare**
    *   Specifically used for fetching crypto-related news streams.
    *   Implementation: `backend/handlers/symbols.go` (Endpoint: `min-api.cryptocompare.com`).

### 4. Search & Symbol Resolution

*   **Provider**: **Finnhub**
    *   Symbol search (`/search`) is powered by Finnhub to resolve tickers and company names.

### Summary Table

| Asset Class | Data Type | Primary Source | Backup / Failsafe |
| :--- | :--- | :--- | :--- |
| **Stocks** | Live Price | Alpaca | Finnhub |
| | Fundamentals | Finnhub | Alpha Vantage |
| | News | Finnhub | Alpha Vantage |
| **Crypto** | Live Price | CoinGecko | - |
| | Profile | CoinGecko | DeFi Llama |
| | News | CryptoCompare | - |
| **Indices** | Live Price | Yahoo Finance | (Static Fallback) |
