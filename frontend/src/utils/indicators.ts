/**
 * Technical Analysis Indicators
 */

import { LineData, WhitespaceData } from "lightweight-charts";

type DataPoint = {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
};

/**
 * Calculates Simple Moving Average (SMA)
 * @param data Array of candles or line data
 * @param period Lookback period (default 14)
 */
export function calculateSMA(data: DataPoint[], period: number = 20): LineData[] {
    const result: LineData[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            // Not enough data yet
            continue;
        }

        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        const avg = sum / period;

        result.push({
            time: data[i].time as any,
            value: avg,
        });
    }
    return result;
}

/**
 * Calculates Relative Strength Index (RSI)
 * @param data Array of candles
 * @param period Lookback period (default 14)
 */
export function calculateRSI(data: DataPoint[], period: number = 14): LineData[] {
    const result: LineData[] = [];

    if (data.length < period + 1) return [];

    // First RSI calculation uses SMA method for initial Avg Gain/Loss
    let gains = 0;
    let losses = 0;

    // Calculate initial average
    for (let i = 1; i <= period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Compute subsequent values using Wilder's Smoothing
    for (let i = period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        let currentGain = 0;
        let currentLoss = 0;

        if (change > 0) currentGain = change;
        else currentLoss = Math.abs(change);

        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

        let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        let rsi = 100 - (100 / (1 + rs));

        result.push({
            time: data[i].time as any,
            value: rsi,
        });
    }

    return result;
}

/**
 * Ensures volume data is never zero by using a heuristic if missing
 */
export function sanitizeVolume(data: DataPoint[]): DataPoint[] {
    return data.map(d => ({
        ...d,
        volume: (d.volume && d.volume > 0)
            ? d.volume
            : Math.floor(Math.abs(d.close - d.open) * 10000 + (Math.random() * 1000)) // Heuristic fallback
    }));
}
