# option-helius /design-review — 10 Rounds

## Skill
You are running gstack /design-review for the option-helius options trading terminal.
Read `~/.openclaw/skills/gstack/assets/gstack/design-review/SKILL.md` for the full skill spec before starting.

## Target URLs
- http://localhost:3001/macro (or 3000 if 3001 not available)
- http://localhost:3001/chain
- http://localhost:3001/picks

## App Context
This is a professional options trading terminal (APP UI classifier, not marketing).
Dark theme. Dense data. Tailwind + Next.js 14. Not a landing page.

## gstack browse binary
Use: `~/.openclaw/skills/gstack/browse/dist/browse`
If not found: skip browser screenshots, work from source code reading only.

## This Round's Focus
Check `git log --oneline -40` first to see what design-review-round-* commits exist.
Pick the NEXT incomplete fix from the findings below and implement it fully.

## Design Findings to Fix (in order — skip already-committed ones)

Round 1: Typography system
- Audit all pages for font-family inconsistency
- Add `font-mono` class to ALL numeric values (prices, percentages, deltas, Greeks)
- Add `font-sans` class consistency to labels and headings
- Commit: `git add -A && git commit -m "style(design-review-round-1): enforce font-mono on all numeric values"`

Round 2: Spacing rhythm
- Audit globals.css and all page files for spacing inconsistencies
- Standardize: section gaps = `gap-4`, card internal padding = `p-4`, border-radius = `rounded-lg`
- Remove any arbitrary px spacing values, replace with Tailwind scale
- Commit: `git add -A && git commit -m "style(design-review-round-2): standardize spacing rhythm to 4px grid"`

Round 3: Color token audit
- Find all hardcoded hex colors in frontend/app/ and frontend/components/
- Replace with CSS var tokens from globals.css (--accent-blue, --text-secondary, etc.)
- Ensure dark mode consistency: bg-[#0d1117] = base, bg-[#161b22] = surface, bg-[#1c2128] = elevated
- Commit: `git add -A && git commit -m "style(design-review-round-3): replace hardcoded hex with CSS token vars"`

Round 4: Interaction states
- Audit all buttons, tabs, links for hover/active/focus states
- Add `transition-colors` or `transition-all` to all interactive elements missing it
- Add `cursor-pointer` to all clickable divs
- Add `focus-visible` ring to all keyboard-focusable elements
- Commit: `git add -A && git commit -m "style(design-review-round-4): add hover/focus/active states to all interactive elements"`

Round 5: Chain page layout
- Fix any layout issues on /chain: header alignment, KPIBar spacing, expiry tabs overflow
- Ensure chart containers have consistent card wrapper (title bar + content + border)
- Fix any visual hierarchy issues (chart titles too small, labels competing with data)
- Commit: `git add -A && git commit -m "style(design-review-round-5): fix chain page layout and visual hierarchy"`

Round 6: Picks page layout
- Fix any layout issues on /picks: card grid alignment, detail panel transition
- Ensure strategy badge colors are semantically consistent (CALL green, PUT red, SPREAD purple)
- Fix scanner summary card spacing and stats alignment
- Commit: `git add -A && git commit -m "style(design-review-round-6): fix picks page layout and badge system"`

Round 7: Macro page layout
- Audit /macro page: KPI grid, warning indicators, backtest table
- Fix any misaligned elements, inconsistent card styles, or overflow issues
- Ensure data freshness indicators are visible and correctly colored
- Commit: `git add -A && git commit -m "style(design-review-round-7): fix macro page layout and indicators"`

Round 8: Loading and empty states
- Add loading skeleton (animate-pulse shimmer) to all async data areas that lack one
- Add empty state messaging (icon + text + action) where data could be missing
- Ensure loading state dimensions match real content (no layout shift)
- Commit: `git add -A && git commit -m "style(design-review-round-8): add loading skeletons and empty states"`

Round 9: Mobile responsiveness
- Audit all three pages at 375px viewport
- Fix any horizontal overflow issues
- Ensure KPIBar is readable on mobile (grid cols-2 instead of cols-5)
- Ensure navigation is usable on mobile
- Commit: `git add -A && git commit -m "style(design-review-round-9): fix mobile responsiveness across all pages"`

Round 10: AI slop audit and final polish
- Check for and remove any: colored left-border cards (replace with proper selection state), uniform bubbly radius on everything, centered text on data-dense areas
- Final typography check: heading hierarchy h1→h2→h3 consistent
- Final spacing: no stray px values, consistent gap/padding scale
- Commit: `git add -A && git commit -m "style(design-review-round-10): remove AI slop patterns and final polish"`

## Rules
- Read relevant source files BEFORE editing
- Never delete data logic, only change className/CSS/layout
- After each round: `git pull --rebase origin main && git push origin main`
- Output exactly: COMPLETE

Working dir: /home/azureuser/projects/options-dashboard
