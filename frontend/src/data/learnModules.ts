export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
};

export type LearnModule = {
  id: string;
  title: string;
  summary: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  sections: {
    heading: string;
    bullets: string[];
    todoLinks?: string[];
  }[];
  quiz: QuizQuestion[];
  applyNow: string[];
};

export const learnModules: LearnModule[] = [
  {
    id: "market-architecture",
    title: "Module 1: The Architecture of Global Financial Markets",
    summary: "The journey into financial trading begins not with a strategy, but with a fundamental understanding of the environment. Deconstruct the global financial market, its asset classes, and the hierarchy of participants.",
    level: "Beginner",
    sections: [
      {
        heading: "1.1 The Spectrum of Asset Classes",
        bullets: [
          "Equities (Stocks): The Engine of Corporate Ownership. Primarily traded on centralized exchanges (NYSE, NASDAQ) with rigid operational hours (9:30 AM - 4:00 PM EST). This temporal constraint creates a unique risk factor known as 'gapping'—where price jumps overnight due to news.",
          "Forex (FX): The Pulse of Global Economics. The largest market in the world ($6T+ daily). Unlike equities, it is decentralized and operates 24/5. Traders profit from the exchange rate between currency pairs like EUR/USD.",
          "Cryptocurrency: The Frontier of Digital Value. Operates 24/7 on a hybrid infrastructure of Centralized (CEX) and Decentralized (DEX) exchanges. Known for extreme volatility (5-20% daily swings), offering high risk and high reward."
        ]
      },
      {
        heading: "1.2 Market Participants: The Ecological Hierarchy",
        bullets: [
          "Institutional Investors (Smart Money): Hedge funds and banks control the vast majority of capital. They engage in accumulation and distribution over weeks. Recognising their footprint is key.",
          "Market Makers: Specialized firms that provide liquidity by quoting both buy and sell prices. They profit from the 'spread' (difference between Bid and Ask), ensuring you can always execute a trade.",
          "High-Frequency Traders (HFTs): Algorithms that execute in microseconds to arbitrage inefficiencies. They provide liquidity but can increase volatility.",
          "Retail Traders: You. While at an informational disadvantage, retail traders possess agility—entering and exiting positions instantly without slippage."
        ]
      }
    ],
    quiz: [
      {
        question: "Which market is characterized by a lack of central exchange and operates via an interbank network?",
        options: ["The New York Stock Exchange", "The Cryptocurrency Market", "The Forex Market", "The Commodities Market"],
        answer: 2,
        explanation: "Forex is a decentralized Over-The-Counter (OTC) market where participants trade directly."
      },
      {
        question: "Why is 'gap risk' significantly higher in the stock market compared to crypto?",
        options: ["Stocks are riskier assets.", "The stock market has fixed closing hours.", "Crypto markets have lower liquidity.", "Stock brokers charge higher fees."],
        answer: 1,
        explanation: "News accumulates overnight while the market is closed, causing the open price to 'gap' away from the previous close."
      },
      {
        question: "What is the primary revenue model for a Market Maker?",
        options: ["Speculating on trends.", "Charging withdrawal fees.", "Profiting from the Bid-Ask spread.", "Investing in dividends."],
        answer: 2,
        explanation: "Market makers profit from the difference between the buy and sell price (the spread)."
      }
    ],
    applyNow: [
      "Open your trading platform and identify the trading hours for AAPL vs BTC.",
      "Calculate the spread (Ask - Bid) for EUR/USD.",
      "Identify a 'Gap' on a daily stock chart."
    ]
  },
  {
    id: "market-microstructure",
    title: "Module 2: Market Microstructure & Order Mechanics",
    summary: "If asset classes are the vehicles, microstructure is the engine. Demystify the Order Book (DOM), order types, and leverage to execute like a professional.",
    level: "Beginner",
    sections: [
      {
        heading: "2.1 The Order Book and Depth of Market (DOM)",
        bullets: [
          "The Order Book: A real-time ledger of all buy/sell interest. The rawest source of market truth.",
          "The Bid (Green): Traders wanting to buy. Highest price = Best Bid.",
          "The Ask (Red): Traders wanting to sell. Lowest price = Best Ask.",
          "The Spread: Distance between Best Bid and Best Ask. Tight spread = high liquidity.",
          "Walls: Buy Walls (Support) and Sell Walls (Resistance) on the depth chart."
        ]
      },
      {
        heading: "2.2 Order Types: Tools of Execution",
        bullets: [
          "Market Order: Execute immediately at best price. Speed over price. Risk: Slippage.",
          "Limit Order: Execute only at specific price or better. Price over speed. Risk: Non-execution.",
          "Stop Order (Stop-Loss): Becomes a Market Order when a trigger price is hit. Primary risk management tool.",
          "Iceberg Orders: Hiding large institutional size.",
          "Trailing Stop: A dynamic stop that follows price to lock in profits."
        ]
      },
      {
        heading: "2.3 Leverage and Margin",
        bullets: [
          "Leverage: Using borrowed funds to increase position size.",
          "Margin: The collateral required to open the position.",
          "The Double-Edged Sword: Leverage magnifies gains AND losses. 10:1 leverage means a 10% move against you = 100% loss (Liquidation)."
        ]
      },
    ],
    quiz: [
      {
        question: "Which order type guarantees a specific price but does not guarantee execution?",
        options: ["Market Order", "Stop-Loss Order", "Limit Order", "Trailing Stop"],
        answer: 2,
        explanation: "A limit order guarantees you won't pay more (or sell for less), but if the market doesn't reach your price, it won't fill."
      },
      {
        question: "What does a 'Buy Wall' on a Depth Chart indicate?",
        options: ["Large sell concentration.", "Potential resistance.", "Large concentration of limit buy orders acting as support.", "Low liquidity."],
        answer: 2,
        explanation: "A vertical green wall means immense buying interest at that level, acting as support."
      },
      {
        question: "If you use 20:1 leverage, what price move against you results in 100% loss?",
        options: ["20%", "10%", "5%", "1%"],
        answer: 2,
        explanation: "100 divided by 20 = 5%."
      }
    ],
    applyNow: [
      "Open the DOM (Depth of Market) on your platform.",
      "Place a Limit Buy order below current price (don't execute).",
      "Calculate the margin required for 1 Standard Lot of EUR/USD at 100:1 leverage."
    ]
  },
  {
    id: "ta-price-action",
    title: "Module 3: Technical Analysis I - The Language of Price",
    summary: "Study the anatomy of the candlestick and market structure. Learn to read the footprints of buyers and sellers to identify trends and reversals.",
    level: "Intermediate",
    sections: [
      {
        heading: "3.1 Anatomy of the Candlestick",
        bullets: [
          "Body: Range between Open and Close. Green = Bullish, Red = Bearish.",
          "Wicks (Shadows): Extreme Highs and Lows.",
          "Psychology: Wicks are footprints of rejection. Long upper wick = Sellers rejected higher prices (Bearish). Long lower wick = Buyers rejected lower prices (Bullish)."
        ]
      },
      {
        heading: "3.2 Key Single-Candle Patterns",
        bullets: [
          "Hammer (Pin Bar): Small body, long lower wick. Reversal signal at Support.",
          "Shooting Star: Small body, long upper wick. Reversal signal at Resistance.",
          "Doji: Open approx equal to Close. Indecision."
        ]
      },
      {
        heading: "3.3 Market Structure: Identifying Trends",
        bullets: [
          "Uptrend: Higher Highs (HH) and Higher Lows (HL). Buy at HL.",
          "Downtrend: Lower Lows (LL) and Lower Highs (LH). Sell at LH.",
          "Support/Resistance Flip: Broken Resistance often becomes Support (Retest)."
        ]
      }
    ],
    quiz: [
      {
        question: "What does a 'Long Upper Wick' generally indicate?",
        options: ["Strong buying pressure.", "Rejection of higher prices (Bearish).", "Market is closed.", "Rejection of lower prices (Bullish)."],
        answer: 1,
        explanation: "Buyers tried to push up, but sellers smashed it back down, leaving a long wick."
      },
      {
        question: "Which sequence defines a healthy Uptrend?",
        options: ["LH and LL", "HH and LL", "HH and HL", "Flat Highs"],
        answer: 2,
        explanation: "Higher Highs and Higher Lows define an uptrend."
      },
      {
        question: "A 'Hammer' candle is most significant when found:",
        options: ["In consolidation.", "At the top of an uptrend.", "At the bottom of a downtrend (Support).", "During news."],
        answer: 2,
        explanation: "A hammer at support indicates a failed attempt to push lower and a potential reversal up."
      }
    ],
    applyNow: [
      "Find a Hammer candle on a Daily chart.",
      "Draw the most recent Higher High and Higher Low on BTC/USD.",
      "Identify a level where Resistance turned into Support."
    ]
  },
  {
    id: "ta-patterns",
    title: "Module 4: Technical Analysis II - Chart Patterns",
    summary: "Recognize geometric formations that reveal the broader psychological battle. Master Reversals, Continuations, and Bilateral patterns.",
    level: "Intermediate",
    sections: [
      {
        heading: "4.1 Reversal Patterns",
        bullets: [
          "Head and Shoulders: Left Shoulder, Head, Right Shoulder. Break of 'Neckline' confirms reversal (Bearish).",
          "Double Top (M): Failed to break resistance twice (Bearish).",
          "Double Bottom (W): Failed to break support twice (Bullish)."
        ]
      },
      {
        heading: "4.2 Continuation Patterns",
        bullets: [
          "Bull Flag: Sharp rise (Pole) followed by downward consolidation (Flag). Breakout signals continuation up.",
          "Bear Flag: Sharp drop followed by upward consolidation.",
          "Wedges: Rising Wedge (Bearish) and Falling Wedge (Bullish)."
        ]
      },
      {
        heading: "4.3 Bilateral Patterns",
        bullets: [
          "Symmetrical Triangle: Converging highs and lows (Coiling). Breakdown or Breakout can happen either way."
        ]
      }
    ],
    quiz: [
      {
        question: "A 'Bull Flag' is considered a ________ pattern.",
        options: ["Reversal", "Bilateral", "Continuation", "Bearish"],
        answer: 2,
        explanation: "It signals the market is resting before continuing the trend."
      },
      {
        question: "In a Head and Shoulders, when do you enter short?",
        options: ["At the Head.", "At the Right Shoulder.", "On the break of the Neckline.", "On the retest of the Head."],
        answer: 2,
        explanation: "The pattern is not confirmed until the neckline support is broken."
      },
      {
        question: "What distinguishes a Rising Wedge from an Ascending Channel?",
        options: ["Parallel lines", "Trendlines converge (get closer)", "Always bullish", "No difference"],
        answer: 1,
        explanation: "In a wedge, the price action tightens (converges), indicating fading momentum."
      }
    ],
    applyNow: [
      "Find a Double Top or Bottom on any chart.",
      "Draw a Bull Flag pattern.",
      "Identify a Symmetrical Triangle breakout."
    ]
  },
  {
    id: "ta-indicators",
    title: "Module 5: Technical Analysis III - Indicators",
    summary: "The dashboard of the trading vehicle. Use RSI, MACD, and Bollinger Bands to measure momentum, trend strength, and volatility.",
    level: "Intermediate",
    sections: [
      {
        heading: "5.1 Momentum: The RSI",
        bullets: [
          "Relative Strength Index: 0-100 scale.",
          "Overbought (>70) / Oversold (<30).",
          "Divergence (The Secret Weapon): Price makes Higher High, RSI makes Lower High (Bearish Divergence). Leading signal of reversal."
        ]
      },
      {
        heading: "5.2 Trend Following: The MACD",
        bullets: [
          "Moving Average Convergence Divergence.",
          "Crossovers: MACD line crosses Signal line.",
          "Golden Cross (50 SMA crosses above 200 SMA) and Death Cross (50 SMA crosses below 200 SMA)."
        ]
      },
      {
        heading: "5.3 Volatility: Bollinger Bands",
        bullets: [
          "The Squeeze: Bands contract tight = Volatility dropping = Explosive move coming.",
          "Walking the Bands: Price sticking to the outer band indicates extreme trend strength."
        ]
      }
    ],
    quiz: [
      {
        question: "Bullish Divergence occurs when:",
        options: ["Price HH, RSI HH", "Price LL, RSI HL", "Price LL, RSI LL", "RSI > 70"],
        answer: 1,
        explanation: "Price makes a Lower Low, but momentum (RSI) makes a Higher Low, showing selling pressure is fading."
      },
      {
        question: "What does a 'Bollinger Band Squeeze' predict?",
        options: ["Low volatility forever.", "Market crash.", "Impending volatility expansion (Breakout).", "Reversal."],
        answer: 2,
        explanation: "Volatility is cyclical. Low volatility (squeeze) leads to high volatility (expansion)."
      },
      {
        question: "The 'Death Cross' involves which Moving Averages?",
        options: ["9 and 21 EMA", "50 and 200 SMA", "100 and 200 SMA", "12 and 26 EMA"],
        answer: 1,
        explanation: "The 50 SMA crossing below the 200 SMA is a major long-term bearish signal."
      }
    ],
    applyNow: [
      "Add RSI to your chart and find a Divergence.",
      "Check if the S&P 500 is in a Golden Cross or Death Cross.",
      "Find a Bollinger Band Squeeze."
    ]
  },
  {
    id: "risk-management",
    title: "Module 6: Risk Management - The Math of Survival",
    summary: "You can have a 90% win rate and go broke. You can have a 40% win rate and be rich. The difference is Risk Management.",
    level: "Advanced",
    sections: [
      {
        heading: "6.1 The 1% Rule",
        bullets: [
          "Never risk more than 1-2% of account balance on a single trade.",
          "Prevents 'Risk of Ruin'. A 5-trade losing streak at 10% risk destroys 41% of capital. At 1%, it's just 5%."
        ]
      },
      {
        heading: "6.2 Position Sizing Formula",
        bullets: [
          "Risk is NOT position size.",
          "Position Size = (Account * Risk%) / (Entry - Stop Loss).",
          "Calculated based on where your invalidation point is, not how much you want to buy."
        ]
      },
      {
        heading: "6.3 Risk-to-Reward Ratio (R:R)",
        bullets: [
          "Minimum Acceptable R:R is 1:2. Risk $1 to make $2.",
          "With 1:2 R:R, you only need a 34% win rate to break even.",
          "Avoid negative R:R (risking $100 to make $50)."
        ]
      }
    ],
    quiz: [
      {
        question: "You have a $5,000 account and want to risk 2%. What is your max dollar risk?",
        options: ["$50", "$200", "$100", "$20"],
        answer: 2,
        explanation: "$5,000 * 0.02 = $100."
      },
      {
        question: "Why is a 1:2 Risk-to-Reward ratio recommended?",
        options: ["Guarantees a win.", "Allows profitability accurately with <50% win rate.", "Increases leverage.", "Reduces spreads."],
        answer: 1,
        explanation: "Mathematically, you can lose more often than you win and still make money."
      },
      {
        question: "If you risk $1000 on a trade, is that your Position Size?",
        options: ["Yes", "No, unless stock goes to zero."],
        answer: 1,
        explanation: "Risk is what you lose if stopped out. Position size is the total value of assets purchased."
      }
    ],
    applyNow: [
      "Calculate position size for a $10k account risking 1% with a $2 stop distance.",
      "Review your last 5 trades. What was the R:R?",
      "Set a hard 'Max Risk Per Day' rule."
    ]
  },
  {
    id: "psychology",
    title: "Module 7: Trading Psychology & Discipline",
    summary: "The charts are objective; the trader is subjective. Conquer FOMO, Revenge Trading, and Bias.",
    level: "Advanced",
    sections: [
      {
        heading: "7.1 The Emotional Cycle",
        bullets: [
          "FOMO (Fear Of Missing Out): Chasing parabolic spikes. Usually results in buying the top.",
          "Revenge Trading: Trying to 'punish' the market after a loss. Increasing size to 'win it back'. Fastest way to blow an account.",
          "Confirmation Bias: Only looking for info that supports your trade."
        ]
      },
      {
        heading: "7.2 Discipline: The Plan & Journal",
        bullets: [
          "The Trading Plan: Written rules. Setup Criteria, Risk Params, Exit Strategy.",
          "The Journal: You cannot improve what you do not measure. Record entry, exit, reasoning, and emotions."
        ]
      }
    ],
    quiz: [
      {
        question: "What is the best fix for Revenge Trading?",
        options: ["Double position size.", "The 'Walk Away Rule'.", "Switch to lower timeframes.", "Short the same asset."],
        answer: 1,
        explanation: "Stop trading immediately. Close the platform. Reset your mental state."
      },
      {
        question: "Buying a stock just because it's skyrocketing is an example of:",
        options: ["Smart Money", "FOMO", "Value Investing", "Divergence"],
        answer: 1,
        explanation: "Fear Of Missing Out leads to emotional, irrational entries."
      },
      {
        question: "What is Confirmation Bias?",
        options: ["Being confident.", "Ignoring evidence that contradicts your trade.", "Confirming a trend with volume.", "Waiting for candle close."],
        answer: 1,
        explanation: "It's the psychological trap of seeing only what you want to see."
      }
    ],
    applyNow: [
      "Write down your 'Walk Away' number (e.g., -$200 in a day).",
      "Start a trading journal today.",
      "Identify a time you 'chased' a trade."
    ]
  },
  {
    id: "strategy-synthesis",
    title: "Module 8: Strategy Synthesis & Final Scenarios",
    summary: "Synthesis of Modules 1-7. The 'Trend Pullback' Strategy and Final Exam Scenarios.",
    level: "Advanced",
    sections: [
      {
        heading: "8.1 Strategy: The 'Trend Pullback'",
        bullets: [
          "1. Trend ID (Daily): HH/HL structure? Above 50/200 SMA?",
          "2. The Setup (4H): Wait for pullback to Support or EMA.",
          "3. The Trigger: Bullish Reversal Candle (Hammer) + RSI Oversold/Divergence.",
          "4. Execution: Stop below wick. Target 1:2 R:R."
        ]
      },
      {
        heading: "8.2 Final Scenarios",
        bullets: [
          "Scenario 1 (The Trap): Asset up 15% in 2h, RSI 85. Don't buy. Look for reversal (Shooting Star).",
          "Scenario 2 (News): NFP in 5 mins. Do NOT trade. wait for volatility to settle.",
          "Scenario 3 (Risk): Confidence is high, so you risk 20%. FAILURE. Stick to 1-2%."
        ]
      }
    ],
    quiz: [
      {
        question: "In the 'Trend Pullback' strategy, where do you enter?",
        options: ["At the All-Time High.", "On the pullback to Support/EMA.", "When RSI is > 80.", "Before the trend starts."],
        answer: 1,
        explanation: "We want to buy the dip in an uptrend, maximizing R:R."
      },
      {
        question: "High-impact news (like NFP) usually causes:",
        options: ["Smooth trends.", "Massive spread widening and slippage.", "Low volatility.", "Guaranteed profits."],
        answer: 1,
        explanation: "News events enable massive volatility and liquidity gaps. Professional traders stand aside."
      },
      {
        question: "Which Trader wins long term?",
        options: ["Trader A: 80% win rate, 1:0.5 R:R.", "Trader B: 40% win rate, 1:3 R:R.", "Trader C: Risks 10% per trade.", "Trader D: Trades based on gut feel."],
        answer: 1,
        explanation: "Trader B makes massive returns despite losing more often, due to superior Risk/Reward math."
      }
    ],
    applyNow: [
      "Build your own Trading Plan checklist.",
      "Backtest the 'Trend Pullback' strategy on a demo account.",
      "Complete the Flux Trading Academy Final Assessment."
    ]
  }
];

export const finalAssessment: QuizQuestion[] = [
  {
    question: "Which asset class typically has the highest daily trading volume?",
    options: ["Crypto ($50B)", "Forex ($6.6T)", "Stocks ($84B)", "Commodities"],
    answer: 1,
    explanation: "Forex is by far the largest market, providing immense liquidity."
  },
  {
    question: "In a candlestick chart, what does the 'wick' represent?",
    options: ["The opening price only", "The highest and lowest prices reached", "The closing price", "Volume"],
    answer: 1,
    explanation: "The wicks (shadows) show the extreme price range (High and Low) outside the Open/Close body."
  },
  {
    question: "What is the recommended maximum risk per trade for beginners?",
    options: ["10%", "5%", "1%", "As much as you feel confident with"],
    answer: 2,
    explanation: "The 1% rule ensures you can survive a losing streak without blowing your account."
  },
  {
    question: "A 'Bull Flag' pattern typically signals:",
    options: ["A Reversal Down", "Continuation of the Uptrend", "Indecision", "Market Crash"],
    answer: 1,
    explanation: "A Bull Flag is a pause (consolidation) in an uptrend before the price continues higher."
  },
  {
    question: "Which indicator is best for identifying 'Overbought' conditions?",
    options: ["Moving Average", "RSI (Relative Strength Index)", "Volume", "Candlesticks"],
    answer: 1,
    explanation: "RSI > 70 generally indicates an asset is potentially overbought."
  }
];
