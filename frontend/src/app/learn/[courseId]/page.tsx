"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { learnModules } from "@/data/learnModules";

// Helper to resolve params in Next 16 (if treated as a Promise in Client Components in some configs, 
// strictly speaking in Client Components params are passed as props, but types might say Promise)
// For safety in this environment I will treat it as potentially async or direct prop.
// However, since this is "use client", we can just use `use()` or standard props.
// Let's assume standard props but I'll add a check.

export default function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = use(params);
    const moduleData = learnModules.find((m) => m.id === courseId);

    if (!moduleData) {
        notFound();
    }

    const [activeSection, setActiveSection] = useState(0);
    const [quizScore, setQuizScore] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [showQuiz, setShowQuiz] = useState(false);

    // Scroll spy (simplified)
    useEffect(() => {
        const handleScroll = () => {
            // Logic to update activeSection based on scroll position could go here
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleQuizSubmit = () => {
        let score = 0;
        moduleData.quiz.forEach((q, i) => {
            if (answers[i] === q.answer) score++;
        });
        setQuizScore(score);
    };

    return (
        <div className="min-h-screen pt-24 pb-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">

                {/* Breadcrumbs / Header */}
                <div className="mb-8">
                    <Link href="/learn" className="text-xs font-bold uppercase tracking-wider text-text-dim hover:text-primary transition mb-2 inline-block">
                        ← Back to Catalog
                    </Link>
                    <h1 className="text-3xl font-bold text-text-main">{moduleData.title}</h1>
                    <p className="text-text-muted mt-2 max-w-2xl">{moduleData.summary}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Table of Contents */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="sticky top-24 rounded-2xl border border-border bg-surface/50 p-4 backdrop-blur-md">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-text-dim mb-4">Course Content</h3>
                            <nav className="space-y-1">
                                {moduleData.sections.map((s, idx) => (
                                    <a
                                        key={idx}
                                        href={`#section-${idx}`}
                                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${activeSection === idx
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "text-text-muted hover:text-text-main hover:bg-white/5"
                                            }`}
                                        onClick={() => setActiveSection(idx)}
                                    >
                                        {idx + 1}. {s.heading}
                                    </a>
                                ))}
                                <a
                                    href="#quiz"
                                    className="block rounded-lg px-3 py-2 text-sm text-text-muted hover:text-text-main hover:bg-white/5"
                                >
                                    Final Quiz
                                </a>
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-12">

                        {moduleData.sections.map((s, idx) => (
                            <section key={idx} id={`section-${idx}`} className="scroll-mt-28">
                                <div className="rounded-3xl glass p-8">
                                    <h2 className="text-2xl font-bold text-text-main mb-6 flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm text-primary">
                                            {idx + 1}
                                        </span>
                                        {s.heading}
                                    </h2>
                                    <ul className="space-y-4 text-text-muted leading-relaxed">
                                        {s.bullets.map((b, bi) => (
                                            <li key={bi} className="flex gap-3">
                                                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {s.todoLinks && (
                                        <div className="mt-6 flex flex-wrap gap-2">
                                            {s.todoLinks.map((link, li) => (
                                                <span key={li} className="inline-flex items-center rounded-full border border-border bg-black/20 px-3 py-1 text-xs text-text-dim">
                                                    {link}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        ))}

                        {/* Quiz Section */}
                        <section id="quiz" className="scroll-mt-28">
                            <div className="rounded-3xl border border-border bg-gradient-to-br from-[#0a0a0a] to-[#111] p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-text-main">Knowledge Check</h2>
                                    {quizScore !== null && (
                                        <span className="px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                            Score: {quizScore} / {moduleData.quiz.length}
                                        </span>
                                    )}
                                </div>

                                {!showQuiz && quizScore === null ? (
                                    <div className="text-center py-10">
                                        <p className="text-text-muted mb-6">Ready to test your understanding? Take the quiz to complete this module.</p>
                                        <button
                                            onClick={() => setShowQuiz(true)}
                                            className="rounded-full bg-primary px-8 py-3 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover hover:scale-105"
                                        >
                                            Start Quiz
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {moduleData.quiz.map((q, idx) => (
                                            <div key={idx} className="space-y-3">
                                                <p className="font-semibold text-lg text-text-main">{q.question}</p>
                                                <div className="space-y-2">
                                                    {q.options.map((opt, oi) => {
                                                        const isSelected = answers[idx] === oi;
                                                        const isCorrect = q.answer === oi;
                                                        const showResult = quizScore !== null;

                                                        let btnClass = "w-full text-left p-4 rounded-xl border transition-all ";
                                                        if (showResult) {
                                                            if (isCorrect) btnClass += "bg-emerald-500/10 border-emerald-500/50 text-emerald-200";
                                                            else if (isSelected && !isCorrect) btnClass += "bg-rose-500/10 border-rose-500/50 text-rose-200";
                                                            else btnClass += "border-border bg-surface/50 opacity-50";
                                                        } else {
                                                            if (isSelected) btnClass += "border-primary bg-primary/10 text-primary-200";
                                                            else btnClass += "border-border bg-surface/50 hover:bg-surface-hover text-text-muted";
                                                        }

                                                        return (
                                                            <button
                                                                key={oi}
                                                                disabled={!!quizScore}
                                                                onClick={() => setAnswers({ ...answers, [idx]: oi })}
                                                                className={btnClass}
                                                            >
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {quizScore !== null && (
                                                    <p className="text-sm text-text-dim italic pl-1">
                                                        {q.explanation}
                                                    </p>
                                                )}
                                            </div>
                                        ))}

                                        {quizScore === null && (
                                            <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={handleQuizSubmit}
                                                    disabled={Object.keys(answers).length !== moduleData.quiz.length}
                                                    className="rounded-full bg-primary px-8 py-3 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Submit Answers
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Apply Now */}
                        <section className="glass rounded-3xl p-8 border-l-4 border-l-accent">
                            <h3 className="text-lg font-bold text-accent mb-4 uppercase tracking-wide">Practical Application</h3>
                            <div className="space-y-3">
                                {moduleData.applyNow.map((task, i) => (
                                    <label key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition cursor-pointer">
                                        <input type="checkbox" className="mt-1.5 h-4 w-4 rounded border-gray-600 bg-transparent text-accent focus:ring-accent" />
                                        <span className="text-text-muted">{task}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                    </div>
                </div>
            </div>
        </div>
    );
}
