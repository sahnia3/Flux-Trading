export type LearnModule = {
  id: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  summary: string;
  sections: { heading: string; bullets: string[]; todoLinks?: string[] }[];
  quiz: { question: string; options: string[]; answer: number; explanation: string }[];
  applyNow: string[];
};

export const learnModules: LearnModule[] = [
  {
    id: "candles",
    title: "Candlestick Basics",
    level: "Beginner",
    summary: "How candles encode open/high/low/close, trend context, and common signals.",
    sections: [
      {
        heading: "Reading a Candle",
        bullets: [
          "Open/Close form the body; wicks are intrabar extremes.",
          "Color shows direction: green/up = close > open; red/down = close < open.",
          "Higher timeframes reduce noise; lower timeframes expose microstructure.",
        ],
      },
      {
        heading: "Context Matters",
        bullets: [
          "A hammer near support after a selloff with rising volume is stronger than in chop.",
          "Long wicks without volume often fade; wick + volume = rejection/absorption.",
        ],
      },
      {
        heading: "Patterns (3 to know)",
        bullets: [
          "Hammer / Shooting Star: rejection at extremes; location matters.",
          "Engulfing: momentum shift when the body eclipses prior range.",
          "Doji: indecision; weight increases at key levels or after strong trends.",
        ],
        todoLinks: ["TODO: Add Investopedia candlestick link", "TODO: Add Bulkowski stats link"],
      },
    ],
    quiz: [
      {
        question: "What makes a hammer more reliable?",
        options: [
          "It appears after a strong down move near support with rising volume",
          "It appears randomly in a flat range",
          "It has the largest body in the session",
        ],
        answer: 0,
        explanation: "Location + volume + prior trend increase reliability.",
      },
    ],
    applyNow: [
      "Switch to 1D and mark two hammer-like candles; were they at swing lows? Check volume.",
      "Drop to 1H and see how those daily hammers were constructed (intraday structure).",
    ],
  },
  {
    id: "patterns",
    title: "Chart Patterns & Levels",
    level: "Intermediate",
    summary: "Support/resistance, breakouts vs. fakeouts, trendlines, and triangles.",
    sections: [
      {
        heading: "Support & Resistance",
        bullets: [
          "Prior highs/lows and volume shelves create reaction zones.",
          "More clean rejections = stronger level; failed break can flip to support/resistance.",
        ],
      },
      {
        heading: "Breakouts vs. Fakeouts",
        bullets: [
          "Acceptance needs range extension + volume + follow-through closes.",
          "Low-volume pokes often fail; watch for immediate reversion.",
        ],
      },
      {
        heading: "Channels & Triangles",
        bullets: [
          "Rising wedge near highs can exhaust; falling wedge near lows can spring.",
          "Triangles compress range; look for volume contraction then expansion.",
        ],
        todoLinks: ["TODO: Add pattern playbook link", "TODO: Add Wyckoff resource link"],
      },
    ],
    quiz: [
      {
        question: "Which combo best signals a true breakout?",
        options: [
          "Price over level on higher volume with follow-through closes",
          "A single tick above level on low volume",
          "A gap above level with immediate fade",
        ],
        answer: 0,
        explanation: "Range + volume + closes beyond the level = acceptance.",
      },
    ],
    applyNow: [
      "Mark the last swing high/low; set alerts slightly outside.",
      "Log volume on first touch/break; note rejection vs. acceptance.",
    ],
  },
  {
    id: "indicators",
    title: "Indicators 101",
    level: "Beginner",
    summary: "MA, volume, and RSI (placeholder): what they do and what they don’t.",
    sections: [
      {
        heading: "Moving Averages",
        bullets: [
          "Smooth price; crossovers hint at momentum shifts.",
          "Use higher-TF MA for trend context; lower-TF for timing.",
          "Confluence: price + level + MA alignment is stronger.",
        ],
      },
      {
        heading: "Volume",
        bullets: [
          "Rising volume on breakout = acceptance; on failure = rejection.",
          "Climactic bars can mark exhaustion; low volume = indecision.",
        ],
      },
      {
        heading: "RSI (placeholder)",
        bullets: [
          "Overbought/oversold alone is weak; combine with trend and structure.",
          "RSI divergence can hint at momentum shifts; confirm with price action.",
        ],
        todoLinks: ["TODO: Add RSI guide link", "TODO: Add volume profile primer link"],
      },
    ],
    quiz: [
      {
        question: "What strengthens an MA crossover signal?",
        options: [
          "It occurs at prior support/resistance with rising volume",
          "It happens in illiquid hours with tiny ranges",
          "It happens after a parabolic move without pullback",
        ],
        answer: 0,
        explanation: "Location + volume + structure improve signal quality.",
      },
    ],
    applyNow: [
      "Enable MA + volume; see if price respects or slices through MA on volume.",
      "Check RSI divergence on 1H and see if price structure confirms.",
    ],
  },
  {
    id: "risk",
    title: "Risk Management & Positioning",
    level: "Intermediate",
    summary: "Sizing, stops, reward/risk, and common failure points.",
    sections: [
      {
        heading: "Sizing",
        bullets: [
          "Risk a fixed % of equity per trade (e.g., 0.25–1%).",
          "Size = (risk $) / (entry–stop distance).",
        ],
      },
      {
        heading: "Stops & Targets",
        bullets: [
          "Place stops beyond invalidation (structure), not arbitrary ticks.",
          "Targets should respect liquidity zones (prior highs/lows, volume nodes).",
        ],
      },
      {
        heading: "Common Mistakes",
        bullets: [
          "Moving stops wider after entry; doubling down into weakness.",
          "No max daily loss; ignoring slippage/fees.",
        ],
        todoLinks: ["TODO: Add Van Tharp sizing link", "TODO: Add R-multiple primer link"],
      },
    ],
    quiz: [
      {
        question: "If you risk 0.5% of $10,000 with a $0.50 stop distance, what size?",
        options: ["100 shares", "50 shares", "10 shares"],
        answer: 0,
        explanation: "$50 risk / $0.50 stop = 100 shares.",
      },
    ],
    applyNow: [
      "Pick a trade idea; compute size for 0.5% risk. Adjust risk % if too big.",
      "Set a daily max loss (e.g., 1–2R). Stop trading when hit.",
    ],
  },
  {
    id: "orders",
    title: "Order Types & Market Structure",
    level: "Beginner",
    summary: "Market vs. limit; liquidity; bid/ask; why fills differ.",
    sections: [
      {
        heading: "Order Types",
        bullets: [
          "Market = immediate fill; Limit = price or better.",
          "Stop vs. stop-limit: stop-limit can miss fills in fast moves.",
        ],
      },
      {
        heading: "Liquidity & Spread",
        bullets: [
          "Wide spreads increase cost; avoid market orders in illiquid names.",
          "Use limit orders near levels; partial fills happen in thin books.",
        ],
      },
    ],
    quiz: [
      {
        question: "When is a limit order safer than a market order?",
        options: [
          "In a thinly traded stock with a wide bid/ask",
          "In a liquid mega-cap during RTH",
          "Never",
        ],
        answer: 0,
        explanation: "Wide spreads = price risk; limit controls max price.",
      },
    ],
    applyNow: [
      "Check the bid/ask on your next trade; if wide, use a limit order.",
      "Note partial fills on thin symbols; adjust size or use multiple limits.",
    ],
  },
  {
    id: "macro",
    title: "Macro & Earnings",
    level: "Intermediate",
    summary: "How rates, CPI, and earnings drive risk assets.",
    sections: [
      {
        heading: "Rates & Liquidity",
        bullets: [
          "Falling rates/liquidity easing often support risk assets; rising rates can pressure valuations.",
          "Watch Fed meetings, CPI, NFP; vol clusters around releases.",
        ],
      },
      {
        heading: "Earnings",
        bullets: [
          "EPS beats vs. guidance matters; reaction > headline.",
          "Gaps on earnings: watch volume/levels for acceptance vs. fade.",
        ],
        todoLinks: ["TODO: Add CME FedWatch link", "TODO: Add earnings calendar link"],
      },
    ],
    quiz: [
      {
        question: "What matters more after earnings?",
        options: [
          "Price/volume reaction relative to key levels",
          "The absolute EPS number alone",
          "Nothing; earnings are random",
        ],
        answer: 0,
        explanation: "Reaction shows positioning/expectations; levels + volume matter.",
      },
    ],
    applyNow: [
      "Mark upcoming CPI/NFP/Fed; avoid sizing up right before releases.",
      "On earnings gaps, wait for first 30–60m to see acceptance vs. fade.",
    ],
  },
];
