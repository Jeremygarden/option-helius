#!/usr/bin/env bash
# Start Option Helius with the optional IBKR Gateway sidecar.
#
# Usage:
#   ./scripts/start_ibkr.sh
#   TRADING_MODE=LIVE IBKR_PORT=4001 ./scripts/start_ibkr.sh
#   NO_OPEN=1 ./scripts/start_ibkr.sh --build
#
# Extra arguments are forwarded to `docker compose up -d`.

set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'HELP'
Start Option Helius with the optional IBKR Gateway sidecar.

Usage:
  ./scripts/start_ibkr.sh
  TRADING_MODE=LIVE IBKR_PORT=4001 ./scripts/start_ibkr.sh
  NO_OPEN=1 ./scripts/start_ibkr.sh --build

Extra arguments are forwarded to `docker compose up -d`.
HELP
  exit 0
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env" ]]; then
  cat >&2 <<'MSG'
[ibkr] .env not found.
[ibkr] Copy .env.example to .env and fill IBKR_USERNAME / IBKR_PASSWORD before first login:
[ibkr]   cp .env.example .env
MSG
fi

export IBKR_ENABLED="${IBKR_ENABLED:-true}"
export IBKR_HOST="${IBKR_HOST:-ibgateway}"
export IBKR_CLIENT_ID="${IBKR_CLIENT_ID:-1}"
export TRADING_MODE="${TRADING_MODE:-PAPER}"
export PAPER_PORT="${PAPER_PORT:-4002}"
export LIVE_PORT="${LIVE_PORT:-4001}"
export VNC_PORT="${VNC_PORT:-6080}"

case "${TRADING_MODE^^}" in
  LIVE)
    export IBKR_ACCOUNT_TYPE="${IBKR_ACCOUNT_TYPE:-live}"
    export IBKR_PORT="${IBKR_PORT:-4001}"
    ;;
  PAPER|*)
    export IBKR_ACCOUNT_TYPE="${IBKR_ACCOUNT_TYPE:-paper}"
    export IBKR_PORT="${IBKR_PORT:-4002}"
    ;;
esac

COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.ibkr.yml)
VNC_URL="http://localhost:${VNC_PORT}"
API_URL="http://localhost:${IBKR_PORT}"

echo "[ibkr] Starting Option Helius with IB Gateway sidecar"
echo "[ibkr] Trading mode: ${TRADING_MODE^^}"
echo "[ibkr] Backend IBKR target: ${IBKR_HOST}:${IBKR_PORT} (clientId=${IBKR_CLIENT_ID})"
echo "[ibkr] noVNC URL: ${VNC_URL}"

docker compose "${COMPOSE_FILES[@]}" up -d "$@"

echo "[ibkr] Containers started. Check status with:"
echo "[ibkr]   docker compose ${COMPOSE_FILES[*]} ps"
echo "[ibkr] Follow gateway logs with:"
echo "[ibkr]   docker compose ${COMPOSE_FILES[*]} logs -f ibgateway"
echo "[ibkr] Complete IBKR 2FA in noVNC: ${VNC_URL}"

if [[ "${NO_OPEN:-0}" != "1" ]]; then
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$VNC_URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$VNC_URL" >/dev/null 2>&1 || true
  fi
fi

cat <<MSG
[ibkr] Reminder:
[ibkr] - Paper API port: http://localhost:${PAPER_PORT} (TCP API, not HTTP)
[ibkr] - Active IB API target for backend: ${API_URL} (TCP API, not HTTP)
[ibkr] - Gateway can take 60-90 seconds before the API socket is healthy.
MSG
