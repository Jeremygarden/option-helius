from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..services.strategy_selector import StrategySelector

router = APIRouter()
selector = StrategySelector()

@router.get("/{ticker}", response_model=List[Dict[str, Any]])
async def get_strategies(ticker: str):
    if ticker.upper() == "NVDA":
        iv_rank = 78
        skew = 6.5
        net_gex = 1200000
        trend_pct = 12.5
        days_to_earnings = 25
    else:
        iv_rank = 45
        skew = 1.2
        net_gex = -500000
        trend_pct = 2.1
        days_to_earnings = 45

    strategies = selector.select_strategies(
        ticker=ticker,
        iv_rank=iv_rank,
        skew=skew,
        net_gex=net_gex,
        trend_pct=trend_pct,
        days_to_earnings=days_to_earnings
    )
    return strategies

@router.get("/{ticker}/detail/{strategy_id}")
async def get_strategy_detail(ticker: str, strategy_id: str):
    iv_rank = 78
    skew = 6.5
    net_gex = 1200000
    trend_pct = 12.5
    days_to_earnings = 25

    strategies = selector.select_strategies(ticker, iv_rank, skew, net_gex, trend_pct, days_to_earnings)
    strat = next((s for s in strategies if s["strategy"].replace(" ", "_") == strategy_id or s["strategy"] == strategy_id), None)

    if not strat:
        raise HTTPException(status_code=404, detail="Strategy not found")

    return strat
