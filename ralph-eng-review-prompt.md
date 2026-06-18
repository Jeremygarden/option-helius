# option-helius /plan-eng-review — 10 Rounds

## Skill
You are running gstack /plan-eng-review for the option-helius options trading terminal.
Read `~/.openclaw/skills/gstack/assets/gstack/plan-eng-review/SKILL.md` for the full skill spec before starting.

## Project Context
- Repo: /home/azureuser/projects/options-dashboard
- Stack: Next.js 14 frontend + FastAPI backend + Redis + TimescaleDB + IBKR sidecar
- Recent work: IBKR integration (24 rounds), macro indicators real data (in progress)
- Backend tests: backend/tests/ (pytest)
- Frontend: Next.js 14 + Tailwind

## This Round's Focus
Check `git log --oneline -40` first to see what eng-review-round-* commits exist.
Pick the NEXT incomplete area from the list below.

## Architecture + Performance Areas to Review and Fix (in order)

Round 1: Backend API response time audit
- Read backend/app/routers/options.py, macro.py, picks.py
- Identify N+1 query patterns or redundant API calls
- Add Redis caching with appropriate TTL to any endpoint missing it
- Commit: `git add -A && git commit -m "perf(eng-review-round-1): add Redis caching to slow endpoints"`

Round 2: Frontend data fetching patterns
- Audit frontend/app/*/page.tsx for inefficient fetch patterns (waterfall requests, missing parallel fetches)
- Replace sequential awaits with Promise.all() where data is independent
- Add proper error boundaries and loading states
- Commit: `git add -A && git commit -m "perf(eng-review-round-2): parallelize frontend data fetches"`

Round 3: IBKR connection resilience
- Read backend/app/services/ibkr/client.py
- Ensure connection pool has proper timeout, retry backoff, and circuit breaker
- Add connection health check that auto-reconnects on stale session
- Commit: `git add -A && git commit -m "fix(eng-review-round-3): IBKR connection resilience and auto-reconnect"`

Round 4: Redis cache strategy audit
- Read backend/app/core/cache.py (if exists) and all service files using Redis
- Standardize TTL values: real-time data 60s, computed data 300s, reference data 3600s
- Ensure cache key namespacing is consistent (no key collisions between services)
- Add cache invalidation on data refresh
- Commit: `git add -A && git commit -m "perf(eng-review-round-4): standardize Redis cache TTL and key strategy"`

Round 5: Database query optimization
- Read backend/app/services/ for any TimescaleDB queries
- Check for missing indexes, unoptimized time-series queries
- Add query result caching where appropriate
- Commit: `git add -A && git commit -m "perf(eng-review-round-5): optimize TimescaleDB queries and add indexes"`

Round 6: Frontend bundle size
- Read frontend/package.json, check for heavy dependencies
- Audit frontend/app/chain/page.tsx for large imports (Plotly especially — must be dynamic import)
- Add dynamic() imports for chart libraries to prevent SSR issues and reduce initial bundle
- Commit: `git add -A && git commit -m "perf(eng-review-round-6): add dynamic imports for chart libraries"`

Round 7: API error handling consistency
- Audit all backend routers for inconsistent error handling
- Standardize: 422 for validation errors, 503 for upstream failures (IBKR/yfinance down), 504 for timeouts
- Ensure all errors return consistent JSON shape: `{"error": str, "code": str, "retryable": bool}`
- Commit: `git add -A && git commit -m "fix(eng-review-round-7): standardize API error response format"`

Round 8: Frontend error handling
- Audit frontend components for missing try/catch on fetch calls
- Add global error boundary in layout.tsx
- Ensure API errors surface as user-visible messages (not silent failures)
- Commit: `git add -A && git commit -m "fix(eng-review-round-8): frontend error boundaries and user-visible API errors"`

Round 9: Docker Compose health and startup order
- Read docker-compose.yml and docker-compose.ibkr.yml
- Verify depends_on with condition: service_healthy for all services
- Add healthcheck to backend service if missing
- Ensure startup order: DB → Redis → Backend → Frontend → IBKR
- Commit: `git add -A && git commit -m "fix(eng-review-round-9): fix Docker Compose startup order and health checks"`

Round 10: Security and env var audit
- Check for any hardcoded secrets or API keys in source (grep for API_KEY=, SECRET=, PASSWORD= in .py .ts files)
- Verify all sensitive config reads from env vars
- Ensure .env.example has all required vars documented
- Add .env to .gitignore if not already there
- Commit: `git add -A && git commit -m "fix(eng-review-round-10): security audit — remove hardcoded secrets, verify env var coverage"`

## Rules
- Read relevant source files BEFORE editing
- Preserve all existing functionality — improvements only, no breaking changes
- After each round: `git pull --rebase origin main && git push origin main`
- Output exactly: COMPLETE

Working dir: /home/azureuser/projects/options-dashboard
