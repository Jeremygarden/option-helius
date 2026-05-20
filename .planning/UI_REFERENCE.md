# UI_REFERENCE.md — 界面参考规格

Based on user-provided reference images. These are the canonical design targets.

---

## Module 1: 每周精选卡片 (Weekly Picks Cards)

**Layout:** Dark-themed card grid, one card per trade idea

### Card Structure (top → bottom)
```
┌─────────────────────────────────────────────────┐
│ [标签] TICKER  Strategy Name      ████████ 9/10 ▲│
├─────────────────────────────────────────────────┤
│  [Sell] 1张  65P  2028/01/21                     │
├─────────────────────────────────────────────────┤
│ 🎯 入场条件    [content]                         │
│    └ 💡 scenario tip                             │
├─────────────────────────────────────────────────┤
│ 📋 目标预期    [content]                         │
├─────────────────────────────────────────────────┤
│ 🔴 止损位      [content]                         │
├─────────────────────────────────────────────────┤
│ ⚠️  最大风险   [content]                         │
├─────────────────────────────────────────────────┤
│ 💰 预期回报    [content]                         │
├─────────────────────────────────────────────────┤
│ ⏱  持有周期   [content]                         │
├─────────────────────────────────────────────────┤
│ 📊 异动依据: [signal text]                       │
│ ⚠️  风险点: [risk text]                          │
│ 💵 资金占用: [capital text]                      │
└─────────────────────────────────────────────────┘
```

### Data Fields
- `ticker` — Stock symbol
- `strategy_name` — e.g. "Sell Cash-Secured Put", "Iron Condor"
- `strategy_tag` — "核心" / "激进" / "保守"
- `score` — 1-10 safety margin score
- `legs` — Array of option legs (action, qty, strike, expiry, type)
- `entry_condition` — Entry timing/condition text
- `entry_tip` — Scenario conditional tip
- `target` — Expected outcome
- `stop_loss` — Stop loss level
- `max_risk` — Maximum risk in dollars
- `expected_return` — Return range in dollars
- `holding_period` — "短线" / "中线" / "长线持仓"
- `signal_basis` — Unusual activity evidence
- `risk_points` — Key risk factors
- `capital_required` — Margin/capital needed

### Styling
- Background: `#0d1117` (dark)
- Card border: colored left-border by strategy type (green=sell put, blue=call spread, orange=iron condor)
- Score bar: green filled segments
- Sell badge: red pill
- Font: monospace for strikes/prices

---

## Module 2: 新闻情绪面 (News Sentiment Panel)

**Reference:** NUX智能金融研究终端 — 新闻影响分析

### Layout (2-column)

**Left panel (main):**
- Ticker search input + 预测 button
- Breaking news card:
  - `BREAKING` badge + timestamp
  - Headline text (large)
  - `VERDICT` button — AI judgment (e.g. "LOAD THE BOAT", "WAIT", "FADE")
  - Confidence percentage
- Price Impact Velocity chart:
  - Horizontal bar: Current position → Predicted range
  - Alpha remaining label
  - Current % vs Predicted range %
  - AI explanation text

**Right panel:**
- Historical Patterns section:
  - Past similar events with date, event type, % match, price impact
- Sentiment Velocity:
  - Bar chart: sentiment score over time (news → break → now)

### Data Needed
- News headlines (via RSS/API: Benzinga, Seeking Alpha, Yahoo Finance News)
- Historical event matching (store event→price impact in TimescaleDB)
- Sentiment scoring (keyword-based or LLM-based)
- Social signals: Reddit (WallStreetBets) + Twitter/X mentions

---

## Module 3: 期权链分析终端 (Options Chain Terminal)

**Reference:** NUX — NVDA 期权链分析终端

### Top KPI Bar (5 metrics)
```
预期波动($) | MAX PAIN($) | PUT/CALL VOLUME | PUT/CALL OI | 净GAMMA曝险($)
```

### Expiry Date Tabs
- Horizontal scrollable tabs with DTE labels
- Active tab highlighted

### Main Grid (2x2)

**Top-left: 链上波动曲面 (IV Surface)**
- 3D surface chart: X=Strike, Y=IV(%), Z=DTE
- Interactive: hover shows strike + IV + P/L
- Toggle: 3D / $ / table view
- Current price marker

**Top-right: 期权结构 (Term Structure)**
- Line chart: X=DTE, Y=IV%
- Two lines: ATM IV (blue dots) + Expected Move (orange)
- Dual Y-axis

**Bottom-left: 持仓与成交量分布**
- Grouped bar chart per strike:
  - Call OI (teal), Put OI (pink), Call Vol (dark teal), Put Vol (dark red)
- Toggle: 柱状图 / 热力图
- PCR (Put/Call Ratio) displayed
- Tooltip: Call OI, Put OI, Call Vol, Put Vol at hovered strike

**Bottom-right: Gamma曝险分布 (GEX)**
- Bar chart per strike (positive/negative GEX in purple)
- Max Pain line (horizontal, orange)
- Net GEX shown in KPI bar

### Sidebar Navigation (consistent with NUX style)
- 概览 / 报告 / 聊天 / 期权链 / 回测 / 影响 / 宏观 / 交易 / 时间机器 / 私有信号 / 学院 / 反馈
