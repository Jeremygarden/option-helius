import asyncio
from types import SimpleNamespace

from app.core import cache


class FakeRedisClient:
    def __init__(self):
        self.pinged = False
        self.closed = False

    async def ping(self):
        self.pinged = True

    async def aclose(self):
        self.closed = True


class FakeRedisModule:
    def __init__(self):
        self.created = []

    def from_url(self, *args, **kwargs):
        client = FakeRedisClient()
        self.created.append((args, kwargs, client))
        return client


def test_init_and_close_redis_lifecycle(monkeypatch):
    async def scenario():
        fake_redis = FakeRedisModule()
        monkeypatch.setattr(cache, "redis", fake_redis)
        monkeypatch.setattr(cache, "redis_client", None)
        monkeypatch.setattr(cache, "REDIS_URL", "redis://redis:6379/0")

        client = await cache.init_redis()

        assert client is fake_redis.created[0][2]
        assert client.pinged is True
        assert fake_redis.created[0][0] == ("redis://redis:6379/0",)
        assert fake_redis.created[0][1]["socket_timeout"] == 2
        assert fake_redis.created[0][1]["health_check_interval"] == 30

        await cache.close_redis()

        assert client.closed is True
        assert cache.redis_client is None

    asyncio.run(scenario())


def test_init_redis_failure_degrades_to_none(monkeypatch):
    async def scenario():
        class FailingRedis:
            def from_url(self, *_args, **_kwargs):
                raise ConnectionError("redis down")

        monkeypatch.setattr(cache, "redis", FailingRedis())
        monkeypatch.setattr(cache, "redis_client", None)

        assert await cache.init_redis() is None
        assert cache.redis_client is None

    asyncio.run(scenario())
