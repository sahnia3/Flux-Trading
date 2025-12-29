"use client";

import {
  ColorType,
  LineData,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

type Props = {
  data: { time: number; value: number }[];
  height?: number;
  color?: string;
  gradient?: string;
};

const toUtc = (v: number): UTCTimestamp => Math.floor(v) as UTCTimestamp;

export function MarketSparkline({
  data,
  height = 60,
  color = "#22c55e",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || data.length === 0) return;
    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(0,0,0,0)",
      },
      grid: {
        vertLines: { color: "rgba(0,0,0,0)" },
        horzLines: { color: "rgba(0,0,0,0)" },
      },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
    });
    const series = chart.addAreaSeries({
      lineColor: color,
      topColor: `${color}33`,
      bottomColor: `${color}08`,
      lineWidth: 2,
    });
    const lineData: LineData[] = data.map((d) => ({
      time: toUtc(d.time),
      value: d.value,
    }));
    series.setData(lineData);

    const handleResize = () => {
      chart.applyOptions({ width: el.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, height, color]);

  return <div ref={ref} className="h-full w-full" />;
}
