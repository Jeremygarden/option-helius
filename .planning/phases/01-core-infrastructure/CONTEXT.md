# Phase 1 — Discuss Context (gsd-discuss-phase 1)
Date: 2026-05-20

## Core Insight: Not Just a Dashboard — An Intelligent Analysis Engine

The platform must evolve from "data viewer" → "AI-powered options advisor":
1. User inputs a ticker → enters a full **Report** view
2. System simulates future option prices based on current data
3. AI analyzes whether Call/Put prices are **fairly priced**
4. User selects a strategy → AI evaluates it and explains market positioning

---

## Module A: 宏观数据 (Macro Dashboard)

### Data Sources
- Reference sites: https://www.mg21.com/hongguan.html, https://sc.macromicro.me/macro/us
- FRED API (free): Fed rate, CPI, yield curve
- Yahoo Finance / CBOE: Gold, Oil, Copper/Silver ratio

### Required Indicators
| Category | Indicators |
|----------|-----------|
| 货币政策 | 美联储利率走势 (Fed Funds Rate trend), Fed Watch probabilities |
| 通胀 | CPI YoY + MoM, PCE |
| 大宗商品 | 原油(WTI/Brent), 黄金, 银铜比 (Silver/Copper ratio) |
| 市场流动性 | VIX, VVIX, M2, 信用利差 |

---

## Module B: 重大事件 & 实时新闻风险

### Event Risk Panel
- FOMC 会议日历 (next meeting + implied rate change)
- 财报日历 (earnings dates with IV-implied move)
- CPI/PPI/NFP 发布日期
- Breaking news feed with AI risk classification

### Risk Level Tags
- 🟢 LOW — Routine data, no major surprise expected
- 🟡 MEDIUM — Event risk, watch IV expansion
- 🔴 HIGH — Black swan potential, hedge recommended

---

## Module C: 市场波动 & 流动性

- VIX term structure (contango/backwardation)
- Options flow: call/put dollar premium ratio
- Dark pool prints
- Put/Call OI ratio trend (rolling 5/20 day)

---

## Module D: 期权 Greeks 暴露 (Portfolio Greeks)

For a given position or watchlist:
- **Delta** — Directional exposure
- **Gamma** — Rate of delta change (key near expiry)
- **Vega** — IV sensitivity (critical for vol-selling strategies)
- **Theta** — Time decay (daily P&L from decay)

Display as:
- Individual position breakdown
- Aggregate portfolio Greeks
- Greeks sensitivity heatmap (strike x DTE)

---

## Module E: 黑天鹅情景测试 (Scenario Stress Test)

Scenarios to simulate:
| Scenario | Trigger |
|----------|---------|
| Flash Crash | -15% overnight |
| Vol Spike | VIX +50% (e.g. 15→22) |
| Gap Up | +10% on earnings beat |
| IV Crush | IV -40% post-earnings |
| Rate Shock | Fed surprise +50bps |

Output per scenario:
- P&L impact on current positions
- Greeks shift
- Recommended hedge

---

## Module F: AI 分析引擎 (Core Intelligence)

### Report Flow (per ticker)
```
User inputs ticker
  → Load options chain + macro context
  → AI calculates:
      1. Fair value estimate (BSM + adjustments)
      2. Call/Put mispricing detection
      3. Market sentiment reading (bullish/bearish/vol-play)
      4. Key strike analysis (max pain, gamma wall, put wall)
  → Display: Report page
```

### Option Price Simulation
- Black-Scholes-Merton pricing as baseline
- Skew adjustment (put premium vs call premium)
- Forward-looking IV estimate (based on events calendar)
- "Is this option cheap or expensive?" verdict

### Strategy Evaluator
User selects: Buy Call / Sell Put / Iron Condor / etc.
AI responds:
- Is this strategy reasonable given current IV Rank?
- Where is the risk? (max loss scenario)
- What is the market pricing in? (implied move)
- What are the critical price levels to watch?
- Suggested hedge if needed

---

## Module G: 缓存机制

- Redis: Cache API responses (TTL per data type)
  - Options chain: 1 min
  - IV history: 1 hour
  - Macro data: 15 min
  - AI analysis: 5 min (same ticker + strategy)
- Avoid redundant recalculation for AI analysis

---

## Implementation Priorities for Phase 1

1. **Ticker Report page** — entry point for all analysis
2. **Macro panel** with FRED + commodity data (mock first)
3. **Greeks exposure** visualization
4. **Scenario stress test** UI (mock scenarios)
5. **AI strategy evaluator** (mock AI responses first, real LLM later)
6. **Options chain** with fair value indicators
7. **Caching layer** (Redis)

---

## Key Design Decisions

- Report page is the **hub** — enter ticker → everything flows from there
- AI analysis uses **cached results** (Redis, TTL 5min per ticker+strategy)
- Stress test uses **local Monte Carlo** (no external API needed)
- BSM pricing implemented **in-house** (Python, scipy)
- LLM integration: use OpenAI/Anthropic API in Phase 3, rule-based mock in Phase 1
