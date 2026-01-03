"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  MarketVolumeChart,
  PsychologyRadarChart,
} from "@/components/learn/LearningCharts";
import { learnModules } from "@/data/learnModules";
import { createChart, ColorType } from "lightweight-charts";

// --- Candlestick Chart Component (Visual Lab) ---
function CandlestickDemo() {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      width: chartContainerRef.current.clientWidth,
      height: 384,
      grid: {
        vertLines: { color: "#334155" },
        horzLines: { color: "#334155" },
      },
      timeScale: { borderColor: "#334155" },
      rightPriceScale: { borderColor: "#334155" },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    const data = [
      { time: "2023-01-01", open: 114.5, high: 116, low: 114, close: 115 },
      { time: "2023-01-02", open: 115.5, high: 117, low: 115, close: 116 },
      { time: "2023-01-03", open: 116, high: 118, low: 116, close: 117.5 },
      { time: "2023-01-04", open: 117, high: 117, low: 115, close: 116 },
      { time: "2023-01-05", open: 117.5, high: 119, low: 117, close: 118 },
      { time: "2023-01-06", open: 118, high: 120, low: 118, close: 119.5 },
      { time: "2023-01-07", open: 119, high: 119, low: 117, close: 118 },
      { time: "2023-01-08", open: 119.5, high: 121, low: 119, close: 120 },
      { time: "2023-01-09", open: 120, high: 122, low: 120, close: 121 },
      { time: "2023-01-10", open: 121, high: 121, low: 119, close: 120.5 },
      { time: "2023-01-11", open: 121, high: 123, low: 121, close: 122 },
      { time: "2023-01-12", open: 122, high: 124, low: 122, close: 123 },
    ];

    candlestickSeries.setData(data as any);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  return <div ref={chartContainerRef} className="w-full h-96" />;
}

import { QuizSection } from "@/components/learn/QuizSection";

// ... (existing imports)

export default function LearnPage() {
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Score state only for top-level progress tracking
  const [moduleScores, setModuleScores] = useState<Record<string, number>>({});

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeModule = learnModules[activeModuleIndex];

  // Prevent hydration mismatch
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-50 font-sans selection:bg-cyan-500/30 pt-16">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* --- SIDEBAR (Curriculum) --- */}
          <aside className="lg:col-span-3">
            <div className="sticky top-24 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-4 px-2">Course Curriculum</h2>
                <div className="space-y-1">
                  {learnModules.map((module, idx) => {
                    const isActive = idx === activeModuleIndex;
                    const isComplete = moduleScores[module.id] !== undefined;

                    return (
                      <button
                        key={module.id}
                        onClick={() => {
                          setActiveModuleIndex(idx);
                          setActiveSectionIndex(0);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${isActive
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 font-medium shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                          : "bg-[#1e293b]/50 border-white/5 text-slate-400 hover:bg-[#1e293b] hover:text-slate-200"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Module {idx + 1}</span>
                          {isComplete && <span className="text-emerald-400 text-xs">✓ Done</span>}
                        </div>
                        <div className="font-semibold mt-1">{module.title}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                <h3 className="text-violet-300 font-bold mb-2 text-sm">Pro Tip</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Complete all quizzes to verify your knowledge. The visual lab below provides interactive demos for these concepts.
                </p>
              </div>
            </div>
          </aside>

          {/* --- MAIN CONTENT --- */}
          <main className="lg:col-span-9 space-y-12">

            {/* Header */}
            <div className="border-b border-slate-800 pb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold font-mono">
                  MODULE {activeModuleIndex + 1}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${activeModule.level === "Beginner" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                  activeModule.level === "Intermediate" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                    "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}>
                  {activeModule.level.toUpperCase()}
                </span>
              </div>
              <h1 className="text-4xl font-extrabold text-white mb-4">{activeModule.title}</h1>
              <p className="text-xl text-slate-400 leading-relaxed max-w-3xl">
                {activeModule.summary}
              </p>
            </div>

            {/* Content Sections */}
            <div className="space-y-16">
              {activeModule.sections.map((section, sIdx) => (
                <div key={sIdx} className="scroll-mt-32">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-slate-400 text-sm font-bold">
                      {sIdx + 1}
                    </span>
                    {section.heading}
                  </h2>
                  <ul className="space-y-4 mb-6">
                    {section.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex gap-4 p-4 rounded-xl bg-[#1e293b]/30 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2.5 flex-shrink-0" />
                        <span className="text-slate-300 leading-relaxed">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  {section.todoLinks && (
                    <div className="flex flex-wrap gap-2 pl-4">
                      {section.todoLinks.map((link, lIdx) => (
                        <span key={lIdx} className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-500 font-mono">
                          {link}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Module Quiz */}
            <div className="bg-gradient-to-br from-slate-900 to-[#0B1120] rounded-3xl border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Knowledge Check</h2>
                    <p className="text-slate-400 text-sm">Verify your understanding of {activeModule.title}</p>
                  </div>
                </div>

                <QuizSection
                  moduleId={activeModule.id}
                  quiz={activeModule.quiz}
                  onComplete={(score) => setModuleScores(prev => ({ ...prev, [activeModule.id]: score }))}
                />

              </div>
            </div>

            {/* Practical Application */}
            <div className="p-8 rounded-3xl bg-[#1e293b]/30 border border-dashed border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                Practical Application
              </h3>
              <div className="grid gap-3">
                {activeModule.applyNow.map((task, i) => (
                  <label key={i} className="flex items-start gap-4 p-4 rounded-xl bg-[#0f172a] hover:bg-slate-900 transition cursor-pointer border border-slate-800 hover:border-slate-700 group">
                    <input type="checkbox" className="mt-1 w-5 h-5 rounded border-slate-600 bg-transparent text-violet-500 focus:ring-violet-500/20" />
                    <span className="text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">{task}</span>
                  </label>
                ))}
              </div>
            </div>

          </main>
        </div>

        {/* --- VISUAL LAB SECTION (Bottom) --- */}
        <div className="mt-32 pt-20 border-t border-slate-800">
          <div className="text-center mb-16">
            <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-white/10 text-cyan-400 text-xs font-bold tracking-widest uppercase">
              Interactive Visuals
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mt-6 mb-6">The Visual Lab</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Explore the concepts from the course with our interactive visualizers.
              Real-time data and simulations to reinforce your learning.
            </p>
          </div>

          <div className="space-y-20">

            {/* Visual 1: Market Volume */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 bg-slate-800/50 p-8 rounded-3xl border border-white/5 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Global Liquidity Distribution</h3>
                <MarketVolumeChart />
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <h3 className="text-3xl font-bold text-white">Follow the Money</h3>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Understanding liquidity is crucial. While Crypto gets the headlines, **Forex** is the ocean where the whales swim ($6.6T daily).
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#1e293b] border border-slate-700 text-center">
                    <div className="text-cyan-400 font-bold text-xl">$6.6T</div>
                    <div className="text-xs text-slate-500 uppercase mt-1">Forex</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#1e293b] border border-slate-700 text-center">
                    <div className="text-violet-400 font-bold text-xl">$84B</div>
                    <div className="text-xs text-slate-500 uppercase mt-1">Stocks</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#1e293b] border border-slate-700 text-center">
                    <div className="text-emerald-400 font-bold text-xl">$50B</div>
                    <div className="text-xs text-slate-500 uppercase mt-1">Crypto</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual 2: Candlestick Anatomy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h3 className="text-3xl font-bold text-white">Reading the Tape</h3>
                <p className="text-lg text-slate-400 leading-relaxed">
                  A live demonstration of price action. Notice how the **Body** (Open-Close) interacts with the **Wicks** (High-Low) to tell a story of buyer vs. seller dominance.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span><strong>Green Candle:</strong> Buyers (Bulls) won the session. Close {'>'} Open.</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span><strong>Red Candle:</strong> Sellers (Bears) won the session. Close {'<'} Open.</span>
                  </li>
                </ul>
              </div>
              <div className="bg-slate-800/50 p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
                <CandlestickDemo />
              </div>
            </div>

            {/* Visual 3: Psychology */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center pb-20">
              <div className="order-2 md:order-1 bg-slate-800/50 p-8 rounded-3xl border border-white/5 shadow-2xl flex justify-center">
                <div className="w-full max-w-md">
                  <PsychologyRadarChart />
                </div>
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <h3 className="text-3xl font-bold text-white">Mindset Analysis</h3>
                <p className="text-lg text-slate-400 leading-relaxed">
                  The difference between a Pro and a Novice isn't usually strategy—it's **Psychology**.
                </p>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <h4 className="font-bold text-emerald-400 mb-1">Pro Trader</h4>
                    <p className="text-sm text-slate-400">High scores in Risk Management and Emotional Control. Treats trading as a business.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                    <h4 className="font-bold text-red-400 mb-1">Novice Trader</h4>
                    <p className="text-sm text-slate-400">Scores high in "Market Knowledge" (YouTube videos) but low in execution and discipline.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
