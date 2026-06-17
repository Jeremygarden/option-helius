# IBKR Setup Guide for Option Helius

This guide explains how to run Interactive Brokers Gateway as an optional sidecar for Option Helius.
The backend talks to the gateway directly over the IB API TCP port using `ib-async`.

## What this adds

- `docker-compose.ibkr.yml` starts the `ibgateway` sidecar only when explicitly requested.
- `infra/ibkr/Dockerfile` wraps the upstream IB Gateway Docker image with project defaults.
- `.env.example` contains safe IBKR defaults and placeholders for credentials.

Default stack without IBKR remains unchanged:

```bash
docker compose up -d
```

IBKR-enabled stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.ibkr.yml up -d
```

## 1. Prepare environment variables

Copy the template and edit local values:

```bash
cp .env.example .env
$EDITOR .env
```

Minimum IBKR fields:

```dotenv
IBKR_ENABLED=true
IBKR_HOST=ibgateway
IBKR_PORT=4002
IBKR_CLIENT_ID=1
IBKR_ACCOUNT_TYPE=paper

IBKR_USERNAME=your_ibkr_username
IBKR_PASSWORD=your_ibkr_password
TRADING_MODE=PAPER
VNC_PASSWORD=change_this_password
```

Do not commit `.env`; it contains credentials.

## 2. Paper vs live mode

### Paper trading (recommended first)

Paper trading uses port `4002`:

```dotenv
TRADING_MODE=PAPER
IBKR_ACCOUNT_TYPE=paper
IBKR_PORT=4002
PAPER_PORT=4002
```

Start:

```bash
docker compose -f docker-compose.yml -f docker-compose.ibkr.yml up -d --build
```

### Live trading

Live trading uses port `4001` and connects to a real-money account. Use only after paper mode works.

```dotenv
TRADING_MODE=LIVE
IBKR_ACCOUNT_TYPE=live
IBKR_PORT=4001
LIVE_PORT=4001
```

When live mode is enabled, change the published port in `docker-compose.ibkr.yml` or use the later profile/override wiring before deployment.

## 3. Complete 2FA through noVNC

IB Gateway normally requires manual 2FA.

1. Start the IBKR sidecar.
2. Wait 30-90 seconds for Gateway startup.
3. Open noVNC:

   ```text
   http://localhost:6080
   ```

4. Use the `VNC_PASSWORD` from `.env`.
5. Complete the IBKR login and mobile/SMS/security-device challenge.
6. Leave the gateway logged in. The backend can connect only after the API socket is available.

Useful logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.ibkr.yml logs -f ibgateway
```

## 4. Verify containers and ports

```bash
docker compose -f docker-compose.yml -f docker-compose.ibkr.yml ps
```

Expected exposed ports:

| Purpose | Default |
| --- | --- |
| Backend API | `localhost:8000` |
| Frontend | `localhost:3000` |
| IBKR Paper API | `localhost:4002` |
| IBKR Live API | `localhost:4001` when enabled |
| noVNC | `localhost:6080` |

Quick TCP check from the host:

```bash
python - <<'PY'
import socket
for port in (4002, 6080):
    s = socket.socket()
    s.settimeout(3)
    try:
        s.connect(("127.0.0.1", port))
        print(f"port {port}: open")
    except OSError as exc:
        print(f"port {port}: not ready ({exc})")
    finally:
        s.close()
PY
```

## 5. Cloud deployment and port forwarding

Do not expose IBKR API or noVNC publicly.

For a cloud VM, prefer SSH tunnels:

```bash
ssh -L 6080:localhost:6080 -L 4002:localhost:4002 user@your-vm
```

Then open:

```text
http://localhost:6080
```

Security notes:

- Keep `VNC_PASSWORD` strong.
- Restrict firewall ingress for ports `4001`, `4002`, and `6080`.
- Use paper trading until OPRA/options market data and 2FA behavior are validated.

## 6. Market data caveats

- Paper accounts often require matching live-account market data subscriptions.
- OPRA options data is required for useful option quotes and model Greeks.
- IBKR has ticker subscription limits; the backend fetcher should keep an ATM strike window (`ATM_STRIKE_RADIUS`, default `8`) to stay under the 100 ticker limit.
- Gateway maintenance can disconnect sessions daily; reconnect logic lives in the backend provider layer.

## 7. Stop or reset

Stop IBKR-enabled stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.ibkr.yml down
```

Remove persisted IB Gateway settings only if you need a clean login state:

```bash
docker volume rm options-dashboard_ibgateway-settings options-dashboard_ibgateway-ibc
```

