# Engineering Review Report V2 — option-helius

_Date: 2026-06-19_

## Scope

This report closes the 9-round engineering review focused on deeper backend architecture, backend/database performance, Docker deployment readiness, observability, integration tests, and smoke validation for the Option Helius trading terminal.

Stack reviewed:

- Frontend: Next.js 14 + TypeScript + Tailwind
- Backend: FastAPI + async service layer
- Data/cache: Redis + optional TimescaleDB
- Broker integration: optional IBKR Gateway sidecar and yfinance/AlphaVantage fallback paths
- Deployment: Docker Compose with backend, frontend, Redis, TimescaleDB, and optional IBKR Gateway

## Architecture Decisions

### 1. Router/service separation

Routers were kept thin and focused on HTTP concerns:

- Request/path/query validation
- Dependency wiring
- HTTP response shape selection

Business logic was moved or consolidated into service modules, especially around:

- Options endpoint orchestration (`backend/app/services/options_service.py`)
- Picks payload generation/cache fallback (`backend/app/services/picks_service.py`)
- Macro indicator aggregation (`backend/app/services/macro_service.py`)
- Optional provider lifecycle and fallback paths

This makes the core paths easier to test directly without requiring a live ASGI server or external providers.

### 2. Optional-provider first design

IBKR, Redis, and TimescaleDB remain additive rather than hard runtime requirements. The backend starts and serves useful fallback data when any optional provider is unavailable:

- `IBKR_ENABLED=false` keeps yfinance-backed routes active.
- Redis failures degrade to cache misses.
- TimescaleDB startup failures are captured on `app.state.db_startup_error` while Redis/upstream paths remain available.

This is important for development, CI, and partial production outages.

### 3. Explicit FastAPI lifespan management

Startup/shutdown moved to a clear lifespan path with deterministic ordering:

1. Redis initialization
2. TimescaleDB pool/schema initialization
3. IBKR startup connection
4. Macro scheduler start

Shutdown happens in reverse order:

1. Scheduler shutdown
2. IBKR disconnect
3. DB pool close
4. Redis close

This avoids orphaned provider connections and makes lifecycle behavior directly testable.

### 4. Observability built into core infrastructure

Structured logging now lives in a reusable core module and is enabled during app import/startup:

- JSON logs by default for container environments
- `LOG_LEVEL` support
- `JSON_LOGS=false` for local text logs
- Request ID context propagation via `X-Request-ID`
- Request completion/failure logs
- Slow database query logging threshold via `DB_SLOW_QUERY_MS` (default 500ms)

## Performance Improvements

### Database and TimescaleDB

Database access was centralized in `backend/app/core/db.py` with bounded settings:

- Configurable pool sizing (`DB_POOL_MIN_SIZE`, `DB_POOL_MAX_SIZE`)
- Bounded command timeout (`DB_COMMAND_TIMEOUT_SECONDS`)
- Postgres statement timeout (`DB_STATEMENT_TIMEOUT_MS`)
- Idle transaction timeout (`DB_IDLE_TX_TIMEOUT_MS`)
- Inactive connection lifetime
- Slow query warning logs for fetch/fetchrow/execute/COPY helpers

TimescaleDB schema/index review added query-friendly tables/indexes for future persistent hot paths:

- `macro_indicator_history` hypertable with indicator/time and source/time indexes
- `options_chain_snapshots` hypertable with ticker/expiry/time, ticker/time, and JSONB GIN index
- `composite_score_history` hypertable with descending timestamp index
- `api_query_performance` table/index for query performance telemetry
- Continuous daily macro rollup view/index

### API and backend paths

- Redis cache lifecycle is explicit and optional.
- Picks responses use cache hit/miss behavior with deterministic fallback.
- Options chain paths prefer IBKR only when enabled/available, then fall back to yfinance.
- Chain responses are filtered to ATM windows to reduce payload size.
- Rate limiting and request body limits protect expensive endpoints from accidental overload.

### Frontend/build/deployment

Docker build optimization rounds added/verified:

- Backend/frontend `.dockerignore` coverage
- Layer-cache-friendly Dockerfiles
- Multi-stage-style frontend production runtime
- Reduced copied build context and ignored dev artifacts

## Test Coverage

### Backend unit + integration coverage

The backend suite now covers:

- Input validation and request limits
- Redis lifecycle success/failure
- DB pool settings, query-friendly schema, slow query logging
- App lifespan startup/shutdown order
- IBKR config, client, fetcher, schemas, mock server, and router fallback paths
- Health endpoint behavior
- Core page integration paths for:
  - Chain page endpoints end-to-end with `IBKR_ENABLED=false` fallback
  - Picks page cache miss + cache hit
  - Macro page indicators + cached composite score
  - DB-down startup degradation
  - Bad ticker input returning 422-style API errors

### Smoke validation run

Commands run during Round 9:

```bash
cd /home/azureuser/projects/options-dashboard/backend && (python -m pytest tests/ -v 2>&1 || venv/bin/python -m pytest tests/ -v 2>&1) | tail -20
```

Result:

- `55 passed in 1.28s`

```bash
cd /home/azureuser/projects/options-dashboard/frontend && npx tsc --noEmit 2>&1 | head -20
```

Result:

- Passed with no TypeScript output/errors.

```bash
cd /home/azureuser/projects/options-dashboard && docker compose config --quiet 2>&1
```

Result:

- Passed with no Docker Compose validation output/errors.

Note: the system shell does not provide `python`; the backend virtualenv runner `backend/venv/bin/python` was used as the working Python executable.

## Deployment Notes

### Base deployment

Default Compose stack:

```bash
docker compose up -d --build
```

Services:

- `backend` bound to `127.0.0.1:8000`
- `frontend` bound to `127.0.0.1:3000`
- `redis` bound to `127.0.0.1:6379`
- `timescaledb` bound to `127.0.0.1:5432`

Production-readiness settings include:

- `restart: unless-stopped`
- `init: true`
- Healthchecks for backend, Redis, and TimescaleDB
- Bounded memory/CPU/pids settings
- Persistent volumes for Redis and TimescaleDB
- Shared bridge network
- JSON-file logging with rotation

### Optional IBKR deployment

IBKR sidecar deployment:

```bash
docker compose -f docker-compose.yml -f docker-compose.ibkr.yml up -d --build
```

The IBKR override enables:

- `IBKR_ENABLED=true`
- Backend dependency on `ibgateway` health
- `ibgateway` service with persisted settings/IBC volumes
- Local-only port bindings for Gateway/VNC

Required secrets/settings should be supplied through environment variables or deployment secret management:

- `IBKR_USERNAME`
- `IBKR_PASSWORD`
- `VNC_PASSWORD`
- `POSTGRES_PASSWORD`
- Optional API keys: `FLASHALPHA_API_KEY`, `ALPHAVANTAGE_API_KEY`, `FRED_API_KEY`

### Operational recommendations

- Keep `IBKR_READONLY=true` unless write/trading workflows are explicitly implemented and reviewed.
- Use non-default `POSTGRES_PASSWORD` and `VNC_PASSWORD` outside local development.
- Monitor JSON logs for `event=slow_query`, `http_request_failed`, provider startup warnings, and IBKR reconnect warnings.
- Tune `DB_POOL_MAX_SIZE`, `DB_STATEMENT_TIMEOUT_MS`, and `DB_SLOW_QUERY_MS` after observing real production load.
- Add Redis-backed distributed rate limiting before multi-replica backend deployment; the current limiter is process-local by design.

## Final Status

Round 9 smoke validation passed:

- Backend tests: passed
- Frontend TypeScript check: passed
- Docker Compose config validation: passed

The engineering review V2 is complete through all 9 planned rounds.
