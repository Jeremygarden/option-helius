# option-helius /gstack /design-review — Round 2 (9 Rounds)

## Skill
You are running gstack /design-review for the option-helius options trading terminal.
Read `~/.openclaw/skills/gstack/assets/gstack/design-review/SKILL.md` for the full skill spec before starting.

## Target Pages
- http://localhost:3001/macro
- http://localhost:3001/picks
- http://localhost:3001/chain

## Context
This is a professional options trading terminal (Next.js 14 + Tailwind).
Previous design-review round has been completed (10 rounds). This is a NEW round of deeper design review.
Previous work established: font-mono for numbers, 4px grid spacing, CSS tokens for colors, hover/focus/active states, loading skeletons, mobile responsiveness, AI slop cleanup.

## THIS Round's Focus
Check `git log --oneline -60` first to see what design-review-v2-round-* commits exist.
Pick the NEXT incomplete round from the list below.

## Design Review Areas (9 Rounds)

### Round 1: Visual hierarchy audit — chain page
- Read frontend/app/chain/page.tsx and all components/chain/*.tsx
- Audit: information hierarchy (what draws eye first?), data density vs whitespace balance, section titles and labels clarity
- Fix all hierarchy and clarity issues found
- Commit: `git add -A && git commit -m "style(design-review-v2-round-1): chain page visual hierarchy and information clarity"`

### Round 2: Visual hierarchy audit — picks page
- Read frontend/app/picks/page.tsx and all components/picks/*.tsx
- Audit: card grid density, strategy card readability, filter/sort bar usability, detail panel layout
- Fix all issues found
- Commit: `git add -A && git commit -m "style(design-review-v2-round-2): picks page visual hierarchy and card layout"`

### Round 3: Visual hierarchy audit — macro page
- Read frontend/app/macro/page.tsx and all components/macro/*.tsx
- Audit: 18-indicator grid layout, backtest table readability, run-risk panel prominence, warning indicators visibility
- Fix all issues found
- Commit: `git add -A && git commit -m "style(design-review-v2-round-3): macro page visual hierarchy and indicator grid"`

### Round 4: Typography and color system deep audit
- Read frontend/app/globals.css and all page/component files
- Audit: font size scale consistency, line-height, letter-spacing on labels, color contrast ratios (aim for WCAG AA), text truncation on small screens
- Fix all typography and color issues
- Commit: `git add -A && git commit -m "style(design-review-v2-round-4): typography scale and color contrast improvements"`

### Round 5: Interactive component polish — buttons, tabs, dropdowns
- Read all interactive UI components across chain/picks/macro pages
- Audit: button sizing consistency, tab indicator style, dropdown/select styling, toggle states
- Fix all interactive component inconsistencies
- Commit: `git add -A && git commit -m "style(design-review-v2-round-5): interactive component polish and consistency"`

### Round 6: Data visualization review — charts and tables
- Read all chart components: GEXChart.tsx, IVSurface3D.tsx, OIVolChart.tsx, TermStructure.tsx, BacktestTable.tsx
- Audit: chart legends readability, axis labels, tooltip styling, table column widths and alignment, number formatting
- Fix all data viz issues
- Commit: `git add -A && git commit -m "style(design-review-v2-round-6): chart and table data visualization improvements"`

### Round 7: Sidebar and navigation UX
- Read frontend/app/layout.tsx and frontend/components/layout/Sidebar.tsx (or equivalent nav component)
- Audit: active state clarity, nav item spacing, icon+label alignment, collapsed/expanded state if applicable
- Fix all navigation UX issues
- Commit: `git add -A && git commit -m "style(design-review-v2-round-7): sidebar and navigation UX improvements"`

### Round 8: Micro-interactions and transitions
- Read all page and component files
- Add/fix: smooth transitions on tab switches, card hover lift effects, loading state transitions, panel expand/collapse animations
- Use Tailwind transition utilities; keep animations under 200ms
- Commit: `git add -A && git commit -m "style(design-review-v2-round-8): micro-interactions and transition polish"`

### Round 9: Final design QA and consistency pass
- Full read of all 3 pages and their components
- Fix any remaining inconsistencies: mixed border-radius values, inconsistent shadow depths, orphaned styles, dead CSS classes
- Ensure all 3 pages feel like a unified product
- Commit: `git add -A && git commit -m "style(design-review-v2-round-9): final design QA and consistency pass"`

## Rules
- Read relevant source files BEFORE editing
- Fix root causes, not symptoms
- After EVERY round: `git pull --rebase origin main && git push origin main`
- Output exactly: COMPLETE

Working dir: /home/azureuser/projects/options-dashboard
