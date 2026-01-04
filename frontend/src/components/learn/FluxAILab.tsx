"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Cpu, MessageSquare, Zap, Settings, Key } from "lucide-react";

// --- Types ---
type ChatMessage = {
    role: "user" | "ai";
    text: string;
};

type SimResult = {
    probability: string;
    verdict: string;
    rationale: string;
} | null;

export function FluxAILab() {
    // --- State ---
    const [apiKey, setApiKey] = useState("");
    const [showSettings, setShowSettings] = useState(false);

    // Mentor State
    const [mentorInput, setMentorInput] = useState("");
    const [chatLog, setChatLog] = useState<ChatMessage[]>([
        { role: "ai", text: "Hello! I'm your trading mentor. Ask me anything about market structure, risk management, or technical analysis." }
    ]);
    const [mentorLoading, setMentorLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Simulator State
    const [simTrend, setSimTrend] = useState("Strong Uptrend");
    const [simPattern, setSimPattern] = useState("Bullish Engulfing");
    const [simIndicator, setSimIndicator] = useState("RSI Oversold (<30)");
    const [simLoading, setSimLoading] = useState(false);
    const [simResult, setSimResult] = useState<SimResult>(null);
    const [simRawText, setSimRawText] = useState("");

    // Load Key from LocalStorage
    useEffect(() => {
        const storedKey = localStorage.getItem("flux_gemini_key");
        if (storedKey) setApiKey(storedKey);
    }, []);

    const saveKey = (key: string) => {
        setApiKey(key);
        localStorage.setItem("flux_gemini_key", key);
    };

    // --- API Logic ---
    const callGemini = async (prompt: string): Promise<string> => {
        if (!apiKey) return "Please enter your Gemini API Key in the settings (⚙️) to use Flux AI.";

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                return `Error: ${res.statusText}. Please check your API Key.`;
            }

            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
        } catch (err) {
            return "Network error. Please try again.";
        }
    };

    // --- Handlers ---
    const handleMentorSubmit = async () => {
        if (!mentorInput.trim() || mentorLoading) return;

        const userMsg = mentorInput;
        setMentorInput("");
        setChatLog(prev => [...prev, { role: "user", text: userMsg }]);
        setMentorLoading(true);

        const prompt = `You are an expert trading mentor at Flux Trading Academy. 
    Answer the student's question concisely (max 2-3 sentences). 
    Use professional financial terminology but keep it accessible. 
    Focus on risk management and technical analysis. 
    Question: ${userMsg}`;

        const response = await callGemini(prompt);

        setChatLog(prev => [...prev, { role: "ai", text: response }]);
        setMentorLoading(false);
    };

    const handleSimulate = async () => {
        if (simLoading) return;
        setSimLoading(true);
        setSimResult(null);
        setSimRawText("");

        const prompt = `Act as a senior market analyst. Analyze this theoretical trade setup:
    - Trend: ${simTrend}
    - Candlestick Pattern: ${simPattern}
    - Indicator Signal: ${simIndicator}
    
    Provide a strict evaluation in this format:
    1. Probability: [Low/Medium/High]
    2. Verdict: [Long/Short/No Trade]
    3. Rationale: One short sentence why.`;

        const text = await callGemini(prompt);
        setSimRawText(text);

        // Simple parse (robustness fallback)
        const probability = text.match(/Probability:\s*(.*)/i)?.[1] || "Unknown";
        const verdict = text.match(/Verdict:\s*(.*)/i)?.[1] || "Check Rationale";
        const rationale = text.match(/Rationale:\s*(.*)/i)?.[1] || text.substring(0, 100) + "...";

        setSimResult({ probability, verdict, rationale });
        setSimLoading(false);
    };

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatLog]);

    return (
        <div className="space-y-8">
            {/* Header with Settings */}
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-xs font-bold tracking-widest shadow-lg shadow-cyan-500/20">
                            POWERED BY GEMINI
                        </span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Flux AI Lab</h2>
                    <p className="text-slate-400 mt-2">Experimental AI tools to test your knowledge.</p>
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
                >
                    <Settings size={20} />
                </button>
            </div>

            {showSettings && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                        <Key size={14} /> Gemini API Key
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => saveKey(e.target.value)}
                            placeholder="Enter your Gemini API Key..."
                            className="flex-grow bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Key is stored locally in your browser. Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-cyan-400 hover:underline">Google AI Studio</a>.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* --- AI MENTOR --- */}
                <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col h-[500px]">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <MessageSquare className="text-cyan-400" /> AI Mentor Chat
                    </h3>

                    <div className="flex-grow overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar mask-gradient">
                        {chatLog.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-cyan-600 text-white rounded-br-none'
                                        : 'bg-slate-800 text-slate-300 rounded-bl-none border border-slate-700'
                                    }`}>
                                    {msg.role === 'ai' && <span className="text-cyan-400 font-bold block mb-1 text-xs">Flux AI</span>}
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {mentorLoading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-none border border-slate-700 text-xs text-slate-500 italic animate-pulse">
                                    Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            value={mentorInput}
                            onChange={(e) => setMentorInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleMentorSubmit()}
                            placeholder="Ask about Divergence, Patterns, etc..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                        />
                        <button
                            onClick={handleMentorSubmit}
                            disabled={!mentorInput.trim() || mentorLoading}
                            className="absolute right-2 top-2 p-1.5 bg-cyan-600 rounded-lg text-white hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 transition"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>

                {/* --- SIMULATOR --- */}
                <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col h-[500px]">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Cpu className="text-violet-400" /> Trade Simulator
                    </h3>

                    <div className="space-y-6 flex-grow">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Market Trend</label>
                                <select
                                    value={simTrend}
                                    onChange={(e) => setSimTrend(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 focus:border-violet-500 outline-none"
                                >
                                    <option>Strong Uptrend</option>
                                    <option>Weak Uptrend</option>
                                    <option>Consolidation (Range)</option>
                                    <option>Weak Downtrend</option>
                                    <option>Strong Downtrend</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Pattern</label>
                                    <select
                                        value={simPattern}
                                        onChange={(e) => setSimPattern(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 focus:border-violet-500 outline-none"
                                    >
                                        <option>Bullish Engulfing</option>
                                        <option>Bearish Pin Bar</option>
                                        <option>Doji</option>
                                        <option>Double Bottom</option>
                                        <option>Head & Shoulders</option>
                                        <option>Bull Flag</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Indicator</label>
                                    <select
                                        value={simIndicator}
                                        onChange={(e) => setSimIndicator(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 focus:border-violet-500 outline-none"
                                    >
                                        <option>RSI Oversold (&lt;30)</option>
                                        <option>RSI Overbought (&gt;70)</option>
                                        <option>Bouncing off 50 SMA</option>
                                        <option>MACD Crossover</option>
                                        <option>Bearish Divergence</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSimulate}
                            disabled={simLoading}
                            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {simLoading ? <Zap className="animate-pulse" /> : <Zap />}
                            {simLoading ? "Simulating..." : "Run Simulation"}
                        </button>

                        {/* Terminal Output */}
                        <div className={`flex-grow bg-[#0B1120] rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-y-auto ${simLoading ? 'animate-pulse' : ''}`}>
                            {!simResult && !simLoading && !simRawText && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                    <Cpu size={32} className="mb-2 opacity-20" />
                                    <p>Ready for input...</p>
                                </div>
                            )}

                            {simLoading && (
                                <div className="space-y-2 text-violet-400/50">
                                    <p>{'>'} Analyzing Market Structure...</p>
                                    <p>{'>'} checking indicators...</p>
                                    <p>{'>'} calculating probabilities...</p>
                                </div>
                            )}

                            {simResult && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="border-b border-white/10 pb-2 mb-2 text-violet-400 font-bold">
                                        {'>'} SIMULATION COMPLETE
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Probability:</span>
                                        <span className={`font-bold ${simResult.probability.includes("High") ? "text-emerald-400" :
                                                simResult.probability.includes("Low") ? "text-rose-400" : "text-amber-400"
                                            }`}>{simResult.probability}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Verdict:</span>
                                        <span className="font-bold text-white">{simResult.verdict}</span>
                                    </div>
                                    <div className="mt-2 text-slate-300 border-t border-white/5 pt-2 italic">
                                        "{simResult.rationale}"
                                    </div>
                                </div>
                            )}

                            {/* Fallback for raw text if parsing fails but text exists */}
                            {!simResult && simRawText && !simLoading && (
                                <div className="text-slate-300 whitespace-pre-wrap">{simRawText}</div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
