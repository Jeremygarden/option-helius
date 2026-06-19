try:
    import redis.asyncio as redis
except ImportError:  # pragma: no cover - test environments may omit optional Redis dep
    redis = None
import json
import os
from functools import wraps
from typing import Optional, Any
import logging

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client: Optional[Any] = None

# TTL tiers (seconds) — standardized across all services
# Real-time: data that changes intraday (prices, chains, GEX)
# Computed: derived data that's expensive to calculate
# Reference: slow-changing reference data (IV history, macro monthly)
CACHE_TTL_REALTIME = 60      # 1 minute
CACHE_TTL_COMPUTED = 300     # 5 minutes
CACHE_TTL_REFERENCE = 3600   # 1 hour

CACHE_TTL = {
    # Real-time tier (60s)
    "options_chain": CACHE_TTL_REALTIME,
    "summary": CACHE_TTL_REALTIME,
    "gex": CACHE_TTL_REALTIME,
    "scanner": CACHE_TTL_REALTIME,
    # Computed tier (300s)
    "iv_surface": CACHE_TTL_COMPUTED,
    "ai_analysis": CACHE_TTL_COMPUTED,
    "bsm_calculation": CACHE_TTL_COMPUTED,
    "picks": CACHE_TTL_COMPUTED,
    "macro": CACHE_TTL_COMPUTED,
    # Reference tier (3600s)
    "iv_history": CACHE_TTL_REFERENCE,
}


async def init_redis() -> Optional[Any]:
    """Initialize and ping the shared Redis client.

    Redis remains optional for local/test deployments. Failures are logged and
    callers transparently behave as cache misses.
    """

    global redis_client
    if redis is None:
        logger.info("redis.asyncio not installed; Redis cache disabled")
        return None
    if redis_client is not None:
        return redis_client
    try:
        redis_client = redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            health_check_interval=30,
        )
        await redis_client.ping()
        logger.info("Redis connected: %s", REDIS_URL)
    except Exception as e:
        logger.warning("Redis unavailable (%s), using cache-miss fallback", e)
        redis_client = None
    return redis_client


async def close_redis() -> None:
    """Close the shared Redis client during application shutdown."""

    global redis_client
    if redis_client is None:
        return
    try:
        close = getattr(redis_client, "aclose", None) or getattr(redis_client, "close", None)
        if close is not None:
            result = close()
            if hasattr(result, "__await__"):
                await result
        logger.info("Redis connection closed")
    except Exception:
        logger.exception("Redis close failed")
    finally:
        redis_client = None


async def get_redis() -> Optional[Any]:
    return await init_redis()


async def get_cached(key: str) -> Optional[Any]:
    """Get value from Redis cache. Returns None if miss or Redis unavailable."""
    try:
        client = await get_redis()
        if not client:
            return None
        data = await client.get(key)
        if data:
            return json.loads(data)
        return None
    except Exception as e:
        logger.debug(f"Cache get error ({key}): {e}")
        return None


async def set_cached(key: str, data: Any, ttl: int = 300) -> bool:
    """Set value in Redis cache with TTL. Returns True on success."""
    try:
        client = await get_redis()
        if not client:
            return False
        serialized = json.dumps(data, default=str)
        await client.set(key, serialized, ex=ttl)
        return True
    except Exception as e:
        logger.debug(f"Cache set error ({key}): {e}")
        return False


async def delete_cached(key: str) -> bool:
    """Delete a cache key."""
    try:
        client = await get_redis()
        if not client:
            return False
        await client.delete(key)
        return True
    except Exception as e:
        logger.debug(f"Cache delete error ({key}): {e}")
        return False


async def flush_ticker_cache(ticker: str) -> int:
    """Flush all cache entries for a ticker."""
    try:
        client = await get_redis()
        if not client:
            return 0
        ticker_upper = ticker.upper()
        # Match both "prefix:TICKER:suffix" and "prefix:TICKER" (no trailing segment)
        patterns = [f"*:{ticker_upper}:*", f"*:{ticker_upper}"]
        keys: list = []
        for pattern in patterns:
            found = await client.keys(pattern)
            keys.extend(found)
        # Deduplicate
        keys = list(set(keys))
        if keys:
            await client.delete(*keys)
            return len(keys)
        return 0
    except Exception as e:
        logger.debug(f"Cache flush error ({ticker}): {e}")
        return 0


async def invalidate_namespace(namespace: str) -> int:
    """Invalidate all keys under a namespace prefix (e.g. 'macro:' or 'picks:').
    Called after data refresh to ensure stale computed results are cleared."""
    try:
        client = await get_redis()
        if not client:
            return 0
        pattern = f"{namespace}*"
        keys = await client.keys(pattern)
        if keys:
            await client.delete(*keys)
            logger.info("Invalidated %d cache keys under namespace '%s'", len(keys), namespace)
            return len(keys)
        return 0
    except Exception as e:
        logger.debug(f"Cache invalidation error ({namespace}): {e}")
        return 0


def cached(ttl_key: str):
    """Decorator for async functions to cache their results in Redis.
    Uses namespaced keys: {service}:{function}:{args_hash}"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build a stable, namespaced cache key
            arg_parts = ":".join(str(a) for a in args if not hasattr(a, "__dict__"))
            kw_parts = ":".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = f"{ttl_key}:{func.__name__}:{arg_parts}:{kw_parts}".rstrip(":")
            ttl = CACHE_TTL.get(ttl_key, CACHE_TTL_COMPUTED)
            cached_data = await get_cached(cache_key)
            if cached_data is not None:
                return cached_data
            result = await func(*args, **kwargs)
            if result is not None:
                await set_cached(cache_key, result, ttl)
            return result
        return wrapper
    return decorator
