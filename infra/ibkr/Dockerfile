# Option-Helius IB Gateway wrapper
#
# This intentionally keeps the upstream IB Gateway runtime intact and injects
# safe defaults through Docker ENV so docker-compose.ibkr.yml can build a local,
# project-owned image without vendoring the full ib-gateway-docker tree.
#
# Upstream runtime: https://github.com/extrange/ibkr-docker
FROM ghcr.io/extrange/ibkr:stable

LABEL org.opencontainers.image.title="option-helius-ibgateway"
LABEL org.opencontainers.image.description="Option-Helius wrapper around IB Gateway Docker with compose-managed configuration defaults"
LABEL org.opencontainers.image.source="https://github.com/Jeremygarden/option-helius"

# Safe defaults. Real credentials must be supplied via .env / compose env.
ENV TRADING_MODE=PAPER \
    TWS_VERSION=1019 \
    IBC_VERSION=3.18.0 \
    TZ=America/New_York \
    VNC_PASSWORD=changeme123 \
    PAPER_PORT=4002 \
    LIVE_PORT=4001 \
    VNC_PORT=6080

EXPOSE 4001 4002 6080
