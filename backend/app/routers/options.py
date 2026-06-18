import logging
from datetime import date, datetime

from fastapi import APIRouter, Query, Request
from ..core.config import get_settings
from ..services.ibkr import ChainRequest, IBKRFallbackError, OptionChainFetcher, create_client_from_settings
from ..services.market_data import (
    async_get_options_chain,
    async_get_summary,
    async_get_gex,
    async_get_iv_surface,
    get_expirations,
    get_iv_rank_percentile,
    get_spot_price,
)

logger = logging.getLogger(__name__)

router = APIRouter()


async def _get_ibkr_client(request: Request):
    """Return a connected IBKR client when IBKR is enabled.

    Round 12 will install startup/shutdown lifecycle. Until then, this helper
    uses an already-created app.state.ibkr_client when present and otherwise
    creates a short-lived connection for the request. Any failure returns None
    so existing yfinance-backed endpoints remain the fallback path.
    """
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


async def _get_ibkr_chain_or_none(request: Request, ticker: str, expiry: str | None, strike_radius: int | None) -> dict | None:
    client, transient = await _get_ibkr_client(request)
    if client is None:
        return None

    settings = getattr(request.app.state, "settings", get_settings())
    try:
        fetcher = getattr(request.app.state, "ibkr_fetcher", None)
        if fetcher is None or getattr(fetcher, "_client", None) is not client:
            fetcher = OptionChainFetcher(client, settings=settings)
            if not transient:
                request.app.state.ibkr_fetcher = fetcher
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
    except Exception as exc:
        logger.exception("Unexpected IBKR chain fetch failure for %s/%s; falling back to yfinance", ticker, expiry)
        return None
    finally:
        if transient:
            try:
                await client.disconnect()
            except Exception:
                logger.debug("Failed to disconnect transient IBKR client", exc_info=True)


async def _get_ibkr_expirations_or_none(request: Request, ticker: str) -> list[str] | None:
    client, transient = await _get_ibkr_client(request)
    if client is None:
        return None

    settings = getattr(request.app.state, "settings", get_settings())
    try:
        fetcher = getattr(request.app.state, "ibkr_fetcher", None)
        if fetcher is None or getattr(fetcher, "_client", None) is not client:
            fetcher = OptionChainFetcher(client, settings=settings)
            if not transient:
                request.app.state.ibkr_fetcher = fetcher
        expirations = await fetcher.get_expirations(ticker.upper())
        return [exp if "-" in exp else f"{exp[:4]}-{exp[4:6]}-{exp[6:8]}" for exp in expirations]
    except Exception as exc:
        logger.warning("IBKR expirations fetch failed for %s; falling back to yfinance (%s)", ticker, exc)
        return None
    finally:
        if transient:
            try:
                await client.disconnect()
            except Exception:
                logger.debug("Failed to disconnect transient IBKR client", exc_info=True)


def _normalize_ibkr_expiry(expiry: str) -> str:
    expiry = str(expiry)
    return expiry if "-" in expiry else f"{expiry[:4]}-{expiry[4:6]}-{expiry[6:8]}"


async def _get_ibkr_iv_surface_or_none(request: Request, ticker: str) -> list[dict] | None:
    """Build an IV surface from IBKR multi-expiry option chains when available."""
    client, transient = await _get_ibkr_client(request)
    if client is None:
        return None

    settings = getattr(request.app.state, "settings", get_settings())
    try:
        fetcher = getattr(request.app.state, "ibkr_fetcher", None)
        if fetcher is None or getattr(fetcher, "_client", None) is not client:
            fetcher = OptionChainFetcher(client, settings=settings)
            if not transient:
                request.app.state.ibkr_fetcher = fetcher

        raw_expirations = await fetcher.get_expirations(ticker.upper())
        today = date.today()
        expirations: list[tuple[str, str, int]] = []
        for raw_expiry in raw_expirations:
            try:
                api_expiry = _normalize_ibkr_expiry(raw_expiry)
                dte = (datetime.strptime(api_expiry, "%Y-%m-%d").date() - today).days
                if dte >= 1:
                    expirations.append((raw_expiry, api_expiry, dte))
            except Exception:
                logger.debug("Skipping malformed IBKR expiry for %s: %s", ticker, raw_expiry, exc_info=True)

        points: list[dict] = []
        # Match the yfinance endpoint's expiry breadth while using the configured
        # ATM window to stay within IBKR ticker limits.
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
        if transient:
            try:
                await client.disconnect()
            except Exception:
                logger.debug("Failed to disconnect transient IBKR client", exc_info=True)


@router.get("/expirations/{ticker}")
async def list_expirations(request: Request, ticker: str):
    """List all available expiration dates for a ticker."""
    ibkr_expirations = await _get_ibkr_expirations_or_none(request, ticker)
    if ibkr_expirations:
        return {"ticker": ticker.upper(), "expirations": ibkr_expirations, "source": "ibkr"}
    return {"ticker": ticker.upper(), "expirations": get_expirations(ticker.upper())}


@router.get("/chain/{ticker}")
async def get_chain(
    request: Request,
    ticker: str,
    expiry: str = Query(None),
    strike_radius: int | None = Query(None, ge=0, le=50),
    atm_pct: float = Query(0.30, ge=0.05, le=1.0, description="ATM filter: include strikes within ±pct of spot (default 30%)"),
):
    """
    Full options chain (calls + puts) with Greeks, IV, OI.
    Includes IV Rank, IV Percentile, Max Pain.
    Filtered to ATM ± atm_pct (default ±30%) to reduce payload size.
    """
    ibkr_chain = await _get_ibkr_chain_or_none(request, ticker, expiry, strike_radius)
    chain_data = ibkr_chain if ibkr_chain else await async_get_options_chain(ticker.upper(), expiry, prefer_ibkr=False)

    # Filter options to ATM window to reduce payload
    spot = chain_data.get("spot", 0.0) or 0.0
    if spot > 0 and chain_data.get("options"):
        lo = spot * (1.0 - atm_pct)
        hi = spot * (1.0 + atm_pct)
        chain_data = {
            **chain_data,
            "options": [o for o in chain_data["options"] if lo <= (o.get("strike") or 0) <= hi],
        }
    return chain_data


@router.get("/summary/{ticker}")
async def get_options_summary(ticker: str):
    """
    Summary: spot, max pain, PCR, expected move, ATM IV, IV Rank, IV Percentile, GEX.
    """
    try:
        return await async_get_summary(ticker.upper())
    except Exception as exc:
        logger.exception("Summary fetch failed for %s", ticker)
        from ..core.errors import internal_error
        raise internal_error(f"Summary unavailable for {ticker.upper()}: {exc}")


@router.get("/gex/{ticker}")
async def get_gex_data(ticker: str, expiry: str = Query(None)):
    """Gamma Exposure by strike (in $M)."""
    try:
        return await async_get_gex(ticker.upper(), expiry)
    except Exception as exc:
        logger.exception("GEX fetch failed for %s/%s", ticker, expiry)
        return []  # Return empty list so frontend can render gracefully


@router.get("/iv-surface/{ticker}")
async def get_iv_surface_data(request: Request, ticker: str):
    """IV surface across all expirations (for 3D chart)."""
    ibkr_surface = await _get_ibkr_iv_surface_or_none(request, ticker)
    if ibkr_surface:
        return ibkr_surface
    return await async_get_iv_surface(ticker.upper())


@router.get("/iv-stats/{ticker}")
async def get_iv_stats(ticker: str):
    """
    IV Rank and IV Percentile for a ticker.
    Returns current IV vs 1-year historical range.
    """
    spot = get_spot_price(ticker.upper())
    summary = await async_get_summary(ticker.upper())
    current_iv = summary.get("atm_iv", 0.3)
    stats = get_iv_rank_percentile(ticker.upper(), current_iv)
    return {
        "ticker": ticker.upper(),
        "spot": round(spot, 2),
        "current_iv": current_iv,
        **stats,
    }


@router.get("/spot/{ticker}")
async def get_spot(ticker: str):
    """Get current spot price."""
    price = get_spot_price(ticker.upper())
    return {"ticker": ticker.upper(), "spot": round(price, 2)}
