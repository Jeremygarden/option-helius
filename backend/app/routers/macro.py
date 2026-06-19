from typing import Any

from fastapi import APIRouter, Depends

from ..core.cache import get_redis
from ..core.errors import not_found_error
from ..services.indicator_refresh import IndicatorRefreshService
from ..services.macro_service import (
    get_all_indicator_values,
    get_composite_history,
    get_composite_score,
    get_macro_backtest_result,
    refresh_all_indicators,
    refresh_daily_indicators,
    refresh_monthly_indicators,
)

router = APIRouter()


async def get_refresh_service(redis=Depends(get_redis)):
    return IndicatorRefreshService(redis_client=redis)


@router.get("/indicators")
async def get_all_indicators(service: IndicatorRefreshService = Depends(get_refresh_service)) -> dict[str, Any]:
    """Return all 18 indicators with real values + staleness info."""

    return await get_all_indicator_values(service)


@router.get("/indicator/{id}")
async def get_indicator_detail(id: str, service: IndicatorRefreshService = Depends(get_refresh_service)):
    """Single indicator detail."""

    try:
        return await service.get_indicator_value(id)
    except ValueError:
        raise not_found_error(f"Indicator '{id}' not found")


@router.get("/composite")
async def get_real_composite_score(service: IndicatorRefreshService = Depends(get_refresh_service)):
    """Weighted composite score from real data."""

    return await get_composite_score(service)


@router.get("/refresh/status")
async def get_refresh_status(service: IndicatorRefreshService = Depends(get_refresh_service)):
    return await service.get_refresh_status()


@router.post("/refresh/daily")
async def refresh_daily(service: IndicatorRefreshService = Depends(get_refresh_service)):
    return await refresh_daily_indicators(service)


@router.post("/refresh/monthly")
async def refresh_monthly(service: IndicatorRefreshService = Depends(get_refresh_service)):
    return await refresh_monthly_indicators(service)


@router.post("/refresh/full")
async def refresh_full(service: IndicatorRefreshService = Depends(get_refresh_service)):
    return await refresh_all_indicators(service)


@router.post("/refresh/weekly-composite")
async def refresh_weekly_composite(service: IndicatorRefreshService = Depends(get_refresh_service)):
    return await service.compute_composite_score(use_cached=False)


@router.get("/composite/latest")
async def get_latest_composite(service: IndicatorRefreshService = Depends(get_refresh_service)):
    return await get_composite_score(service)


@router.get("/composite/history")
async def get_macro_composite_history():
    return get_composite_history()


@router.get("/backtest")
async def get_macro_backtest():
    return get_macro_backtest_result()
