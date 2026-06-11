from fastapi import APIRouter, Query
from ..services.market_data import (
    async_get_options_chain,
    async_get_summary,
    async_get_gex,
    async_get_iv_surface,
    get_expirations,
    get_iv_rank_percentile,
    get_spot_price,
)

router = APIRouter()


@router.get("/expirations/{ticker}")
async def list_expirations(ticker: str):
    """List all available expiration dates for a ticker."""
    return {"ticker": ticker.upper(), "expirations": get_expirations(ticker.upper())}


@router.get("/chain/{ticker}")
async def get_chain(ticker: str, expiry: str = Query(None)):
    """
    Full options chain (calls + puts) with Greeks, IV, OI.
    Includes IV Rank, IV Percentile, Max Pain.
    """
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
