from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Any
from backend.app.services.indicator_refresh import IndicatorRefreshService
from backend.app.core.cache import get_redis # Assuming this exists or will be implemented

router = APIRouter(prefix="/macro", tags=["macro"])

async def get_refresh_service(redis = Depends(get_redis)):
    return IndicatorRefreshService(redis_client=redis)

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
    # Try latest full first, then partial
    latest = await service._get_cached_data("composite:score:latest")
    if not latest:
        latest = await service._get_cached_data("composite:score:partial")
    if not latest:
        return await service.compute_composite_score()
    return latest

@router.get("/composite/history")
async def get_composite_history(service: IndicatorRefreshService = Depends(get_refresh_service)):
    # Mock history
    import random
    from datetime import datetime, timedelta
    return [
        {"date": (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"), "score": 50 + random.randint(-10, 10)}
        for i in range(30)
    ]
