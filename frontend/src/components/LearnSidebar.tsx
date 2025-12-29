"use client";

import { useState } from "react";

type Module = {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  image?: string;
  quiz?: { q: string; options: string[]; answer: number }[];
};

const modules: Module[] = [
  {
    id: "candle-basics",
    title: "Candlestick basics",
    summary:
      "Each candle shows a fight between buyers and sellers in a timeframe. Body = open/close, wicks = extremes, colors show direction.",
    bullets: [
      "Green/Up candle: close > open. Red/Down candle: close < open.",
      "Long body = decisive move; tiny body = indecision (doji-like).",
      "Long upper wick = sellers rejected higher prices; long lower wick = buyers defended lows.",
    ],
    image:
      "https://images.unsplash.com/photo-1549421263-5ec394a5ad08?auto=format&fit=crop&w=1200&q=80",
    quiz: [
      {
        q: "A long upper wick with a small body near the low suggests:",
        options: ["Selling rejection (bearish)", "Strong bullish close", "No price movement"],
        answer: 0,
      },
      {
        q: "Which prices form the candle body?",
        options: ["Open & Close", "High & Low", "Volume & VWAP"],
        answer: 0,
      },
    ],
  },
  {
    id: "reading-charts",
    title: "Reading charts",
    summary:
      "Structure + volume tells the story. Trends, levels, and momentum help you spot risk/reward pockets.",
    bullets: [
      "Higher highs/lows = uptrend; lower highs/lows = downtrend.",
      "Support/Resistance: swing highs/lows, round numbers, moving averages, VWAP.",
      "Volume spike + break of resistance can precede momentum; spike with flat price = absorption/indecision.",
    ],
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
    quiz: [
      {
        q: "Flat price + big volume often signals:",
        options: ["Absorption/indecision", "Guaranteed breakout", "No liquidity"],
        answer: 0,
      },
      {
        q: "Higher highs and higher lows define:",
        options: ["Downtrend", "Uptrend", "Sideways"],
        answer: 1,
      },
    ],
  },
  {
    id: "risk",
    title: "Risk management",
    summary: "Capital preservation > profit. Sizing, stops, and diversification keep you in the game.",
    bullets: [
      "Risk per trade: typically 0.5%–2% of account.",
      "Stops belong where your thesis fails, not at arbitrary round numbers.",
      "Avoid concentration: diversify by asset, sector, and timeframe.",
    ],
    image:
      "https://images.unsplash.com/photo-1504274066651-8d31a536b11a?auto=format&fit=crop&w=1200&q=80",
    quiz: [
      {
        q: "Recommended risk per trade for most traders:",
        options: ["1-2% of account", "10% of account", "All-in if confident"],
        answer: 0,
      },
      {
        q: "Stops should be placed:",
        options: ["Where your thesis fails", "At random round numbers", "Never"],
        answer: 0,
      },
    ],
  },
];

type Props = { open: boolean; onClose: () => void };

export function LearnSidebar({ open, onClose }: Props) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, number>>({});

  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const submitQuiz = (m: Module) => {
    if (!m.quiz) return;
    let score = 0;
    m.quiz.forEach((q, idx) => {
      if (answers[`${m.id}-${idx}`] === q.answer) score += 1;
    });
    setScores((s) => ({ ...s, [m.id]: score }));
    setCompleted((c) => ({ ...c, [m.id]: true }));
    setActiveQuiz(null);
  };

  return (
    <div
      className={`fixed top-0 right-0 z-50 h-full w-80 transform bg-slate-900/95 p-4 text-slate-100 shadow-2xl shadow-black/50 transition ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Learn</p>
          <h3 className="text-lg font-semibold">Modules</h3>
        </div>
        <button
          className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200 hover:border-emerald-400"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        {modules.map((m) => (
          <div key={m.id} className="rounded-xl border border-white/10 bg-slate-800/70 p-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{m.title}</h4>
              {completed[m.id] && (
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
                  Badge
                </span>
              )}
            </div>
            <p className="mt-1 text-slate-300 text-xs">{m.summary}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-200">
              {m.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            {m.image && (
              <div className="mt-3 overflow-hidden rounded-lg border border-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.image} alt={m.title} className="h-28 w-full object-cover" />
              </div>
            )}
            {m.quiz && (
              <div className="mt-2 space-y-2 text-xs">
                <button
                  className="rounded-lg bg-emerald-500 px-3 py-1 font-semibold text-emerald-900 hover:bg-emerald-400"
                  onClick={() => setActiveQuiz(activeQuiz === m.id ? null : m.id)}
                >
                  {activeQuiz === m.id ? "Hide quiz" : "Take quiz"}
                  {scores[m.id] !== undefined ? ` (Score: ${scores[m.id]})` : ""}
                </button>
                {activeQuiz === m.id && (
                  <div className="space-y-2 rounded-lg border border-white/10 bg-slate-900/80 p-2">
                    {m.quiz.map((q, idx) => (
                      <div key={idx} className="space-y-1">
                        <p className="font-semibold text-slate-200">{q.q}</p>
                        <div className="flex flex-col gap-1">
                          {q.options.map((opt, oi) => (
                            <label key={oi} className="flex items-center gap-2 text-slate-300">
                              <input
                                type="radio"
                                name={`${m.id}-${idx}`}
                                checked={answers[`${m.id}-${idx}`] === oi}
                                onChange={() =>
                                  setAnswers((a) => ({ ...a, [`${m.id}-${idx}`]: oi }))
                                }
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      className="w-full rounded-lg bg-emerald-500 px-3 py-1 font-semibold text-emerald-900 hover:bg-emerald-400"
                      onClick={() => submitQuiz(m)}
                    >
                      Submit quiz
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
