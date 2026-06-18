"""
Tiered refresh system for 8 macro warning indicators.
Each indicator has its own refresh schedule and data source.
"""
from enum import Enum
from datetime import datetime, date, timedelta
import json
from typing import Dict, Any, List, Optional
import asyncio
import logging
logger = logging.getLogger(__name__)

from .macro_fetchers import fetch_yfinance, fetch_fred, fetch_http_json, fetch_http_csv

# Assuming redis connection will be provided via a dependency or global app state
# For now, let's mock or use a placeholder if the actual redis instance isn't available
# from backend.app.core.cache import get_redis

class RefreshTier(Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"

INDICATOR_CONFIG = {
    "vix": {
        "name": "VIX",
        "tier": RefreshTier.DAILY,
        "data_source": "cboe_free",
        "ttl_seconds": 3600,
        "fetch_fn": "fetch_vix",
        "weight": 0.10,
        "staleness_warning_hours": 25,
    },
    "yield_curve": {
        "name": "Yield Curve",
        "tier": RefreshTier.DAILY,
        "data_source": "fred_api",
        "ttl_seconds": 3600,
        "fetch_fn": "fetch_yield_curve",
        "weight": 0.15,
        "staleness_warning_hours": 25,
    },
    "trend": {
        "name": "Trend (SPX vs 200MA)",
        "tier": RefreshTier.DAILY,
        "data_source": "yahoo_finance",
        "ttl_seconds": 3600,
        "fetch_fn": "fetch_trend",
        "weight": 0.10,
        "staleness_warning_hours": 25,
    },
    "erp": {
        "name": "Equity Risk Premium",
        "tier": RefreshTier.DAILY,
        "data_source": "computed",
        "ttl_seconds": 3600,
        "fetch_fn": "fetch_erp",
        "weight": 0.05,
        "staleness_warning_hours": 25,
    },
    "cape": {
        "name": "CAPE Ratio",
        "tier": RefreshTier.MONTHLY,
        "data_source": "multpl_scrape",
        "ttl_seconds": 86400 * 30,
        "fetch_fn": "fetch_cape",
        "weight": 0.20,
        "staleness_warning_hours": 25 * 32,
    },
    "aiae": {
        "name": "AIAE",
        "tier": RefreshTier.MONTHLY,
        "data_source": "fred_api",
        "ttl_seconds": 86400 * 30,
        "fetch_fn": "fetch_aiae",
        "weight": 0.15,
        "staleness_warning_hours": 25 * 32,
    },
    "m7_concentration": {
        "name": "M7 Concentration",
        "tier": RefreshTier.QUARTERLY,
        "data_source": "manual",
        "ttl_seconds": 86400 * 90,
        "fetch_fn": "fetch_m7_concentration",
        "weight": 0.15,
        "staleness_warning_hours": 25 * 95,
    },
    "pe_gap": {
        "name": "P/E Gap",
        "tier": RefreshTier.QUARTERLY,
        "data_source": "computed",
        "ttl_seconds": 86400 * 90,
        "fetch_fn": "fetch_pe_gap",
        "weight": 0.10,
        "staleness_warning_hours": 25 * 95,
    },
}

class IndicatorRefreshService:
    def __init__(self, redis_client=None):
        self.redis = redis_client

    async def _get_cached_data(self, key: str) -> Optional[Dict]:
        if not self.redis:
            return None
        data = await self.redis.get(key)
        return json.loads(data) if data else None

    async def _set_cached_data(self, key: str, value: Dict, ttl: int):
        if self.redis:
            await self.redis.set(key, json.dumps(value), ex=ttl)

    async def get_indicator_value(self, indicator_id: str) -> Dict:
        config = INDICATOR_CONFIG.get(indicator_id)
        if not config:
            raise ValueError(f"Unknown indicator: {indicator_id}")

        key = f"indicator:{indicator_id}:value"
        cached = await self._get_cached_data(key)
        
        if cached:
            updated_at = datetime.fromisoformat(cached["updated_at"])
            is_stale = (datetime.now() - updated_at).total_seconds() > config["staleness_warning_hours"] * 3600
            return {**cached, "is_stale": is_stale, "tier": config["tier"].value}
        
        # If not cached, trigger a refresh (or return placeholder for now)
        # In a real implementation, this would call fetch_fn
        return await self.refresh_indicator(indicator_id)

    async def refresh_indicator(self, indicator_id: str) -> Dict:
        config = INDICATOR_CONFIG.get(indicator_id)
        fetch_fn_name = config.get("fetch_fn")
        fetch_fn = getattr(self, fetch_fn_name, None)
        
        try:
            if not fetch_fn:
                logger.warning(f"No fetch function defined for {indicator_id}")
                value = 0.0
            else:
                data = await fetch_fn()
                value = data["value"]
                
            result = {
                "value": value,
                "updated_at": datetime.now().isoformat(),
                "status": "ok",
                "source": data.get("source", config["data_source"]) if fetch_fn else config["data_source"]
            }
        except Exception as exc:
            logger.error(f"Failed to refresh indicator {indicator_id}: {exc}")
            # Try to return last cached value
            cached = await self._get_cached_data(f"indicator:{indicator_id}:value")
            if cached:
                return {**cached, "is_stale": True, "tier": config["tier"].value, "error": str(exc)}
            return {"value": 0.0, "updated_at": datetime.now().isoformat(), "status": "error", "error": str(exc)}
        
        await self._set_cached_data(f"indicator:{indicator_id}:value", result, config["ttl_seconds"])
        score = self._compute_indicator_score(indicator_id, value)
        await self._set_cached_data(f"indicator:{indicator_id}:score", {"score": score, "updated_at": result["updated_at"]}, config["ttl_seconds"])
        
        return {**result, "is_stale": False, "tier": config["tier"].value}

    async def fetch_vix(self):
        val = await fetch_yfinance("^VIX")
        return {"value": val or 0.0, "source": "yfinance"}

    async def fetch_yield_curve(self):
        # T10Y2Y (FRED)
        val = await fetch_fred("T10Y2Y")
        if val is None:
            # Fallback to ^TNX - ^IRX (10Y - 13W)
            tnx = await fetch_yfinance("^TNX")
            irx = await fetch_yfinance("^IRX")
            if tnx and irx:
                val = tnx - irx
        return {"value": val or 0.0, "source": "FRED" if val else "yfinance fallback"}

    async def fetch_trend(self):
        # (SPX - 200MA) / 200MA
        try:
            import yfinance as yf
            import asyncio
            ticker = await asyncio.to_thread(yf.Ticker, "^GSPC")
            hist = await asyncio.to_thread(ticker.history, period="250d")
            if not hist.empty:
                close = hist["Close"].iloc[-1]
                ma200 = hist["Close"].rolling(200).mean().iloc[-1]
                val = ((close - ma200) / ma200) * 100
                return {"value": round(val, 2), "source": "yfinance"}
        except Exception:
            pass
        return {"value": 0.0, "source": "error"}

    async def fetch_erp(self):
        # Earnings Yield - 10Y Yield
        try:
            # S&P 500 Earnings Yield approx (using trailing PE)
            import yfinance as yf
            import asyncio
            ticker = await asyncio.to_thread(yf.Ticker, "^GSPC")
            # This is a crude approximation; in real life you'd fetch from a data provider
            # or Fred GS10
            ten_year = await fetch_fred("GS10")
            if ten_year is None:
                ten_year = await fetch_yfinance("^TNX")
            
            # SPX trailing PE is around 25-30 -> Yield 3.3-4%
            # For now, use a constant 4% if info is missing
            ey = 4.0
            val = ey - (ten_year or 4.0)
            return {"value": round(val, 2), "source": "computed"}
        except Exception:
            pass
        return {"value": 0.0, "source": "error"}

    def _compute_indicator_score(self, indicator_id: str, value: float) -> float:
        # Simplified scoring logic (0-100)
        return 50.0 

    async def refresh_daily_indicators(self) -> Dict:
        daily_indicators = [id for id, cfg in INDICATOR_CONFIG.items() if cfg["tier"] == RefreshTier.DAILY]
        results = {}
        for id in daily_indicators:
            results[id] = await self.refresh_indicator(id)
        
        status = {"last_run": datetime.now().isoformat(), "status": "ok", "refreshed": daily_indicators}
        if self.redis:
            await self.redis.hset("refresh:status", "daily", json.dumps(status))
        return status

    async def refresh_monthly_indicators(self) -> Dict:
        monthly_indicators = [id for id, cfg in INDICATOR_CONFIG.items() if cfg["tier"] == RefreshTier.MONTHLY]
        results = {}
        for id in monthly_indicators:
            results[id] = await self.refresh_indicator(id)
        
        status = {"last_run": datetime.now().isoformat(), "status": "ok", "refreshed": monthly_indicators}
        if self.redis:
            await self.redis.hset("refresh:status", "monthly", json.dumps(status))
        return status

    async def refresh_quarterly_indicators(self) -> Dict:
        quarterly_indicators = [id for id, cfg in INDICATOR_CONFIG.items() if cfg["tier"] == RefreshTier.QUARTERLY]
        results = {}
        for id in quarterly_indicators:
            results[id] = await self.refresh_indicator(id)
            
        status = {"last_run": datetime.now().isoformat(), "status": "ok", "refreshed": quarterly_indicators}
        if self.redis:
            await self.redis.hset("refresh:status", "quarterly", json.dumps(status))
        return status

    async def force_full_refresh(self) -> Dict:
        all_indicators = list(INDICATOR_CONFIG.keys())
        for id in all_indicators:
            await self.refresh_indicator(id)
        return await self.compute_composite_score(use_cached=False)

    async def compute_composite_score(self, use_cached: bool = True) -> Dict:
        scores = {}
        is_partial = False
        daily_only = True
        
        for id, config in INDICATOR_CONFIG.items():
            score_key = f"indicator:{id}:score"
            cached_score = await self._get_cached_data(score_key)
            
            if cached_score:
                scores[id] = cached_score["score"]
                if config["tier"] != RefreshTier.DAILY:
                    daily_only = False
            else:
                if not use_cached:
                    await self.refresh_indicator(id)
                    cached_score = await self._get_cached_data(score_key)
                    scores[id] = cached_score["score"]
                else:
                    is_partial = True
                    scores[id] = 50.0 # Fallback
        
        # Calculate weighted score
        composite_score = 0.0
        total_weight = sum(cfg["weight"] for cfg in INDICATOR_CONFIG.values())
        
        for id, score in scores.items():
            composite_score += score * (INDICATOR_CONFIG[id]["weight"] / total_weight)
            
        result = {
            "score": round(composite_score, 2),
            "updated_at": datetime.now().isoformat(),
            "is_partial": is_partial,
            "daily_only": daily_only,
            "confidence": "HIGH" if not is_partial else "MEDIUM"
        }
        
        if self.redis:
            key = "composite:score:latest" if not is_partial else "composite:score:partial"
            await self.redis.set(key, json.dumps(result))
            
        return result

    async def get_refresh_status(self) -> Dict:
        status = {}
        for id, config in INDICATOR_CONFIG.items():
            key = f"indicator:{id}:value"
            cached = await self._get_cached_data(key)
            if cached:
                updated_at = datetime.fromisoformat(cached["updated_at"])
                diff = datetime.now() - updated_at
                status[id] = {
                    "last_updated": cached["updated_at"],
                    "is_stale": diff.total_seconds() > config["staleness_warning_hours"] * 3600,
                    "tier": config["tier"].value
                }
            else:
                status[id] = {"last_updated": None, "is_stale": True, "tier": config["tier"].value}
        return status
