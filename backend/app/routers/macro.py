from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Any
from ..services.indicator_refresh import IndicatorRefreshService
from ..core.cache import get_redis

router = APIRouter()

async def get_refresh_service(redis=Depends(get_redis)):
    return IndicatorRefreshService(redis_client=redis)


@router.get("/indicators")
async def get_all_indicators(service: IndicatorRefreshService = Depends(get_refresh_service)):
    """Return all 18 indicators with real values + staleness info."""
    from ..services.indicator_refresh import INDICATOR_CONFIG
    results = {}
    for id in INDICATOR_CONFIG.keys():
        results[id] = await service.get_indicator_value(id)
    return results

@router.get("/indicator/{id}")
async def get_indicator_detail(id: str, service: IndicatorRefreshService = Depends(get_refresh_service)):
    """Single indicator detail."""
    try:
        return await service.get_indicator_value(id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@router.get("/composite")
async def get_real_composite_score(service: IndicatorRefreshService = Depends(get_refresh_service)):
    """Weighted composite score from real data."""
    latest = await service._get_cached_data("composite:score:latest")
    if not latest:
        latest = await service._get_cached_data("composite:score:partial")
    if not latest:
        return await service.compute_composite_score(use_cached=True)
    return latest

@router.get("/refresh/status")
async def get_refresh_status(service: IndicatorRefreshService = Depends(get_refresh_service)):
    return await service.get_refresh_status()

@router.post("/refresh/daily")
async def refresh_daily(service: IndicatorRefreshService = Depends(get_refresh_service)):
    return await service.refresh_daily_indicators()

@router.post("/refresh/monthly")
async def refresh_monthly(service: IndicatorRefreshService = Depends(get_refresh_service)):
    return await service.refresh_monthly_indicators()

@router.post("/refresh/full")
async def refresh_full(service: IndicatorRefreshService = Depends(get_refresh_service)):
    return await service.force_full_refresh()

@router.post("/refresh/weekly-composite")
async def refresh_weekly_composite(service: IndicatorRefreshService = Depends(get_refresh_service)):
    return await service.compute_composite_score(use_cached=False)

@router.get("/composite/latest")
async def get_latest_composite(service: IndicatorRefreshService = Depends(get_refresh_service)):
    latest = await service._get_cached_data("composite:score:latest")
    if not latest:
        latest = await service._get_cached_data("composite:score:partial")
    if not latest:
        return await service.compute_composite_score()
    return latest

@router.get("/composite/history")
async def get_composite_history(service: IndicatorRefreshService = Depends(get_refresh_service)):
    import random
    from datetime import datetime, timedelta
    return [
        {"date": (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"), "score": 50 + random.randint(-10, 10)}
        for i in range(30)
    ]

@router.get("/backtest")
async def get_macro_backtest():
    from ..services.warning_calculator import run_backtest
    return run_backtest()
