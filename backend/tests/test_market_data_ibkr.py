import asyncio

from app.core.config import Settings
from app.services import market_data


def test_async_get_options_chain_prefers_ibkr_when_enabled(monkeypatch):
    async def scenario():
        async def no_cache(_key):
            return None

        async def fake_cache_set(key, data, ttl=300):
            writes.append((key, data, ttl))

        async def fake_ibkr(ticker, expiry, settings=None):
            return {
                "ticker": ticker.upper(),
                "expiry": expiry,
                "options": [{"strike": 100, "type": "call", "gamma": 0.04, "delta": 0.5}],
                "source": "ibkr",
                "greeks_source": "ibkr_model",
            }

        writes = []
        monkeypatch.setattr(market_data, "get_settings", lambda: Settings(ibkr_enabled=True, atm_strike_radius=4))
        monkeypatch.setattr(market_data, "_redis_get", no_cache)
        monkeypatch.setattr(market_data, "_redis_set", fake_cache_set)
        monkeypatch.setattr(market_data, "_fetch_ibkr_options_chain", fake_ibkr)
        monkeypatch.setattr(market_data, "get_options_chain", lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("should not use yfinance")))

        result = await market_data.async_get_options_chain("spy", "2099-01-20")

        assert result["source"] == "ibkr"
        assert result["greeks_source"] == "ibkr_model"
        assert result["options"][0]["gamma"] == 0.04
        assert writes[0][0] == "chain:ibkr:SPY:2099-01-20:4"
        assert writes[0][2] == market_data.IBKR_CHAIN_TTL_SECONDS

    asyncio.run(scenario())


def test_async_get_options_chain_falls_back_when_ibkr_unavailable(monkeypatch):
    async def scenario():
        async def no_cache(_key):
            return None

        async def fake_cache_set(*_args, **_kwargs):
            pass

        async def fake_ibkr(_ticker, _expiry, settings=None):
            return None

        monkeypatch.setattr(market_data, "get_settings", lambda: Settings(ibkr_enabled=True))
        monkeypatch.setattr(market_data, "_redis_get", no_cache)
        monkeypatch.setattr(market_data, "_redis_set", fake_cache_set)
        monkeypatch.setattr(market_data, "_fetch_ibkr_options_chain", fake_ibkr)
        monkeypatch.setattr(market_data, "get_options_chain", lambda ticker, expiry=None: {"ticker": ticker.upper(), "expiry": expiry, "options": [], "source": "yfinance"})

        result = await market_data.async_get_options_chain("spy", "2099-01-20")

        assert result == {"ticker": "SPY", "expiry": "2099-01-20", "options": [], "source": "yfinance"}

    asyncio.run(scenario())


def test_async_get_options_chain_can_skip_ibkr_for_router_fallback(monkeypatch):
    async def scenario():
        async def no_cache(_key):
            return None

        async def fake_cache_set(*_args, **_kwargs):
            pass

        async def fake_ibkr(*_args, **_kwargs):
            raise AssertionError("prefer_ibkr=False must not retry IBKR")

        monkeypatch.setattr(market_data, "get_settings", lambda: Settings(ibkr_enabled=True))
        monkeypatch.setattr(market_data, "_redis_get", no_cache)
        monkeypatch.setattr(market_data, "_redis_set", fake_cache_set)
        monkeypatch.setattr(market_data, "_fetch_ibkr_options_chain", fake_ibkr)
        monkeypatch.setattr(market_data, "get_options_chain", lambda ticker, expiry=None: {"ticker": ticker.upper(), "expiry": expiry, "options": [], "source": "yfinance"})

        result = await market_data.async_get_options_chain("spy", "2099-01-20", prefer_ibkr=False)

        assert result["source"] == "yfinance"

    asyncio.run(scenario())


def test_async_get_gex_uses_ibkr_real_greeks_when_available(monkeypatch):
    async def scenario():
        async def no_cache(_key):
            return None

        async def fake_cache_set(key, data, ttl=300):
            writes.append((key, data, ttl))

        async def fake_ibkr(ticker, expiry, settings=None):
            return {
                "ticker": ticker.upper(),
                "expiry": expiry,
                "spot": 100.0,
                "options": [
                    {"strike": 100, "type": "call", "gamma": 0.02, "delta": 0.55, "oi": 100, "volume": 5},
                    {"strike": 100, "type": "put", "gamma": 0.03, "delta": -0.45, "oi": 50, "volume": 7},
                ],
                "source": "ibkr",
            }

        writes = []
        monkeypatch.setattr(market_data, "get_settings", lambda: Settings(ibkr_enabled=True, atm_strike_radius=8))
        monkeypatch.setattr(market_data, "_redis_get", no_cache)
        monkeypatch.setattr(market_data, "_redis_set", fake_cache_set)
        monkeypatch.setattr(market_data, "_fetch_ibkr_options_chain", fake_ibkr)
        monkeypatch.setattr(market_data, "get_gex", lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("should not use yfinance GEX")))

        result = await market_data.async_get_gex("spy", "2099-01-20")

        assert result[0]["strike"] == 100
        assert result[0]["source"] == "ibkr"
        assert result[0]["greeks_source"] == "ibkr_model"
        assert result[0]["call_gex"] == 0.02
        assert result[0]["put_gex"] == -0.015
        assert result[0]["gex"] == 0.005
        assert result[0]["call_delta_exposure"] == 5500.0
        assert result[0]["put_delta_exposure"] == -2250.0
        assert writes[0][0] == "gex:ibkr:SPY:2099-01-20:8"
        assert writes[0][2] == market_data.IBKR_CHAIN_TTL_SECONDS

    asyncio.run(scenario())


def test_async_get_gex_falls_back_when_ibkr_greeks_missing(monkeypatch):
    async def scenario():
        async def no_cache(_key):
            return None

        async def fake_cache_set(*_args, **_kwargs):
            pass

        async def fake_ibkr(_ticker, _expiry, settings=None):
            return {"spot": 100.0, "options": [{"strike": 100, "type": "call", "gamma": 0.0, "delta": 0.0, "oi": 100}]}

        monkeypatch.setattr(market_data, "get_settings", lambda: Settings(ibkr_enabled=True))
        monkeypatch.setattr(market_data, "_redis_get", no_cache)
        monkeypatch.setattr(market_data, "_redis_set", fake_cache_set)
        monkeypatch.setattr(market_data, "_fetch_ibkr_options_chain", fake_ibkr)
        monkeypatch.setattr(market_data, "get_gex", lambda ticker, expiry=None: [{"strike": 100, "gex": 0.1234, "source": "yfinance"}])

        result = await market_data.async_get_gex("spy", "2099-01-20")

        assert result == [{"strike": 100, "gex": 0.1234, "source": "yfinance"}]

    asyncio.run(scenario())
