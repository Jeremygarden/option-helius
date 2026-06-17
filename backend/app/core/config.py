"""Application configuration helpers.

IBKR integration is optional. These settings intentionally use safe defaults
and validation is warning-only so the existing yfinance-backed application can
start normally when IB Gateway is not running.
"""

from __future__ import annotations

import asyncio
import logging
import os
import socket
from dataclasses import dataclass
from functools import lru_cache

logger = logging.getLogger(__name__)


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning("Invalid %s=%r; using default %s", name, value, default)
        return default


@dataclass(frozen=True)
class Settings:
    """Runtime settings loaded from environment variables."""

    # IBKR backend provider config
    ibkr_enabled: bool = False
    ibkr_host: str = "localhost"
    ibkr_port: int = 4002
    ibkr_client_id: int = 1
    ibkr_account_type: str = "paper"

    # Safety limits used by future IBKR fetcher/provider layers
    max_tickers: int = 100
    atm_strike_radius: int = 8


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings with safe IBKR defaults."""

    account_type = os.getenv("IBKR_ACCOUNT_TYPE", "paper").strip().lower() or "paper"
    if account_type not in {"paper", "live"}:
        logger.warning("Invalid IBKR_ACCOUNT_TYPE=%r; using 'paper'", account_type)
        account_type = "paper"

    return Settings(
        ibkr_enabled=_env_bool("IBKR_ENABLED", False),
        ibkr_host=os.getenv("IBKR_HOST", "localhost").strip() or "localhost",
        ibkr_port=_env_int("IBKR_PORT", 4002),
        ibkr_client_id=_env_int("IBKR_CLIENT_ID", 1),
        ibkr_account_type=account_type,
        max_tickers=_env_int("MAX_TICKERS", 100),
        atm_strike_radius=_env_int("ATM_STRIKE_RADIUS", 8),
    )


def _can_connect(host: str, port: int, timeout: float) -> bool:
    with socket.create_connection((host, port), timeout=timeout):
        return True


async def validate_ibkr_startup(settings: Settings | None = None, timeout: float = 1.5) -> bool:
    """Validate IBKR connectivity at startup.

    Returns True only when IBKR is enabled and the configured socket is reachable.
    Never raises on connection failure; logs a warning so yfinance fallback paths
    can continue serving existing endpoints.
    """

    settings = settings or get_settings()

    if not settings.ibkr_enabled:
        logger.info("IBKR provider disabled (IBKR_ENABLED=false)")
        return False

    if settings.ibkr_port <= 0 or settings.ibkr_port > 65535:
        logger.warning(
            "IBKR_ENABLED=true but IBKR_PORT=%s is invalid; expected 1-65535",
            settings.ibkr_port,
        )
        return False

    try:
        await asyncio.to_thread(_can_connect, settings.ibkr_host, settings.ibkr_port, timeout)
    except OSError as exc:
        logger.warning(
            "IBKR_ENABLED=true but Gateway is unreachable at %s:%s (%s). "
            "Backend will rely on fallback data sources until IBKR is available.",
            settings.ibkr_host,
            settings.ibkr_port,
            exc,
        )
        return False

    logger.info(
        "IBKR Gateway reachable at %s:%s (clientId=%s, account=%s)",
        settings.ibkr_host,
        settings.ibkr_port,
        settings.ibkr_client_id,
        settings.ibkr_account_type,
    )
    return True
