import redis.asyncio as redis
import json
import os
from functools import wraps
from typing import Optional, Any

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client: Optional[redis.Redis] = None

CACHE_TTL = {
    "options_chain": 60,
    "iv_history": 3600,
    "macro": 900,
    "ai_analysis": 300,
    "bsm_calculation": 300,
}

async def get_redis():
    global redis_client
    if redis_client is None:
        try:
            redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        except Exception:
            return None
    return redis_client

async def get_cached(key: str) -> Optional[Any]:
    client = await get_redis()
    if not client: return None
    data = await client.get(key)
    return json.loads(data) if data else None

async def set_cached(key: str, data: Any, ttl: int):
    client = await get_redis()
    if not client: return
    await client.set(key, json.dumps(data), ex=ttl)

def cached(ttl_key: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = f"{func.__name__}:{args}:{kwargs}"
            ttl = CACHE_TTL.get(ttl_key, 300)
            cached_data = await get_cached(key)
            if cached_data is not None:
                return cached_data
            result = await func(*args, **kwargs)
            await set_cached(key, result, ttl)
            return result
        return wrapper
    return decorator
