import logging

from fastapi import APIRouter, Query, Request

from ..services import options_service
from ..services.options_service import (
    OptionChainFetcher,
    async_get_iv_surface,
    async_get_options_chain,
    get_chain_data,
    get_gex_data_result,
    get_iv_stats_data,
    get_iv_surface_data_result,
    get_options_summary_data,
    get_spot_data,
    list_expiration_dates,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _sync_service_overrides_for_tests() -> None:
    """Keep legacy router monkeypatch tests working after service extraction."""

    options_service.OptionChainFetcher = OptionChainFetcher
    options_service.async_get_options_chain = async_get_options_chain
    options_service.async_get_iv_surface = async_get_iv_surface


def _internal_error(message: str):
    from ..core.errors import internal_error

    return internal_error(message)


@router.get("/expirations/{ticker}")
async def list_expirations(request: Request, ticker: str):
    """List all available expiration dates for a ticker."""

    _sync_service_overrides_for_tests()
    return await list_expiration_dates(request, ticker)


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

    _sync_service_overrides_for_tests()
    return await get_chain_data(request, ticker, expiry, strike_radius, atm_pct)


@router.get("/summary/{ticker}")
async def get_options_summary(ticker: str):
    """Summary: spot, max pain, PCR, expected move, ATM IV, IV Rank, IV Percentile, GEX."""

    try:
        return await get_options_summary_data(ticker)
    except Exception as exc:
        logger.exception("Summary fetch failed for %s", ticker)
        raise _internal_error(f"Summary unavailable for {ticker.upper()}: {exc}")


@router.get("/gex/{ticker}")
async def get_gex_data(ticker: str, expiry: str = Query(None)):
    """Gamma Exposure by strike (in $M)."""

    try:
        return await get_gex_data_result(ticker, expiry)
    except Exception:
        logger.exception("GEX fetch failed for %s/%s", ticker, expiry)
        return []  # Return empty list so frontend can render gracefully


@router.get("/iv-surface/{ticker}")
async def get_iv_surface_data(request: Request, ticker: str):
    """IV surface across all expirations (for 3D chart)."""

    _sync_service_overrides_for_tests()
    return await get_iv_surface_data_result(request, ticker)


@router.get("/iv-stats/{ticker}")
async def get_iv_stats(ticker: str):
    """IV Rank and IV Percentile for a ticker."""

    return await get_iv_stats_data(ticker)


@router.get("/spot/{ticker}")
async def get_spot(ticker: str):
    """Get current spot price."""

    return get_spot_data(ticker)
