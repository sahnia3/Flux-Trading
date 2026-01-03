"use client";

import { useState } from "react";

type Post = {
    id: number;
    user: string;
    avatarColor: string;
    content: string;
    bullish: boolean;
    upvotes: number;
    time: string;
};

const initialPosts: Post[] = [
    {
        id: 1,
        user: "TraderJoe",
        avatarColor: "bg-blue-500",
        content: "Looking for a bounce here at support. The 200 SMA is holding strong.",
        bullish: true,
        upvotes: 45,
        time: "15m",
    },
    {
        id: 2,
        user: "CryptoKing",
        avatarColor: "bg-purple-500",
        content: "Volume is drying up. I expect a breakdown below $145 soon.",
        bullish: false,
        upvotes: 12,
        time: "1h",
    },
];

export function SocialFeed({ symbol }: { symbol: string }) {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [input, setInput] = useState("");
    const [sentiment, setSentiment] = useState<"bull" | "bear">("bull");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newPost: Post = {
            id: Date.now(),
            user: "You",
            avatarColor: "bg-emerald-500",
            content: input,
            bullish: sentiment === "bull",
            upvotes: 0,
            time: "Just now",
        };

        setPosts([newPost, ...posts]);
        setInput("");
    };

    return (
        <div className="flex flex-col h-full">
            {/* Input Area */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <form onSubmit={handleSubmit}>
                    <textarea
                        className="w-full bg-transparent text-sm text-text-main placeholder-text-dim outline-none resize-none h-20"
                        placeholder={`Share your thoughts on ${symbol}...`}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setSentiment("bull")}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${sentiment === "bull" ? "bg-emerald-500 text-white" : "bg-white/5 text-text-muted hover:bg-white/10"
                                    }`}
                            >
                                Bullish
                            </button>
                            <button
                                type="button"
                                onClick={() => setSentiment("bear")}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${sentiment === "bear" ? "bg-rose-500 text-white" : "bg-white/5 text-text-muted hover:bg-white/10"
                                    }`}
                            >
                                Bearish
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
                        >
                            Post
                        </button>
                    </div>
                </form>
            </div>

            {/* Feed */}
            <div className="flex flex-col gap-4">
                {posts.map((post) => (
                    <div key={post.id} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm ${post.avatarColor}`}>
                            {post.user.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-text-main">{post.user}</span>
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${post.bullish
                                            ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                                            : "text-rose-400 border-rose-500/30 bg-rose-500/10"
                                        }`}>
                                        {post.bullish ? "Bull" : "Bear"}
                                    </span>
                                </div>
                                <span className="text-xs text-text-dim">{post.time}</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-300 leading-relaxed break-words">{post.content}</p>
                            <div className="mt-3 flex gap-4">
                                <button className="flex items-center gap-1.5 text-xs text-text-dim hover:text-primary transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                    </svg>
                                    {post.upvotes}
                                </button>
                                <button className="flex items-center gap-1.5 text-xs text-text-dim hover:text-text-main transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    Reply
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
