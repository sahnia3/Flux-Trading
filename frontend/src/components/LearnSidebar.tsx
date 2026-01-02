"use client";

import { useState } from "react";
import { learnModules, LearnModule } from "@/data/learnModules";

type Props = { open: boolean; onClose: () => void };

export function LearnSidebar({ open, onClose }: Props) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, number>>({});

  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const submitQuiz = (m: LearnModule) => {
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
        {learnModules.map((m: LearnModule) => (
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
            <div className="mt-2 space-y-3 text-xs text-slate-200">
              {m.sections.map((s, i) => (
                <div key={i} className="rounded-lg border border-white/5 bg-slate-900/60 p-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                    {s.heading}
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {s.bullets.map((b, bi) => (
                      <li key={bi}>{b}</li>
                    ))}
                  </ul>
                  {s.todoLinks && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      TODO links: {s.todoLinks.join(" • ")}
                    </p>
                  )}
                </div>
              ))}
              <div className="rounded-lg border border-white/5 bg-slate-900/60 p-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                  Apply now
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {m.applyNow.map((a, ai) => (
                    <li key={ai}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
            {m.quiz && m.quiz.length > 0 && (
              <div className="mt-2 space-y-2 text-xs">
                <button
                  className="rounded-lg bg-emerald-500 px-3 py-1 font-semibold text-emerald-900 hover:bg-emerald-400"
                  onClick={() => setActiveQuiz(activeQuiz === m.id ? null : m.id)}
                >
                  {activeQuiz === m.id ? "Hide quiz" : "Take quiz"}
                  {scores[m.id] !== undefined
                    ? ` (Score: ${scores[m.id]}/${m.quiz.length})`
                    : ""}
                </button>
                {activeQuiz === m.id && (
                  <div className="space-y-2 rounded-lg border border-white/10 bg-slate-900/80 p-2">
                    {m.quiz.map((q, idx) => (
                      <div key={idx} className="space-y-1">
                        <p className="font-semibold text-slate-200">{q.question}</p>
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
                        <p className="text-[11px] text-slate-400">Answer: {q.explanation}</p>
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
