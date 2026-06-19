import asyncio
from types import SimpleNamespace

import pytest

from app.core.config import Settings
from app.core.errors import APIError
from app.routers import options
from app.services import macro_service, options_service, picks_service


class FakeRequest:
    def __init__(self, settings: Settings | None = None):
        self.app = SimpleNamespace(state=SimpleNamespace(settings=settings or Settings(ibkr_enabled=False)))


class FakeRedis:
    def __init__(self):
        self.values: dict[str, str] = {}
        self.get_calls: list[str] = []
        self.set_calls: list[tuple[str, str, int | None]] = []

    async def get(self, key: str):
        self.get_calls.append(key)
        return self.values.get(key)

    async def set(self, key: str, value: str, ex: int | None = None):
        self.set_calls.append((key, value, ex))
        self.values[key] = value


class FakeIndicatorService:
    def __init__(self):
        self.calls: list[str] = []

    async def get_indicator_value(self, indicator_id: str):
        self.calls.append(indicator_id)
        return {"id": indicator_id, "value": 42.0, "updated_at": "2026-06-19T00:00:00", "is_stale": False}

    async def _get_cached_data(self, key: str):
        if key == "composite:score:latest":
            return {"score": 61.5, "signal": "neutral"}
        return None


async def _fake_no_ibkr_chain(*_args, **_kwargs):
    return None


async def _fake_no_ibkr_expirations(*_args, **_kwargs):
    return None


async def _fake_no_ibkr_surface(*_args, **_kwargs):
    return None


def test_chain_page_end_to_end_fallback_path(monkeypatch):
    async def scenario():
        async def fake_chain(ticker, expiry, **_kwargs):
            return {
                "ticker": ticker,
                "expiry": expiry,
                "spot": 100.0,
                "options": [
                    {"strike": 90, "type": "put", "price": 1.2},
                    {"strike": 100, "type": "call", "price": 4.8},
                    {"strike": 140, "type": "call", "price": 0.1},
                ],
                "source": "yfinance",
            }

        async def fake_summary(ticker):
            return {"ticker": ticker, "spot": 100.0, "atm_iv": 0.22, "source": "summary-test"}

        async def fake_gex(ticker, expiry):
            return [{"strike": 100, "gex": 1.25, "ticker": ticker, "expiry": expiry}]

        async def fake_surface(ticker):
            return [{"strike": 100, "dte": 30, "iv": 0.22, "type": "call", "ticker": ticker}]

        monkeypatch.setattr(options_service, "get_ibkr_expirations_or_none", _fake_no_ibkr_expirations)
        monkeypatch.setattr(options_service, "get_expirations", lambda ticker: ["2099-01-20"])
        monkeypatch.setattr(options_service, "get_ibkr_chain_or_none", _fake_no_ibkr_chain)
        monkeypatch.setattr(options_service, "async_get_options_chain", fake_chain)
        monkeypatch.setattr(options_service, "async_get_summary", fake_summary)
        monkeypatch.setattr(options_service, "async_get_gex", fake_gex)
        monkeypatch.setattr(options_service, "get_ibkr_iv_surface_or_none", _fake_no_ibkr_surface)
        monkeypatch.setattr(options_service, "async_get_iv_surface", fake_surface)
        # The router preserves older monkeypatch seams by syncing its imported
        # service callables into options_service before selected handlers run.
        monkeypatch.setattr(options, "async_get_options_chain", fake_chain)
        monkeypatch.setattr(options, "async_get_iv_surface", fake_surface)

        request = FakeRequest(Settings(ibkr_enabled=False))
        expirations = await options.list_expirations(request, "spy")
        chain = await options.get_chain(request, "spy", "2099-01-20", None, atm_pct=0.30)
        summary = await options.get_options_summary("spy")
        gex = await options.get_gex_data("spy", "2099-01-20")
        surface = await options.get_iv_surface_data(request, "spy")

        assert expirations == {"ticker": "SPY", "expirations": ["2099-01-20"]}
        assert chain["source"] == "yfinance"
        assert [row["strike"] for row in chain["options"]] == [90, 100]
        assert summary["ticker"] == "SPY"
        assert gex == [{"strike": 100, "gex": 1.25, "ticker": "SPY", "expiry": "2099-01-20"}]
        assert surface == [{"strike": 100, "dte": 30, "iv": 0.22, "type": "call", "ticker": "SPY"}]

    asyncio.run(scenario())


def test_picks_page_endpoint_cache_miss_then_hit(monkeypatch):
    async def scenario():
        store: dict[str, object] = {}
        cache_get_calls: list[str] = []
        cache_set_calls: list[tuple[str, object, int]] = []

        async def fake_get_cached(key):
            cache_get_calls.append(key)
            return store.get(key)

        async def fake_set_cached(key, value, ttl):
            cache_set_calls.append((key, value, ttl))
            store[key] = value

        def fake_response(tickers=None):
            return {
                "dataSource": "integration-test",
                "week": {"start": "2026-06-15", "end": "2026-06-21"},
                "summary": {"totalStrategies": 1, "highScoreCount": 1, "expectedReturnRange": {"low": 1, "high": 2}},
                "scanner": [],
                "picks": [{"ticker": tickers[0] if tickers else "NVDA", "score": 9}],
            }

        monkeypatch.setattr(picks_service, "get_cached", fake_get_cached, raising=False)
        monkeypatch.setattr(picks_service, "set_cached", fake_set_cached, raising=False)
        monkeypatch.setattr(picks_service, "get_picks_response", fake_response)

        # Import inside the module normally happens inside get_cached_picks_response;
        # patch the cache module too so this is a real miss-then-hit exercise.
        import app.core.cache as cache

        monkeypatch.setattr(cache, "get_cached", fake_get_cached)
        monkeypatch.setattr(cache, "set_cached", fake_set_cached)

        first = await picks_service.get_cached_picks_response("spy,qqq")
        second = await picks_service.get_cached_picks_response("spy,qqq")

        assert first == second
        assert first["picks"][0]["ticker"] == "SPY"
        assert cache_get_calls == ["picks:response:SPY,QQQ", "picks:response:SPY,QQQ"]
        assert len(cache_set_calls) == 1
        assert cache_set_calls[0][2] == 300

    asyncio.run(scenario())


def test_macro_page_end_to_end_with_cached_composite(monkeypatch):
    async def scenario():
        service = FakeIndicatorService()
        monkeypatch.setattr(macro_service, "INDICATOR_CONFIG", {"vix": {}, "yield_curve": {}})

        indicators = await macro_service.get_all_indicator_values(service)
        composite = await macro_service.get_composite_score(service)

        assert set(indicators) == {"vix", "yield_curve"}
        assert service.calls == ["vix", "yield_curve"]
        assert composite == {"score": 61.5, "signal": "neutral"}

    asyncio.run(scenario())


def test_error_scenarios_db_down_and_bad_input(monkeypatch):
    async def scenario():
        from app import main

        app = SimpleNamespace(state=SimpleNamespace())
        monkeypatch.setattr(main, "get_database_settings", lambda: SimpleNamespace(enabled=True, command_timeout=0.1))

        async def failing_init_db_pool(_settings):
            raise ConnectionError("db down")

        monkeypatch.setattr(main, "init_db_pool", failing_init_db_pool)
        await main.startup_database_lifecycle(app)

        assert app.state.db_pool is None
        assert "db down" in app.state.db_startup_error

        with pytest.raises(APIError) as excinfo:
            await options.get_chain(FakeRequest(), "../SPY", "2099-01-20", None, 0.30)
        assert excinfo.value.status_code == 422
        assert excinfo.value.detail["code"] == "INVALID_TICKER"

    asyncio.run(scenario())
