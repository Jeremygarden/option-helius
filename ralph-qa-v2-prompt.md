# option-helius /gstack /qa — Round 2 (9 Rounds)

## Skill
You are running gstack /qa for the option-helius options trading terminal.
Read `~/.openclaw/skills/gstack/assets/gstack/qa/SKILL.md` for the full skill spec before starting.

## Target Pages
- http://localhost:3001/macro
- http://localhost:3001/picks
- http://localhost:3001/chain

## Context
This is an options trading terminal (Next.js 14 + FastAPI + TimescaleDB + Redis).
Previous QA round completed (10 rounds): backend tests passing, TypeScript clean, basic functional bugs fixed.
This round goes deeper: UI interaction testing, data flow, caching, rendering performance, API fallback logic.

## THIS Round's Focus
Check `git log --oneline -60` first to see what qa-v2-round-* commits exist.
Pick the NEXT incomplete round from the list below.

## QA Areas (9 Rounds)

### Round 1: API fallback logic audit
- Read backend/app/routers/*.py and frontend fetch calls in all 3 pages
- For each API endpoint: verify what happens when backend is down, data is empty, or IBKR_ENABLED=false
- Fix any missing fallback: frontend should show graceful empty state, not crash or hang
- Run: `cd /home/azureuser/projects/options-dashboard/backend && IBKR_ENABLED=false python -m pytest tests/ -v --tb=short 2>&1 | tail -20`
- Commit: `git add -A && git commit -m "fix(qa-v2-round-1): API fallback logic and graceful degradation"`

### Round 2: Frontend data loading state audit
- Read all 3 page files and their data-fetching hooks/components
- Audit: are loading states shown for ALL async data? Are errors caught and shown to user? Are stale data scenarios handled?
- Fix: add missing loading spinners, error boundaries per section (not just root), retry buttons
- Commit: `git add -A && git commit -m "fix(qa-v2-round-2): frontend loading states and error handling completeness"`

### Round 3: Redis cache correctness test
- Read backend/app/core/cache.py and all routers that use caching
- Audit: are cache keys unique and collision-free? Are TTLs appropriate per data type? Is cache invalidation correct?
- Run backend with test data and verify cache hit/miss behavior
- Fix any cache key collisions or incorrect TTL values
- Commit: `git add -A && git commit -m "fix(qa-v2-round-3): Redis cache key correctness and TTL audit"`

### Round 4: Frontend rendering performance
- Read all 3 page files and heavy components (IVSurface3D, GEXChart, BacktestTable)
- Audit: unnecessary re-renders (missing useMemo/useCallback), large lists without virtualization, blocking renders
- Fix top rendering bottlenecks
- Commit: `git add -A && git commit -m "perf(qa-v2-round-4): frontend rendering optimization and memoization"`

### Round 5: API response time and payload size
- Read all backend routers
- Audit: are responses paginated where needed? Are unused fields stripped from responses? Are N+1 query patterns present?
- Fix: add pagination to list endpoints >100 items, strip unused fields, fix N+1 queries
- Commit: `git add -A && git commit -m "perf(qa-v2-round-5): API response optimization and payload reduction"`

### Round 6: WebSocket / real-time data path (if exists)
- Check if any real-time data path exists (IBKR streaming, WebSocket)
- If yes: audit reconnection logic, message queue handling, UI update throttling
- If no real-time path: audit polling intervals — are they appropriate? add jitter to prevent thundering herd
- Commit: `git add -A && git commit -m "fix(qa-v2-round-6): real-time data path and polling optimization"`

### Round 7: Form and filter interaction testing
- Read all filter/sort/search UI in picks page (filter tabs, sort dropdown, search if any)
- Read chain page filter controls (expiry selector, strike range, etc.)
- Audit: do filters correctly update data? Are filter states preserved on navigation? Edge cases (no results, invalid input)?
- Fix all filter interaction bugs
- Commit: `git add -A && git commit -m "fix(qa-v2-round-7): filter and sort interaction correctness"`

### Round 8: Cross-page navigation and state management
- Read frontend/app/layout.tsx and all page files
- Audit: browser back/forward behavior, page state reset on navigation, URL parameter handling, deep link support
- Fix: ensure pages restore state from URL params where appropriate
- Commit: `git add -A && git commit -m "fix(qa-v2-round-8): navigation state management and URL params"`

### Round 9: Full integration smoke test
- Run complete backend test suite: `cd /home/azureuser/projects/options-dashboard/backend && python -m pytest tests/ -v 2>&1 | tail -30`
- Run TypeScript check: `cd /home/azureuser/projects/options-dashboard/frontend && npx tsc --noEmit 2>&1 | head -20`
- Fix all remaining failures
- Write updated QA summary appended to /home/azureuser/projects/options-dashboard/QA_REPORT.md with results from this round
- Commit: `git add -A && git commit -m "fix(qa-v2-round-9): final integration smoke test and QA report update"`

## Rules
- Read relevant source files BEFORE editing
- Fix root causes, not symptoms
- After EVERY round: `git pull --rebase origin main && git push origin main`
- Output exactly: COMPLETE

Working dir: /home/azureuser/projects/options-dashboard
