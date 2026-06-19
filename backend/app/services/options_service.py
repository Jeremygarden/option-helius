"""Options endpoint service orchestration.

Keeps IBKR fallback, payload filtering, and IV surface assembly out of FastAPI
routers so HTTP handlers remain thin and service logic is testable directly.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

from fastapi import Request

from ..core.config import get_settings
from ..services.ibkr import ChainRequest, IBKRFallbackError, OptionChainFetcher, create_client_from_settings
from ..services.market_data import (
    async_get_gex,
    async_get_iv_surface,
    async_get_options_chain,
    async_get_summary,
    get_expirations,
    get_iv_rank_percentile,
    get_spot_price,
)

logger = logging.getLogger(__name__)


async def _get_ibkr_client(request: Request):
    """Return a connected IBKR client when IBKR is enabled."""

    settings = getattr(request.app.state, "settings", get_settings())
    if not settings.ibkr_enabled:
        return None, False

    client = getattr(request.app.state, "ibkr_client", None)
    if client is not None and client.is_connected:
        return client, False

    try:
        client = create_client_from_settings(settings)
        await client.connect()
        return client, True
    except Exception as exc:
        logger.warning("IBKR provider unavailable; falling back to yfinance (%s)", exc)
        return None, False


def _get_fetcher(request: Request, client: Any, transient: bool) -> OptionChainFetcher:
    settings = getattr(request.app.state, "settings", get_settings())
    fetcher = getattr(request.app.state, "ibkr_fetcher", None)
    if fetcher is None or getattr(fetcher, "_client", None) is not client:
        fetcher = OptionChainFetcher(client, settings=settings)
        if not transient:
            request.app.state.ibkr_fetcher = fetcher
    return fetcher


async def _disconnect_transient(client: Any, transient: bool) -> None:
    if not transient:
        return
    try:
        await client.disconnect()
    except Exception:
        logger.debug("Failed to disconnect transient IBKR client", exc_info=True)


async def get_ibkr_chain_or_none(request: Request, ticker: str, expiry: str | None, strike_radius: int | None) -> dict | None:
    client, transient = await _get_ibkr_client(request)
    if client is None:
        return None

    settings = getattr(request.app.state, "settings", get_settings())
    try:
        fetcher = _get_fetcher(request, client, transient)
        return await fetcher.fetch_option_chain(
            ChainRequest(
                symbol=ticker.upper(),
                expiration=expiry,
                strike_radius=strike_radius if strike_radius is not None else settings.atm_strike_radius,
            )
        )
    except (IBKRFallbackError, ConnectionError, RuntimeError) as exc:
        logger.warning("IBKR chain fetch failed for %s/%s; falling back to yfinance (%s)", ticker, expiry, exc)
        return None
    except Exception:
        logger.exception("Unexpected IBKR chain fetch failure for %s/%s; falling back to yfinance", ticker, expiry)
        return None
    finally:
        await _disconnect_transient(client, transient)


def normalize_ibkr_expiry(expiry: str) -> str:
    expiry = str(expiry)
    return expiry if "-" in expiry else f"{expiry[:4]}-{expiry[4:6]}-{expiry[6:8]}"


async def get_ibkr_expirations_or_none(request: Request, ticker: str) -> list[str] | None:
    client, transient = await _get_ibkr_client(request)
    if client is None:
        return None

    try:
        fetcher = _get_fetcher(request, client, transient)
        expirations = await fetcher.get_expirations(ticker.upper())
        return [normalize_ibkr_expiry(exp) for exp in expirations]
    except Exception as exc:
        logger.warning("IBKR expirations fetch failed for %s; falling back to yfinance (%s)", ticker, exc)
        return None
    finally:
        await _disconnect_transient(client, transient)


async def get_ibkr_iv_surface_or_none(request: Request, ticker: str) -> list[dict] | None:
    """Build an IV surface from IBKR multi-expiry option chains when available."""

    client, transient = await _get_ibkr_client(request)
    if client is None:
        return None

    settings = getattr(request.app.state, "settings", get_settings())
    try:
        fetcher = _get_fetcher(request, client, transient)
        raw_expirations = await fetcher.get_expirations(ticker.upper())
        today = date.today()
        expirations: list[tuple[str, str, int]] = []
        for raw_expiry in raw_expirations:
            try:
                api_expiry = normalize_ibkr_expiry(raw_expiry)
                dte = (datetime.strptime(api_expiry, "%Y-%m-%d").date() - today).days
                if dte >= 1:
                    expirations.append((raw_expiry, api_expiry, dte))
            except Exception:
                logger.debug("Skipping malformed IBKR expiry for %s: %s", ticker, raw_expiry, exc_info=True)

        points: list[dict] = []
        for _raw_expiry, api_expiry, dte in expirations[:8]:
            chain = await fetcher.fetch_option_chain(
                ChainRequest(
                    symbol=ticker.upper(),
                    expiration=api_expiry,
                    strike_radius=settings.atm_strike_radius,
                    wait_seconds=0.5,
                )
            )
            for option in chain.get("options", []):
                iv = float(option.get("iv") or 0.0)
                if iv > 0.01:
                    points.append(
                        {
                            "strike": float(option.get("strike") or 0.0),
                            "dte": dte,
                            "iv": round(iv, 4),
                            "type": option.get("type"),
                            "source": "ibkr",
                        }
                    )

        return points or None
    except (IBKRFallbackError, ConnectionError, RuntimeError) as exc:
        logger.warning("IBKR IV surface fetch failed for %s; falling back to yfinance (%s)", ticker, exc)
        return None
    except Exception:
        logger.exception("Unexpected IBKR IV surface failure for %s; falling back to yfinance", ticker)
        return None
    finally:
        await _disconnect_transient(client, transient)


def filter_chain_to_atm_window(chain_data: dict[str, Any], atm_pct: float) -> dict[str, Any]:
    spot = chain_data.get("spot", 0.0) or 0.0
    if spot > 0 and chain_data.get("options"):
        lo = spot * (1.0 - atm_pct)
        hi = spot * (1.0 + atm_pct)
        return {**chain_data, "options": [o for o in chain_data["options"] if lo <= (o.get("strike") or 0) <= hi]}
    return chain_data


async def list_expiration_dates(request: Request, ticker: str) -> dict[str, Any]:
    ibkr_expirations = await get_ibkr_expirations_or_none(request, ticker)
    if ibkr_expirations:
        return {"ticker": ticker.upper(), "expirations": ibkr_expirations, "source": "ibkr"}
    return {"ticker": ticker.upper(), "expirations": get_expirations(ticker.upper())}


async def get_chain_data(request: Request, ticker: str, expiry: str | None, strike_radius: int | None, atm_pct: float) -> dict[str, Any]:
    ibkr_chain = await get_ibkr_chain_or_none(request, ticker, expiry, strike_radius)
    chain_data = ibkr_chain if ibkr_chain else await async_get_options_chain(ticker.upper(), expiry, prefer_ibkr=False)
    return filter_chain_to_atm_window(chain_data, atm_pct)


async def get_options_summary_data(ticker: str) -> dict[str, Any]:
    return await async_get_summary(ticker.upper())


async def get_gex_data_result(ticker: str, expiry: str | None) -> list[dict[str, Any]]:
    return await async_get_gex(ticker.upper(), expiry)


async def get_iv_surface_data_result(request: Request, ticker: str) -> list[dict[str, Any]]:
    ibkr_surface = await get_ibkr_iv_surface_or_none(request, ticker)
    if ibkr_surface:
        return ibkr_surface
    return await async_get_iv_surface(ticker.upper())


async def get_iv_stats_data(ticker: str) -> dict[str, Any]:
    normalized = ticker.upper()
    spot = get_spot_price(normalized)
    summary = await async_get_summary(normalized)
    current_iv = summary.get("atm_iv", 0.3)
    stats = get_iv_rank_percentile(normalized, current_iv)
    return {"ticker": normalized, "spot": round(spot, 2), "current_iv": current_iv, **stats}


def get_spot_data(ticker: str) -> dict[str, Any]:
    normalized = ticker.upper()
    price = get_spot_price(normalized)
    return {"ticker": normalized, "spot": round(price, 2)}
