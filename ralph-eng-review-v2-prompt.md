# option-helius /gstack /plan-eng-review — Round 2 (9 Rounds)
# Focus: Architecture + Backend Performance + Docker + Integration/Smoke Tests

## Context
This is an options trading terminal (Next.js 14 + FastAPI + TimescaleDB + Redis + IBKR).
Previous eng-review completed (10 rounds): Redis caching, parallel fetches, IBKR reconnect, DB indexes, Docker healthchecks, security audit.
This round goes deeper: service architecture, backend performance profiling, Docker deployment optimization, and full integration + smoke testing.

## THIS Round's Focus
Check `git log --oneline -60` first to see what eng-v2-round-* commits exist.
Pick the NEXT incomplete round from the list below.

## Engineering Areas (9 Rounds)

### Round 1: Backend service architecture audit
- Read all files in backend/app/ (routers/, services/, core/, models/)
- Audit: separation of concerns, circular imports, service layer abstraction, dependency injection patterns
- Fix: extract business logic from routers into service layer where missing, remove circular dependencies
- Commit: `git add -A && git commit -m "refactor(eng-v2-round-1): backend service layer architecture cleanup"`

### Round 2: Database query performance profiling
- Read backend/app/services/db_schema.py and all DB query code in services/
- Audit: missing indexes, full table scans, missing query timeouts, connection pool settings
- Add: query timeout parameters, ensure connection pool is sized appropriately for TimescaleDB
- Fix all identified query performance issues
- Commit: `git add -A && git commit -m "perf(eng-v2-round-2): database query optimization and connection pool tuning"`

### Round 3: FastAPI startup and dependency injection
- Read backend/app/main.py and backend/app/core/
- Audit: startup/shutdown event handlers, dependency injection correctness, lifespan management
- Fix: ensure DB pool and Redis are properly initialized on startup and closed on shutdown
- Commit: `git add -A && git commit -m "fix(eng-v2-round-3): FastAPI lifespan and dependency injection correctness"`

### Round 4: Docker build optimization
- Read Dockerfile(s) in backend/ and frontend/
- Audit: layer caching efficiency, multi-stage build usage, image size, build time
- Fix: add .dockerignore, optimize layer order, use multi-stage builds where missing
- Commit: `git add -A && git commit -m "perf(eng-v2-round-4): Docker build optimization and image size reduction"`

### Round 5: Docker Compose production readiness
- Read docker-compose.yml and docker-compose.ibkr.yml
- Audit: resource limits (memory/cpu), restart policies, volume mounts, network isolation, secrets handling
- Fix: add resource limits, ensure restart: unless-stopped on all services, review volume persistence
- Commit: `git add -A && git commit -m "fix(eng-v2-round-5): Docker Compose production readiness improvements"`

### Round 6: Backend API rate limiting and request validation
- Read all backend routers
- Add: rate limiting middleware (use slowapi or similar), request body size limits, input validation
- Ensure all endpoints validate input types and ranges, return 422 with clear error on bad input
- Commit: `git add -A && git commit -m "fix(eng-v2-round-6): API rate limiting and input validation"`

### Round 7: Logging and observability
- Read backend/app/main.py and all service files
- Audit: structured logging coverage, request/response logging, error logging with stack traces
- Add: structured JSON logging format, request ID propagation, slow query logging (> 500ms)
- Commit: `git add -A && git commit -m "fix(eng-v2-round-7): structured logging and observability improvements"`

### Round 8: Full backend integration test suite
- Read backend/tests/ directory
- Add integration tests covering: all 3 page data endpoints end-to-end, IBKR_ENABLED=false fallback path, Redis cache hit/miss, error scenarios (DB down, bad input)
- Run: `cd /home/azureuser/projects/options-dashboard/backend && python -m pytest tests/ -v --tb=short 2>&1 | tail -40`
- Fix all failures
- Commit: `git add -A && git commit -m "test(eng-v2-round-8): integration test suite for all core paths"`

### Round 9: Smoke test and deployment validation
- Run complete test suite: `cd /home/azureuser/projects/options-dashboard/backend && python -m pytest tests/ -v 2>&1 | tail -20`
- Run TypeScript check: `cd /home/azureuser/projects/options-dashboard/frontend && npx tsc --noEmit 2>&1 | head -20`
- Validate docker-compose config: `docker compose config --quiet 2>&1`
- Fix all remaining failures
- Write final engineering report to /home/azureuser/projects/options-dashboard/ENG_REVIEW_REPORT_V2.md covering: architecture decisions, performance improvements, test coverage, deployment notes
- Commit: `git add -A && git commit -m "docs(eng-v2-round-9): smoke test pass + engineering report v2"`

## Rules
- Read relevant source files BEFORE editing
- Fix root causes, not symptoms
- After EVERY round: `git pull --rebase origin main && git push origin main`
- Output exactly: COMPLETE

Working dir: /home/azureuser/projects/options-dashboard
