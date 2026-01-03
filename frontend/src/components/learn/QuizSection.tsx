"use client";

import React, { useState, useEffect } from "react";
import { QuizQuestion } from "@/data/learnModules";

interface QuizSectionProps {
    moduleId: string;
    quiz: QuizQuestion[];
    onComplete?: (score: number) => void;
}

export function QuizSection({ moduleId, quiz, onComplete }: QuizSectionProps) {
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [submitted, setSubmitted] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);

    // Reset state when module changes
    useEffect(() => {
        setAnswers({});
        setSubmitted(false);
        setShowQuiz(false);
    }, [moduleId]);

    const handleSelect = (qIdx: number, optionIdx: number) => {
        if (submitted) return;
        setAnswers((prev) => ({ ...prev, [qIdx]: optionIdx }));
    };

    const handleSubmit = () => {
        let score = 0;
        quiz.forEach((q, i) => {
            if (answers[i] === q.answer) score++;
        });
        setSubmitted(true);
        if (onComplete) {
            onComplete(score);
        }
    };

    const score = quiz.reduce((acc, q, i) => {
        return acc + (answers[i] === q.answer ? 1 : 0);
    }, 0);

    if (!showQuiz) {
        return (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                <p className="text-slate-400 mb-6">Ready to check your knowledge?</p>
                <button
                    onClick={() => setShowQuiz(true)}
                    className="px-8 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold transition shadow-lg shadow-cyan-500/20"
                >
                    Start Quiz
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {quiz.map((q, qIdx) => {
                const answerState = answers[qIdx];
                const isCorrect = q.answer === answerState;

                return (
                    <div key={qIdx} className="space-y-4">
                        <h3 className="text-lg font-medium text-white">
                            {qIdx + 1}. {q.question}
                        </h3>
                        <div className="grid gap-3">
                            {q.options.map((opt, oIdx) => {
                                let btnClass = "text-left p-4 rounded-xl border transition-all text-sm ";

                                if (submitted) {
                                    if (oIdx === q.answer) btnClass += "bg-emerald-500/10 border-emerald-500 text-emerald-400";
                                    else if (answerState === oIdx) btnClass += "bg-rose-500/10 border-rose-500 text-rose-400";
                                    else btnClass += "bg-slate-800/50 border-transparent opacity-50";
                                } else {
                                    if (answerState === oIdx) btnClass += "bg-cyan-500/10 border-cyan-500 text-cyan-300";
                                    else btnClass += "bg-slate-800/50 border-transparent hover:bg-slate-800 text-slate-300";
                                }

                                return (
                                    <button
                                        key={oIdx}
                                        disabled={submitted}
                                        onClick={() => handleSelect(qIdx, oIdx)}
                                        className={btnClass}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                        {submitted && (
                            <p className="text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg border-l-2 border-slate-600">
                                <span className="font-bold text-slate-300">Explanation:</span> {q.explanation}
                            </p>
                        )}
                    </div>
                );
            })}

            {!submitted && (
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={Object.keys(answers).length !== quiz.length}
                        className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition"
                    >
                        Submit Answers
                    </button>
                </div>
            )}

            {submitted && (
                <div className="text-right">
                    <span className="px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                        Score: {Math.round((score / quiz.length) * 100)}%
                    </span>
                </div>
            )}
        </div>
    );
}
