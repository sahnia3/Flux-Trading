"use client";

import Link from "next/link";
import { useState } from "react";
import { learnModules, LearnModule } from "@/data/learnModules";

type AnswerState = Record<string, number>;
type ScoreState = Record<string, number>;
type CompletedState = Record<string, boolean>;

export default function LearnPage() {
  const [answers, setAnswers] = useState<AnswerState>({});
  const [scores, setScores] = useState<ScoreState>({});
  const [completed, setCompleted] = useState<CompletedState>({});
  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);

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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Learn</p>
            <h1 className="text-3xl font-semibold text-slate-50">Learning modules</h1>
            <p className="text-sm text-slate-400">
              Deep dives with quizzes and “apply now” steps. No sidebar—full-page experience.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-emerald-400"
          >
            ← Back home
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {learnModules.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-lg shadow-black/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-200">
                    {m.level}
                  </p>
                  <h3 className="text-lg font-semibold text-slate-50">{m.title}</h3>
                </div>
                {completed[m.id] && (
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
                    Badge
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-300">{m.summary}</p>

              <div className="mt-3 space-y-3 text-sm text-slate-200">
                {m.sections.map((s, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-white/5 bg-slate-800/60 p-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                      {s.heading}
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
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

                <div className="rounded-lg border border-white/5 bg-slate-800/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                    Apply now
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                    {m.applyNow.map((a, ai) => (
                      <li key={ai}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {m.quiz && m.quiz.length > 0 && (
                <div className="mt-3 space-y-2 text-xs">
                  <button
                    className="w-full rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-emerald-900 hover:bg-emerald-400"
                    onClick={() => setActiveQuiz(activeQuiz === m.id ? null : m.id)}
                  >
                    {activeQuiz === m.id ? "Hide quiz" : "Take quiz"}
                    {scores[m.id] !== undefined
                      ? ` (Score: ${scores[m.id]}/${m.quiz.length})`
                      : ""}
                  </button>
                  {activeQuiz === m.id && (
                    <div className="space-y-3 rounded-lg border border-white/10 bg-slate-900/80 p-3">
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
                          <p className="text-[11px] text-slate-400">
                            Answer: {q.explanation}
                          </p>
                        </div>
                      ))}
                      <button
                        className="w-full rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-emerald-900 hover:bg-emerald-400"
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
    </main>
  );
}
