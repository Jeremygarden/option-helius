# option-helius /qa — 10 Rounds

## Skill
You are running gstack /qa for the option-helius options trading terminal.
Read `~/.openclaw/skills/gstack/assets/gstack/qa/SKILL.md` for the full skill spec before starting.

## Target URLs
- http://localhost:3001/macro (or 3000)
- http://localhost:3001/chain
- http://localhost:3001/picks

## Context
This is an options trading terminal. Previous work:
- gstack /design-review completed (UI polish)
- gstack /plan-eng-review completed (architecture + performance)
- IBKR integration complete
- Macro 18-indicator real data integration in progress

## This Round's Focus
Check `git log --oneline -40` first to see what qa-round-* commits exist.
Pick the NEXT incomplete QA area from the list below.

## QA Areas to Test and Fix (in order)

Round 1: Backend API smoke test
- Run `cd /home/azureuser/projects/options-dashboard/backend && python -m pytest tests/ -v --tb=short 2>&1 | tail -30`
- Fix any failing tests
- Commit: `git add -A && git commit -m "fix(qa-round-1): fix failing backend tests"`

Round 2: Frontend TypeScript compilation check
- Run `cd /home/azureuser/projects/options-dashboard/frontend && npx tsc --noEmit 2>&1 | head -40`
- Fix any TypeScript errors
- Commit: `git add -A && git commit -m "fix(qa-round-2): fix TypeScript compilation errors"`

Round 3: Chain page functional test
- Read frontend/app/chain/page.tsx and components/chain/*.tsx
- Check for: broken imports, undefined variables, missing null checks, unhandled promise rejections
- Fix all found issues
- Commit: `git add -A && git commit -m "fix(qa-round-3): fix chain page functional bugs"`

Round 4: Picks page functional test
- Read frontend/app/picks/page.tsx and components/picks/*.tsx
- Check for: broken card selection state, detail panel missing data props, filter tab edge cases
- Fix all found issues
- Commit: `git add -A && git commit -m "fix(qa-round-4): fix picks page functional bugs"`

Round 5: Macro page functional test
- Read frontend/app/macro/page.tsx and components/macro/*.tsx
- Check for: broken data binding, missing loading states, indicator value display issues
- Fix all found issues
- Commit: `git add -A && git commit -m "fix(qa-round-5): fix macro page functional bugs"`

Round 6: IBKR integration smoke test
- Check backend/app/services/ibkr/*.py for obvious bugs
- Verify fallback logic: if IBKR_ENABLED=false, should use yfinance without errors
- Run: `cd /home/azureuser/projects/options-dashboard/backend && IBKR_ENABLED=false python -m pytest tests/test_ibkr_integration.py -v 2>&1`
- Fix any failures
- Commit: `git add -A && git commit -m "fix(qa-round-6): fix IBKR integration tests and fallback logic"`

Round 7: API endpoint contract test
- Read all routers in backend/app/routers/
- Verify response schemas match what frontend expects (check frontend fetch calls for field names)
- Fix any schema mismatches
- Commit: `git add -A && git commit -m "fix(qa-round-7): fix API response schema mismatches"`

Round 8: Navigation and routing test
- Read frontend/app/layout.tsx and components/layout/Sidebar.tsx
- Verify all nav links use correct hrefs matching actual app/*/page.tsx paths
- Fix any broken navigation links
- Commit: `git add -A && git commit -m "fix(qa-round-8): fix navigation routing issues"`

Round 9: Environment and Docker test
- Read docker-compose.yml, .env.example
- Verify all required env vars are documented in .env.example
- Check that IBKR_ENABLED=false mode works without Docker IBKR sidecar
- Fix any missing env var documentation
- Commit: `git add -A && git commit -m "fix(qa-round-9): fix environment config and Docker setup issues"`

Round 10: Final regression and test coverage
- Run full backend test suite: `cd /home/azureuser/projects/options-dashboard/backend && python -m pytest tests/ -v 2>&1 | tail -20`
- Run TypeScript check: `cd /home/azureuser/projects/options-dashboard/frontend && npx tsc --noEmit 2>&1 | head -20`
- Fix any remaining failures
- Write a brief QA summary to /home/azureuser/projects/options-dashboard/QA_REPORT.md with: tests passed/failed, TypeScript errors found/fixed, key bugs fixed per round
- Commit: `git add -A && git commit -m "fix(qa-round-10): final regression fixes + QA report"`

## Rules
- Read relevant source files BEFORE editing
- Fix root causes, not symptoms
- After each round: `git pull --rebase origin main && git push origin main`
- Output exactly: COMPLETE

Working dir: /home/azureuser/projects/options-dashboard
