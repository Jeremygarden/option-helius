"""
FlashAlpha integration — pre-computed options analytics.
API docs: https://flashalpha.com
Free tier: 5 req/day, single-stock only (no ETFs), single-expiry GEX.
Basic+: ETFs, volatility surface, higher limits.

Endpoints available on Free:
  GET /v1/exposure/levels/{ticker}   → gamma_flip, call_wall, put_wall, max_pain levels
  GET /v1/exposure/gex/{ticker}?expiration=YYYY-MM-DD → per-strike GEX with OI/volume

ETFs (SPY, QQQ, IWM) require Basic plan.
Use FlashAlpha for individual stocks (NVDA, TSLA, AAPL, etc.)
Use yfinance for ETFs.
"""
import os
import logging
import requests
from typing import Optional
from datetime import datetime, date, timedelta

logger = logging.getLogger(__name__)

FA_API_KEY = os.environ.get("FLASHALPHA_API_KEY", "")
FA_BASE_URL = "https://lab.flashalpha.com/v1"

# ETFs that need Basic plan — fall back to yfinance for these
_ETF_SET = {
    "SPY", "QQQ", "IWM", "DIA", "GLD", "SLV", "TLT", "HYG", "XLF", "XLK",
    "XLE", "XLV", "XLI", "XLP", "XLU", "XLB", "XLRE", "SMH", "ARKK",
    "EEM", "EWZ", "FXI", "VIX",
}

_fa_session = requests.Session()
_fa_session.headers.update({
    "X-Api-Key": FA_API_KEY,
    "Accept": "application/json",
    "User-Agent": "OptionsHelius/1.0",
})


def _fa_get(path: str, params: dict = None, timeout: int = 10) -> Optional[dict]:
    """Make GET request to FlashAlpha. Returns None on error / quota exceeded."""
    try:
        resp = _fa_session.get(f"{FA_BASE_URL}{path}", params=params, timeout=timeout)
        data = resp.json()

        if resp.status_code == 403 and data.get("error") == "Quota exceeded":
            logger.warning(f"FlashAlpha daily quota exceeded (5 req/day on Free). Resets at midnight UTC.")
            return None

        if resp.status_code == 403 and data.get("error") == "tier_restricted":
            logger.warning(f"FlashAlpha tier restriction: {data.get('message')}")
            return None

        if not resp.ok:
            logger.warning(f"FlashAlpha {path}: HTTP {resp.status_code} — {data}")
            return None

        return data
    except Exception as e:
        logger.error(f"FlashAlpha request failed ({path}): {e}")
        return None


def fa_is_supported(ticker: str) -> bool:
    """
    Check if ticker is supported on the current plan.
    Free plan: single stocks only (no ETFs).
    """
    return ticker.upper() not in _ETF_SET


def fa_get_levels(ticker: str) -> Optional[dict]:
    """
    Get key gamma exposure levels for a ticker.

    Returns:
      {
        "gamma_flip": float,      # price where dealer gamma flips negative→positive
        "call_wall": float,       # strike with highest call OI (resistance)
        "put_wall": float,        # strike with highest put OI (support)
        "max_positive_gamma": float,
        "max_negative_gamma": float,
        "zero_dte_magnet": float | None,
        "underlying_price": float,
        "as_of": str,
        "source": "flashalpha"
      }
    Returns None if ticker is ETF (use yfinance instead) or quota exceeded.
    """
    ticker = ticker.upper()
    if not fa_is_supported(ticker):
        logger.info(f"FlashAlpha: {ticker} is ETF, skipping (requires Basic plan)")
        return None

    data = _fa_get(f"/exposure/levels/{ticker}")
    if not data:
        return None

    levels = data.get("levels", {})
    return {
        "gamma_flip": levels.get("gamma_flip"),
        "call_wall": levels.get("call_wall"),
        "put_wall": levels.get("put_wall"),
        "max_positive_gamma": levels.get("max_positive_gamma"),
        "max_negative_gamma": levels.get("max_negative_gamma"),
        "zero_dte_magnet": levels.get("zero_dte_magnet"),
        "underlying_price": data.get("underlying_price"),
        "as_of": data.get("as_of"),
        "source": "flashalpha",
    }


def fa_get_gex(ticker: str, expiration: Optional[str] = None) -> Optional[list]:
    """
    Get per-strike GEX data for a ticker and expiration date.
    Free plan requires ?expiration=YYYY-MM-DD (single expiry only).
    Growth+ allows all expirations without the filter.

    Args:
      ticker: stock symbol (not ETF on Free plan)
      expiration: YYYY-MM-DD string, defaults to nearest Friday

    Returns list of:
      {
        "strike": float,
        "call_gex": float,
        "put_gex": float,
        "net_gex": float,
        "call_oi": int,
        "put_oi": int,
        "call_volume": int,
        "put_volume": int,
      }
    Returns None on error or quota exceeded.
    """
    ticker = ticker.upper()
    if not fa_is_supported(ticker):
        logger.info(f"FlashAlpha: {ticker} is ETF, skipping")
        return None

    if expiration is None:
        # Default: nearest upcoming Friday (standard weekly expiry)
        today = date.today()
        days_until_friday = (4 - today.weekday()) % 7
        if days_until_friday == 0:
            days_until_friday = 7  # already Friday → use next week
        expiration = (today + timedelta(days=days_until_friday)).strftime("%Y-%m-%d")

    data = _fa_get(f"/exposure/gex/{ticker}", params={"expiration": expiration})
    if not data or "strikes" not in data:
        return None

    result = []
    for s in data["strikes"]:
        result.append({
            "strike": s.get("strike"),
            "call_gex": s.get("call_gex", 0),
            "put_gex": s.get("put_gex", 0),
            "net_gex": s.get("net_gex", 0),
            "call_oi": s.get("call_oi", 0),
            "put_oi": s.get("put_oi", 0),
            "call_volume": s.get("call_volume", 0),
            "put_volume": s.get("put_volume", 0),
        })

    return result


def fa_get_summary(ticker: str, expiration: Optional[str] = None) -> Optional[dict]:
    """
    Composite summary from FlashAlpha: levels + GEX aggregate.
    Suitable as a supplement to yfinance summary for single stocks.

    Returns:
      {
        "ticker": str,
        "underlying_price": float,
        "gamma_flip": float,
        "call_wall": float,
        "put_wall": float,
        "net_gex": float,           # sum of all net_gex across strikes
        "net_gex_millions": float,
        "zero_dte_magnet": float | None,
        "as_of": str,
        "source": "flashalpha",
      }
    """
    ticker = ticker.upper()
    if not fa_is_supported(ticker):
        return None

    levels = fa_get_levels(ticker)
    if not levels:
        return None

    # Try to get GEX data (costs 1 more req — only if we have quota)
    gex_data = fa_get_gex(ticker, expiration)
    net_gex = 0.0
    if gex_data:
        net_gex = sum(s.get("net_gex", 0) for s in gex_data)

    return {
        "ticker": ticker,
        "underlying_price": levels.get("underlying_price"),
        "gamma_flip": levels.get("gamma_flip"),
        "call_wall": levels.get("call_wall"),
        "put_wall": levels.get("put_wall"),
        "max_positive_gamma": levels.get("max_positive_gamma"),
        "max_negative_gamma": levels.get("max_negative_gamma"),
        "zero_dte_magnet": levels.get("zero_dte_magnet"),
        "net_gex": net_gex,
        "net_gex_millions": round(net_gex / 1_000_000, 4) if net_gex else None,
        "as_of": levels.get("as_of"),
        "source": "flashalpha",
    }
