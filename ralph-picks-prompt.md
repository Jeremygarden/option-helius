# Picks Page UI Deep Polish — Phase 2 Redux

## Reference
`/home/azureuser/projects/options-dashboard/ref-picks.png`

## Skill
Read `~/.openclaw/skills/frontend-design/SKILL.md` before starting.

## Context
This is a professional options trading terminal (Next.js + Tailwind). Picks page shows:
- Strategy cards grid (ranked options picks)
- Detail panel (shown when card is selected): key metrics + Greeks grid + recommendation
- Scanner summary stats
- Filter tabs: All / CALL / PUT / SPREAD

Current code already has baseline styling from previous rounds. Your job is to DEEPEN and REFINE it, referencing the PNG image closely.

Note: picks page has an interaction — clicking a card shows a detail panel ABOVE the grid.

## This Round's Focus
Check `git log --oneline -40` first to see what round-N style(picks-round-*) commits already exist.
Pick the NEXT incomplete area from the list below and implement it fully.

### Areas (pick the next uncovered one):
1. CSS tokens — check globals.css, add any missing CALL/PUT/SPREAD semantic color tokens
2. StrategyCard component — rank badge, strategy badge, contract mono, 2x2 stats grid, selected left-border highlight
3. Detail panel — 4-metric row (Breakeven/MaxProfit/MaxLoss/Probability) + Greeks 6-grid + recommendation text block
4. Page main layout — header with title + rescan button + scanner summary + detail panel + filter tabs + card grid
5. Scanner summary card — 3-col stats (count/bullish/bearish) + animated green pulse dot
6. Filter tab system — pill tabs All/CALL/PUT/SPREAD + client-side filter logic
7. Card selection interaction — useState selectedIndex + detail panel expand/collapse + smooth scroll
8. Badge color system — CALL=green bg+text / PUT=red bg+text / SPREAD=purple bg+text
9. Loading skeletons — shimmer card placeholders during scan
10. Empty state — centered icon + "No strategies found" + rescan button
11. Button system — primary (blue fill) / ghost (border only) consistent across page
12. Number formatting — font-mono for all Greeks/prices/percentages, green/red coloring rules
13. Hover states — card hover border brighten + all interactive elements have transition-all
14. Ticker pill list — show scanned tickers as small pills in header area
15. Final polish — spacing rhythm, alignment, visual hierarchy finalization

## Rules
- Read the relevant source files BEFORE making changes
- Make targeted, precise edits — do NOT rewrite whole files unnecessarily
- Preserve ALL data logic and API calls
- After editing: `git add -A && git commit -m "style(picks-round-N): <english description>" && git pull --rebase origin main && git push origin main`
- Output exactly: COMPLETE

Working dir: `/home/azureuser/projects/options-dashboard`
