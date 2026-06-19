"""Macro endpoint service orchestration.

Routers should only bind HTTP concerns. This module owns cache coordination,
indicator batch aggregation, refresh invalidation, and temporary history data.
"""

from __future__ import annotations

import asyncio
import random
from datetime import datetime, timedelta
from typing import Any

from ..core.cache import get_cached, invalidate_namespace, set_cached
from ..services.indicator_refresh import INDICATOR_CONFIG, IndicatorRefreshService
from ..services.warning_calculator import run_backtest


async def get_all_indicator_values(service: IndicatorRefreshService) -> dict[str, Any]:
    """Return all configured indicators using one batch cache key."""

    cached = await get_cached("macro:all_indicators:batch")
    if cached is not None:
        return cached

    indicator_ids = list(INDICATOR_CONFIG.keys())
    tasks = [service.get_indicator_value(indicator_id) for indicator_id in indicator_ids]
    raw = await asyncio.gather(*tasks, return_exceptions=True)
    results: dict[str, Any] = {}
    for indicator_id, outcome in zip(indicator_ids, raw):
        if isinstance(outcome, Exception):
            results[indicator_id] = {"error": str(outcome), "value": None}
        else:
            results[indicator_id] = outcome

    await set_cached("macro:all_indicators:batch", results, 60)
    return results


async def get_composite_score(service: IndicatorRefreshService, *, allow_partial: bool = True) -> Any:
    """Return latest/partial cached composite score or compute it."""

    latest = await service._get_cached_data("composite:score:latest")
    if allow_partial and not latest:
        latest = await service._get_cached_data("composite:score:partial")
    if not latest:
        return await service.compute_composite_score(use_cached=True)
    return latest


async def refresh_daily_indicators(service: IndicatorRefreshService) -> Any:
    await _invalidate_macro_indicator_caches()
    return await service.refresh_daily_indicators()


async def refresh_monthly_indicators(service: IndicatorRefreshService) -> Any:
    await _invalidate_macro_indicator_caches()
    return await service.refresh_monthly_indicators()


async def refresh_all_indicators(service: IndicatorRefreshService) -> Any:
    await _invalidate_macro_indicator_caches()
    return await service.force_full_refresh()


async def _invalidate_macro_indicator_caches() -> None:
    # Invalidate the batch cache AND individual indicator caches so fresh data is returned.
    await invalidate_namespace("macro:")
    await invalidate_namespace("indicator:")


def get_composite_history(days: int = 30) -> list[dict[str, Any]]:
    """Temporary composite history source until TimescaleDB history is wired."""

    return [
        {"date": (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"), "score": 50 + random.randint(-10, 10)}
        for i in range(days)
    ]


def get_macro_backtest_result() -> Any:
    return run_backtest()
