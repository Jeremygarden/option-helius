from fastapi import APIRouter, HTTPException
from ..services.strategy_scorer import scan_ticker
from ..services.options_scanner import get_direction, get_iv_environment

router = APIRouter(prefix="/api/scanner", tags=["scanner"])


@router.get("/{ticker}")
async def scan(ticker: str):
    """Full scan: direction + IV + strategy filter + scored candidates."""
    ticker = ticker.upper()
    try:
        result = scan_ticker(ticker)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticker}/direction")
async def direction_only(ticker: str):
    """Just the direction analysis."""
    ticker = ticker.upper()
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
