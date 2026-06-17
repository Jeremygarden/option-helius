"""Health endpoints for optional providers."""

from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Request

from ..core.config import get_settings
from ..services.ibkr import IBKRDependencyError, create_client_from_settings

logger = logging.getLogger(__name__)

router = APIRouter()


def _health_to_dict(health: Any) -> dict[str, Any]:
    if hasattr(health, "dict"):
        return health.dict()
    if isinstance(health, dict):
        return dict(health)
    return {
        "connected": bool(getattr(health, "connected", False)),
        "host": getattr(health, "host", None),
        "port": getattr(health, "port", None),
        "client_id": getattr(health, "client_id", None),
        "server_version": getattr(health, "server_version", None),
        "account": getattr(health, "account", None),
        "uptime_seconds": getattr(health, "uptime_seconds", None),
        "reconnect_count": getattr(health, "reconnect_count", 0),
        "subscription_count": getattr(health, "subscription_count", 0),
        "state": getattr(health, "state", "unknown"),
        "timestamp": getattr(health, "timestamp", time.time()),
    }


async def _get_account_info(client: Any) -> dict[str, Any]:
    try:
        values = await client.get_account_values()
        return dict(values or {})
    except Exception as exc:
        logger.debug("IBKR account info unavailable during health check: %s", exc)
        return {}


@router.get("/health/ibkr")
async def get_ibkr_health(request: Request) -> dict[str, Any]:
    """Return IBKR connection status without breaking fallback-only deployments.

    IBKR is optional for option-helius. The endpoint therefore never raises for
    missing dependencies, disabled config, Gateway downtime, or entitlement
    issues; instead it reports a degraded/disconnected status while existing
    yfinance-backed routes continue working.
    """

    settings = getattr(request.app.state, "settings", get_settings())
    base: dict[str, Any] = {
        "provider": "ibkr",
        "enabled": settings.ibkr_enabled,
        "host": settings.ibkr_host,
        "port": settings.ibkr_port,
        "client_id": settings.ibkr_client_id,
        "account_type": settings.ibkr_account_type,
        "connected": False,
        "status": "disabled" if not settings.ibkr_enabled else "disconnected",
        "account_info": {},
        "subscription_count": 0,
        "timestamp": time.time(),
    }

    if not settings.ibkr_enabled:
        return base

    client = getattr(request.app.state, "ibkr_client", None)
    transient = False
    if client is None:
        try:
            client = create_client_from_settings(settings)
            await client.connect()
            transient = True
        except IBKRDependencyError as exc:
            return {**base, "status": "dependency_missing", "error": str(exc)}
        except Exception as exc:
            logger.warning("IBKR health check connection failed: %s", exc)
            return {**base, "status": "unavailable", "error": str(exc)}

    try:
        health = _health_to_dict(await client.health_check())
        account_info = await _get_account_info(client) if health.get("connected") else {}
        return {
            **base,
            **health,
            "enabled": True,
            "provider": "ibkr",
            "account_type": settings.ibkr_account_type,
            "status": "ok" if health.get("connected") else "disconnected",
            "account_info": account_info,
            "subscription_count": int(health.get("subscription_count") or 0),
        }
    except Exception as exc:
        logger.warning("IBKR health check failed: %s", exc)
        return {**base, "status": "error", "error": str(exc)}
    finally:
        if transient:
            try:
                await client.disconnect()
            except Exception:
                logger.debug("Failed to disconnect transient IBKR health client", exc_info=True)
