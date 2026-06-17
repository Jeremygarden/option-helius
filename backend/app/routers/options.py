import logging

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


@router.get("/expirations/{ticker}")
async def list_expirations(request: Request, ticker: str):
    """List all available expiration dates for a ticker."""
    ibkr_expirations = await _get_ibkr_expirations_or_none(request, ticker)
    if ibkr_expirations:
        return {"ticker": ticker.upper(), "expirations": ibkr_expirations, "source": "ibkr"}
    return {"ticker": ticker.upper(), "expirations": get_expirations(ticker.upper())}


@router.get("/chain/{ticker}")
async def get_chain(request: Request, ticker: str, expiry: str = Query(None), strike_radius: int | None = Query(None, ge=0, le=50)):
    """
    Full options chain (calls + puts) with Greeks, IV, OI.
    Includes IV Rank, IV Percentile, Max Pain.
    """
    ibkr_chain = await _get_ibkr_chain_or_none(request, ticker, expiry, strike_radius)
    if ibkr_chain:
        return ibkr_chain
    return await async_get_options_chain(ticker.upper(), expiry)


@router.get("/summary/{ticker}")
async def get_options_summary(ticker: str):
    """
    Summary: spot, max pain, PCR, expected move, ATM IV, IV Rank, IV Percentile, GEX.
    """
    return await async_get_summary(ticker.upper())


@router.get("/gex/{ticker}")
async def get_gex_data(ticker: str, expiry: str = Query(None)):
    """Gamma Exposure by strike (in $M)."""
    return await async_get_gex(ticker.upper(), expiry)


@router.get("/iv-surface/{ticker}")
async def get_iv_surface_data(ticker: str):
    """IV surface across all expirations (for 3D chart)."""
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
