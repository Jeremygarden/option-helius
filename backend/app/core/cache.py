import redis.asyncio as redis
import json
import os
from functools import wraps
from typing import Optional, Any
import logging

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client: Optional[redis.Redis] = None

# TTL in seconds
CACHE_TTL = {
    "options_chain": 300,      # 5 minutes
    "summary": 300,            # 5 minutes
    "gex": 300,                # 5 minutes
    "iv_surface": 600,         # 10 minutes (slower-changing)
    "iv_history": 3600,        # 1 hour
    "macro": 900,              # 15 minutes
    "ai_analysis": 300,        # 5 minutes
    "bsm_calculation": 300,    # 5 minutes
    "scanner": 180,            # 3 minutes
    "picks": 300,              # 5 minutes
}


async def get_redis() -> Optional[redis.Redis]:
    global redis_client
    if redis_client is None:
        try:
            redis_client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
            # Test connection
            await redis_client.ping()
            logger.info(f"Redis connected: {REDIS_URL}")
        except Exception as e:
            logger.warning(f"Redis unavailable ({e}), using in-memory cache fallback")
            redis_client = None
    return redis_client


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
        pattern = f"*:{ticker.upper()}:*"
        keys = await client.keys(pattern)
        if keys:
            await client.delete(*keys)
            return len(keys)
        return 0
    except Exception as e:
        logger.debug(f"Cache flush error ({ticker}): {e}")
        return 0


def cached(ttl_key: str):
    """Decorator for async functions to cache their results in Redis."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{args}:{kwargs}"
            ttl = CACHE_TTL.get(ttl_key, 300)
            cached_data = await get_cached(cache_key)
            if cached_data is not None:
                return cached_data
            result = await func(*args, **kwargs)
            if result is not None:
                await set_cached(cache_key, result, ttl)
            return result
        return wrapper
    return decorator
