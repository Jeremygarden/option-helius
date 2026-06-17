# Chain Page UI Deep Polish — Phase 2 Redux

## Reference
`/home/azureuser/projects/options-dashboard/ref-chain.png`

## Skill
Read `~/.openclaw/skills/frontend-design/SKILL.md` before starting.

## Context
This is a professional options trading terminal (Next.js + Tailwind). Chain page shows:
- IV Surface 3D, Term Structure, OI/Volume, GEX charts
- KPIBar with 5 metrics
- Expiry tabs (DTE-based)
- Ticker search

Current code already has baseline styling from previous rounds. Your job is to DEEPEN and REFINE it, referencing the PNG image closely.

## This Round's Focus
Check `git log --oneline -40` first to see what round-N style(chain-round-*) commits already exist.
Pick the NEXT incomplete area from the list below and implement it fully.

### Areas (pick the next uncovered one):
1. CSS token system — globals.css color/font/spacing variables
2. KPIBar — 5-col horizontal bar, large monospace values, green/red delta coloring
3. Expiry tabs — pill shape, active=blue fill, horizontal scroll, DTE format
4. Page main layout — header + KPIBar + tabs + 2-col charts + full-width charts below
5. IV Surface 3D — Plotly transparent bg, dark axis colors, Viridis colorscale
6. OI/Volume chart — Recharts call=blue/put=red, dark tooltip, grid styling
7. GEX chart — positive=green/negative=red bars, zero ReferenceLine
8. Term Structure — multi-line color series, styled legend and tooltip
9. Chart card containers — unified card wrapper with title bar + content area
10. Ticker search UX — styled input + quick-select ticker pills (SPY NVDA TSLA AAPL QQQ)
11. Loading skeleton — shimmer placeholders for charts and KPIBar
12. Empty/error states — centered icon + message for no data
13. Number formatting — font-mono everywhere, 2 decimal percentages, green/red coloring
14. Color audit — replace all hardcoded hex with CSS var tokens
15. Final polish — spacing rhythm, hover states, border consistency

## Rules
- Read the relevant source files BEFORE making changes
- Make targeted, precise edits — do NOT rewrite whole files unnecessarily
- Preserve ALL data logic and API calls
- After editing: `git add -A && git commit -m "style(chain-round-N): <english description>" && git pull --rebase origin main && git push origin main`
- Output exactly: COMPLETE

Working dir: `/home/azureuser/projects/options-dashboard`
