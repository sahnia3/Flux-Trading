"use client";

import {
  CandlestickData,
  ColorType,
  CrosshairMode,
  HistogramData,
  LineData,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";

type Candle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type Props = {
  symbol: string;
  resolution: string;
  rangeSeconds?: number;
  style: "candle" | "line";
  showVolume: boolean;
  showMA: boolean;
  showRSI: boolean; // placeholder, not drawn yet
  latestPrice?: number;
};

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const toUtc = (value: number): UTCTimestamp =>
  Math.floor(Number(value) || 0) as UTCTimestamp;

// Gentle synthetic series when we have only a price.
const generatePriceSeries = (price: number, rangeSeconds?: number): Candle[] => {
  const now = Math.floor(Date.now() / 1000);
  const span = rangeSeconds ?? 30 * 24 * 60 * 60; // 30d
  const points = 120;
  const step = Math.max(300, Math.floor(span / points)); // >=5m spacing
  const start = now - span;
  const jitter = Math.max(price * 0.002, 0.1); // ~0.2% wobble
  let p = price;
  const out: Candle[] = [];
  for (let i = 0; i < points; i++) {
    const drift = (Math.random() - 0.5) * jitter;
    const open = p + drift;
    const close = open + (Math.random() - 0.5) * jitter;
    const high = Math.max(open, close) + jitter * 0.4;
    const low = Math.min(open, close) - jitter * 0.4;
    out.push({ time: start + i * step, open, high, low, close, volume: 0 });
    p = close;
  }
  return out;
};

// Fully synthetic fallback when no price is known.
const generateFallback = (rangeSeconds?: number, basePrice?: number): Candle[] => {
  const now = Math.floor(Date.now() / 1000);
  const span = rangeSeconds ?? 30 * 24 * 60 * 60;
  const points = 90;
  const step = Math.max(300, Math.floor(span / points));
  const start = now - span;
  let price = basePrice ?? 100;
  const out: Candle[] = [];
  for (let i = 0; i < points; i++) {
    const drift = (Math.random() - 0.5) * Math.max(price * 0.002, 0.2);
    const open = price + drift;
    const close = open + (Math.random() - 0.5) * Math.max(price * 0.002, 0.2);
    const high = Math.max(open, close) + Math.max(price * 0.001, 0.1);
    const low = Math.min(open, close) - Math.max(price * 0.001, 0.1);
    out.push({ time: start + i * step, open, high, low, close, volume: 0 });
    price = close;
  }
  return out;
};

const movingAverage = (candles: Candle[], length = 9): LineData[] => {
  const result: LineData[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i + 1 < length) continue;
    const slice = candles.slice(i + 1 - length, i + 1);
    const avg = slice.reduce((sum, c) => sum + c.close, 0) / Math.max(length, 1);
    result.push({ time: toUtc(candles[i].time), value: avg });
  }
  return result;
};

export function AssetChart({
  symbol,
  resolution,
  rangeSeconds,
  style,
  showVolume,
  showMA,
  latestPrice,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [quoteVolume, setQuoteVolume] = useState<number | null>(null);

  // Fetch live quote volume from Finnhub (best-effort)
  useEffect(() => {
    if (!symbol) return;
    const token = process.env.NEXT_PUBLIC_FINNHUB_KEY;
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.v === "number") {
          setQuoteVolume(data.v);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    const timer = setInterval(load, 60_000); // refresh every minute
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [symbol]);

  // Fetch OHLC data
  useEffect(() => {
    if (!symbol || !resolution) return;
    let cancelled = false;
    const now = Math.floor(Date.now() / 1000);
    const from = rangeSeconds ? now - rangeSeconds : now - 180 * 24 * 60 * 60; // ~6 months

    const load = async () => {
      try {
        const res = await fetch(
          `${apiBase}/api/market-data/${symbol}/${resolution}?from=${from}&to=${now}`,
        );
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        const parsed = Array.isArray(data)
          ? (data
              .filter((c) => c && typeof c.time !== "undefined" && typeof c.open !== "undefined")
              .map((c) => ({
                time: Number(c.time),
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
                volume: typeof c.volume === "number" ? Number(c.volume) : undefined,
              })) as Candle[])
          : [];
        if (!cancelled) setCandles(parsed);
      } catch {
        if (!cancelled) setCandles([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [symbol, resolution, rangeSeconds]);

  const chartData = useMemo<Candle[]>(() => {
    if (candles.length > 0) return candles;
    if (latestPrice) return generatePriceSeries(latestPrice, rangeSeconds);
    return generateFallback(rangeSeconds, latestPrice);
  }, [candles, latestPrice, rangeSeconds]);

  // Render chart
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: { borderColor: "rgba(255,255,255,0.1)" },
    });

    const handleResize = () => chart.applyOptions({ width: el.clientWidth });
    window.addEventListener("resize", handleResize);

    if (style === "candle") {
      const candleSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        borderUpColor: "#22c55e",
        wickUpColor: "#22c55e",
        downColor: "#ef4444",
        borderDownColor: "#ef4444",
        wickDownColor: "#ef4444",
      });
      const mapped: CandlestickData[] = chartData.map((c) => ({
        time: toUtc(c.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      candleSeries.setData(mapped);
      if (latestPrice) {
        candleSeries.createPriceLine({
          price: latestPrice,
          color: "#0ea5e9",
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "Live",
        });
      }
    } else {
      const areaSeries = chart.addAreaSeries({
        lineColor: "#22c55e",
        topColor: "rgba(34,197,94,0.25)",
        bottomColor: "rgba(34,197,94,0.05)",
        lineWidth: 2,
      });
      const lineData: LineData[] = chartData.map((c) => ({
        time: toUtc(c.time),
        value: c.close,
      }));
      areaSeries.setData(lineData);
      if (latestPrice) {
        areaSeries.createPriceLine({
          price: latestPrice,
          color: "#0ea5e9",
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "Live",
        });
      }
    }

    if (showVolume) {
      const volSeries = chart.addHistogramSeries({
        color: "rgba(148,163,184,0.6)",
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
        priceLineVisible: false,
      });
      volSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      const volData: HistogramData[] = chartData.map((c) => ({
        time: toUtc(c.time),
        // Prefer candle volume; fall back to live quote volume; otherwise synthesize small value.
        value:
          typeof c.volume === "number" && c.volume > 0
            ? c.volume
            : quoteVolume && quoteVolume > 0
              ? quoteVolume
              : Math.max(Math.abs(c.close - c.open) * 1000, 1),
        color: c.close >= c.open ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)",
      }));
      volSeries.setData(volData);
    }

    if (showMA && chartData.length > 0) {
      const maSeries = chart.addLineSeries({
        color: "#38bdf8",
        lineWidth: 2,
      });
      maSeries.setData(movingAverage(chartData, 9));
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [chartData, style, showVolume, showMA]);

  return <div ref={containerRef} className="w-full" />;
}
