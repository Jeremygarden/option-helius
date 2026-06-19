from fastapi import APIRouter
from ..services.strategy_scorer import scan_ticker
from ..services.options_scanner import get_direction, get_iv_environment
from ..core.errors import upstream_unavailable, internal_error
from ..core.validation import normalize_ticker

router = APIRouter(prefix="/api/scanner", tags=["scanner"])


@router.get("/{ticker}")
async def scan(ticker: str):
    """Full scan: direction + IV + strategy filter + scored candidates."""
    ticker = normalize_ticker(ticker)
    try:
        result = scan_ticker(ticker)
        return result
    except ConnectionError as e:
        raise upstream_unavailable("yfinance", str(e))
    except Exception as e:
        raise internal_error(f"Scanner failed for {ticker}: {e}")


@router.get("/{ticker}/direction")
async def direction_only(ticker: str):
    """Just the direction analysis."""
    ticker = normalize_ticker(ticker)
    try:
        d = get_direction(ticker)
        return {
            "ticker": ticker,
            "score": d.score,
            "label": d.label,
            "price": d.price,
            "momentum_5d": d.momentum_5d,
            "rsi_14": d.rsi_14,
            "support": d.support_level,
            "resistance": d.resistance_level,
            "near_support": d.near_support,
            "near_resistance": d.near_resistance,
            "signals": d.signals_detail,
        }
    except ConnectionError as e:
        raise upstream_unavailable("yfinance", str(e))
    except Exception as e:
        raise internal_error(f"Direction analysis failed for {ticker}: {e}")
