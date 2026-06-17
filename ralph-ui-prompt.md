# Options Terminal UI Redesign

## Skill
Read `~/.openclaw/skills/frontend-design/SKILL.md` before starting. Apply its principles throughout.

## Design Reference
Target aesthetic: **NUX AI Research Terminal** — see reference screenshots in the task context.

Key visual characteristics to replicate:
- Dark navy/charcoal background (#0f1117 or similar), NOT pure black
- Left sidebar: wide ~220px, icon + Chinese label nav items, active item has solid blue fill pill (full width row), section groupings with subtle separators
- Top bar: page title (large, bold, Chinese + English), icon action buttons top-right, ticker search input top-right
- Expiry date tab bar: pill tabs with "7D/14D" DTE labels, active tab highlighted blue
- KPI bar: 5 metric boxes in a row, label on top (small gray), value large bold below, accent color for important metrics
- Chart cards: dark card bg (#161b22 or similar), subtle border, card title + subtitle in header, clean chart area
- Color system: #58a6ff accent blue, #3fb950 bullish green, #f85149 bearish red, #e6edf3 primary text, #7d8590 secondary text
- Typography: monospace font for all numbers/prices/values (JetBrains Mono or similar via next/font), sans-serif for labels
- Picks page: option cards in a grid with green left border for selected/active, monospace contract code in title, stats in 2-col grid inside card
- Charts have Chinese axis labels and tooltips

## Project
Path: `/home/azureuser/projects/options-dashboard/frontend`
Stack: Next.js 14, TypeScript, Tailwind CSS v3, Recharts, Plotly.js, Lucide React
**Do NOT install new npm packages.** Use only what's in package.json.

Key files to edit:
- `app/globals.css` — CSS variables, base styles, font imports
- `app/layout.tsx` — root layout
- `components/layout/Sidebar.tsx`
- `components/layout/TopBar.tsx`
- `app/chain/page.tsx`
- `app/picks/page.tsx`
- `components/chain/KPIBar.tsx`
- `components/picks/StrategyCard.tsx`
- `components/chain/OIVolChart.tsx`
- `components/chain/GEXChart.tsx`
- `components/chain/TermStructure.tsx`

## Round Instructions
Each iteration = ONE focused area. Do it completely and correctly, then git commit+push, then output COMPLETE.

Check `git log --oneline -10` first to see what's already done. Then pick the NEXT undone item:

### Round 1 — Font system + CSS variables
- In `app/layout.tsx`: import `JetBrains_Mono` and `Geist` from `next/font/google`, replace Inter
- In `app/globals.css`: define CSS custom properties:
  ```css
  :root {
    --bg-base: #0d1117;
    --bg-surface: #161b22;
    --bg-elevated: #1c2128;
    --border-default: #30363d;
    --border-muted: #21262d;
    --text-primary: #e6edf3;
    --text-secondary: #8b949e;
    --text-muted: #6e7681;
    --accent-blue: #58a6ff;
    --accent-green: #3fb950;
    --accent-red: #f85149;
    --accent-yellow: #d29922;
    --accent-purple: #a371f7;
    --font-mono: 'JetBrains Mono', monospace;
    --font-sans: 'Geist', sans-serif;
  }
  ```
- Apply `font-family: var(--font-mono)` to all elements with class `font-mono` or `tabular-nums`
- Apply `font-family: var(--font-sans)` as body default

### Round 2 — Sidebar redesign
Target: NUX-style wide sidebar (~220px), icon + Chinese label, active state = full-width blue filled row
- Width: `w-[220px]`
- Logo area: "H" with blue glow + "Helius" text below
- Nav items: `flex items-center gap-3 px-4 py-2.5`, active = `bg-[#1158c7] text-white rounded-lg mx-2`
- Inactive: `text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#1c2128] rounded-lg mx-2`
- Show both icon (20px) AND Chinese label AND English sub-label
- Section dividers between nav groups
- File: `components/layout/Sidebar.tsx`

### Round 3 — TopBar redesign
Target: page title left (large bold), action icons + search right
- Left: display current page title in Chinese (大字 text-xl font-bold)
- Center: nothing or breadcrumb
- Right: icon buttons (Bell, Settings, User avatar) + compact ticker display (NVDA green, VIX red)
- Search: magnifier icon, clean border, placeholder "搜索标的..."
- File: `components/layout/TopBar.tsx`

### Round 4 — KPIBar component
Target: 5 horizontal metric cards, label top gray small, value large bold with accent color
- Each metric: `flex flex-col gap-1 px-6 py-3 border-r border-[--border-default]`
- Label: `text-xs text-[--text-secondary] uppercase tracking-wide`
- Value: `text-xl font-bold font-mono` with appropriate color (green/red/blue)
- File: `components/chain/KPIBar.tsx`

### Round 5 — Chain page layout + expiry tabs
Target: proper grid layout, styled expiry date pill tabs, chart card containers
- Expiry tabs: scrollable horizontal pill strip, each tab = `px-3 py-1 rounded-full text-xs`, active = `bg-[--accent-blue] text-white`
- Each chart wrapped in: `bg-[--bg-surface] border border-[--border-default] rounded-lg p-4`
- Chart card header: `text-sm font-semibold text-[--text-primary]` title + `text-xs text-[--text-secondary]` subtitle
- Layout: 2-column grid for charts (IV surface left, term structure right), full-width for OI/GEX below
- File: `app/chain/page.tsx`

### Round 6 — StrategyCard redesign
Target: NUX picks page card — green left border for active, monospace contract code, stats grid
- Card: `bg-[--bg-surface] border border-[--border-default] rounded-lg p-4 relative`
- Top: rank badge `#1` top-left, strategy type badge `CALL/PUT/SPREAD` top-right (green/red bg)
- Contract code: `font-mono text-sm text-[--text-primary] font-bold mt-2`
- Stats grid: 2-column, each = label (gray xs) + value (mono sm)
- Selected/top card: `border-l-4 border-l-[--accent-green]`
- File: `components/picks/StrategyCard.tsx`

### Round 7 — Picks page layout
Target: scanner summary section + chart row + picks grid
- Scanner summary card at top: dark bg, bullet point list of scan results
- Below: 2 charts side by side (daily K-line path + intraday VWAP) in styled card containers
- Below: picks grid `grid grid-cols-2 md:grid-cols-4 gap-3`
- Filter/rescan button top-right: styled blue button
- File: `app/picks/page.tsx`

### Round 8 — Global polish + consistency pass
- Audit all pages for consistent spacing (use `gap-4`, `p-4`, `rounded-lg` everywhere)
- Ensure all number values use `font-mono` class
- Add hover states to all interactive elements
- Fix any remaining raw HTML feel (unstyled divs, missing borders, etc.)
- Check `app/macro/page.tsx` and `app/sentiment/page.tsx` — apply same card/typography treatment
- Remove any placeholder/debug styles

## Git
Working dir: `/home/azureuser/projects/options-dashboard`
After each round: `git add -A && git commit -m "style(round-N): description" && git push origin main`

## Output
After completing changes AND pushing: output exactly:
COMPLETE
