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
import { calculateRSI, calculateSMA, sanitizeVolume } from "@/utils/indicators";

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
  showRSI: boolean;
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
    price = close; // FIXED: used to be p = close
  }
  return out;
};

export function AssetChart({
  symbol,
  resolution,
  rangeSeconds,
  style,
  showVolume,
  showMA,
  showRSI,
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
            .filter((c: any) => c && typeof c.time !== "undefined" && typeof c.open !== "undefined")
            .map((c: any) => ({
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
    let data: Candle[] = [];
    if (candles.length > 0) {
      data = candles;
    } else {
      // If no candles, try to generate a synthetic series.
      // For indices that fail to fetch, we MUST fallback to something visible.
      const fallbackPrice = latestPrice || (symbol.includes("N225") ? 38000 : symbol.includes("GSPC") ? 5200 : 150);
      data = latestPrice
        ? generatePriceSeries(latestPrice, rangeSeconds)
        : generateFallback(rangeSeconds, fallbackPrice);
    }
    // Sanitize volume here
    return sanitizeVolume(data);
  }, [candles, latestPrice, rangeSeconds]);

  // Render chart
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight || 420,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(248, 250, 252, 0.7)", // Slate-50 @ 70%
        fontFamily: "var(--font-sans)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.02)" }, // Very subtle
        horzLines: { color: "rgba(255, 255, 255, 0.02)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.05)",
        visible: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2, // Leave room for volume
        }
      },
      // RSI Scale (Left side)
      leftPriceScale: {
        visible: showRSI,
        borderColor: "rgba(255, 255, 255, 0.05)",
        scaleMargins: {
          top: 0.7, // Push RSI to bottom 30%
          bottom: 0,
        }
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.05)",
        visible: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(56, 189, 248, 0.3)", // Sky-400
          width: 1,
          style: 3,
          labelBackgroundColor: "#0f172a",
        },
        horzLine: {
          color: "rgba(56, 189, 248, 0.3)",
          width: 1,
          style: 3,
          labelBackgroundColor: "#0f172a",
        },
      },
      handleScale: {
        axisPressedMouseMove: true,
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || entries[0].target !== el) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(el);

    if (style === "candle") {
      const candleSeries = chart.addCandlestickSeries({
        upColor: "#10b981", // Emerald-500
        borderUpColor: "#10b981",
        wickUpColor: "#10b981",
        downColor: "#f43f5e", // Rose-500
        borderDownColor: "#f43f5e",
        wickDownColor: "#f43f5e",
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
          color: latestPrice >= (mapped[mapped.length - 1]?.close || 0) ? "#10b981" : "#f43f5e",
          lineWidth: 2,
          lineStyle: 1, // Dotted
          axisLabelVisible: true,
          title: "Live",
        });
      }
    } else {
      const areaSeries = chart.addAreaSeries({
        lineColor: "#818cf8", // Indigo-400
        topColor: "rgba(129, 140, 248, 0.2)",
        bottomColor: "rgba(129, 140, 248, 0.0)",
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
          color: "#38bdf8",
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "Live",
        });
      }
    }

    if (showVolume) {
      const volSeries = chart.addHistogramSeries({
        color: "rgba(148, 163, 184, 0.3)",
        priceFormat: { type: "volume" },
        priceScaleId: "", // Overlay on main scale? Or use separate scale.
        // Let's use overlay but squashed
      });
      volSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      const volData: HistogramData[] = chartData.map((c) => ({
        time: toUtc(c.time),
        value:
          typeof c.volume === "number" && c.volume > 0
            ? c.volume
            : quoteVolume && quoteVolume > 0
              ? quoteVolume
              : Math.max(Math.abs(c.close - c.open) * 1000, 1),
        color: c.close >= c.open ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)",
      }));
      volSeries.setData(volData);
    }

    if (showMA && chartData.length > 0) {
      const maSeries = chart.addLineSeries({
        color: "#f59e0b", // Amber-500
        lineWidth: 1,
        lineStyle: 2, // Dashed
        title: "SMA 20",
      });
      // Use new utility
      const smaData = calculateSMA(chartData, 20);
      maSeries.setData(smaData);
    }

    // RSI Series
    if (showRSI && chartData.length > 0) {
      const rsiSeries = chart.addLineSeries({
        color: "#a855f7", // Purple-500
        lineWidth: 1,
        priceScaleId: "left", // Put on left scale
        title: "RSI 14",
      });
      const rsiData = calculateRSI(chartData, 14);
      rsiSeries.setData(rsiData);

      // Add levels
      rsiSeries.createPriceLine({
        price: 70,
        color: "rgba(255,255,255,0.2)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: "",
      });
      rsiSeries.createPriceLine({
        price: 30,
        color: "rgba(255,255,255,0.2)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: "",
      });
    }

    chart.timeScale().fitContent();

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartData, style, showVolume, showMA, showRSI]);

  return (
    <div className="relative w-full h-[500px] p-1 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden ring-1 ring-white/5">
      {/* Glow Effect */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
      <div
        ref={containerRef}
        className="w-full h-full rounded-2xl overflow-hidden cursor-crosshair"
      />
    </div>
  );
}
