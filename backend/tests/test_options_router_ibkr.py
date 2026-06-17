import asyncio
import sys
import types
from types import SimpleNamespace


fastapi_stub = types.ModuleType("fastapi")


class APIRouter:
    def get(self, *_args, **_kwargs):
        def decorator(func):
            return func
        return decorator


def Query(default=None, **_kwargs):
    return default


class Request:
    pass


fastapi_stub.APIRouter = APIRouter
fastapi_stub.Query = Query
fastapi_stub.Request = Request
sys.modules.setdefault("fastapi", fastapi_stub)

from app.core.config import Settings
from app.routers import options


class FakeClient:
    is_connected = True

    async def disconnect(self):
        self.disconnected = True


class FakeFetcher:
    def __init__(self, client, settings=None):
        self._client = client
        self.settings = settings

    async def fetch_option_chain(self, request):
        return {
            "ticker": request.symbol,
            "expiry": request.expiration,
            "spot": 100.0,
            "options": [
                {"strike": 100, "expiry": request.expiration, "type": "call", "price": 5, "delta": 0.5, "gamma": 0.04, "theta": -0.02, "vega": 0.15, "oi": 10, "volume": 20, "iv": 0.25}
            ],
            "source": "ibkr",
        }

    async def get_expirations(self, ticker):
        return ["20990120"]


class FakeState:
    pass


class FakeRequest:
    def __init__(self, settings, client=None):
        state = FakeState()
        state.settings = settings
        if client is not None:
            state.ibkr_client = client
        self.app = SimpleNamespace(state=state)


def test_chain_uses_ibkr_when_enabled_and_client_connected(monkeypatch):
    async def scenario():
        monkeypatch.setattr(options, "OptionChainFetcher", FakeFetcher)
        request = FakeRequest(Settings(ibkr_enabled=True, atm_strike_radius=3), FakeClient())
        result = await options.get_chain(request, "spy", "2099-01-20", None)

        assert result["ticker"] == "SPY"
        assert result["source"] == "ibkr"
        assert result["options"][0]["gamma"] == 0.04

    asyncio.run(scenario())


def test_chain_falls_back_when_ibkr_disabled(monkeypatch):
    async def scenario():
        async def fake_yfinance(ticker, expiry, **_kwargs):
            return {"ticker": ticker, "expiry": expiry, "options": [], "source": "yfinance"}

        monkeypatch.setattr(options, "async_get_options_chain", fake_yfinance)
        request = FakeRequest(Settings(ibkr_enabled=False))
        result = await options.get_chain(request, "spy", "2099-01-20", None)

        assert result == {"ticker": "SPY", "expiry": "2099-01-20", "options": [], "source": "yfinance"}

    asyncio.run(scenario())


def test_expirations_use_ibkr_then_normalize_dates(monkeypatch):
    async def scenario():
        monkeypatch.setattr(options, "OptionChainFetcher", FakeFetcher)
        request = FakeRequest(Settings(ibkr_enabled=True), FakeClient())
        result = await options.list_expirations(request, "spy")

        assert result == {"ticker": "SPY", "expirations": ["2099-01-20"], "source": "ibkr"}

    asyncio.run(scenario())


def test_iv_surface_uses_ibkr_multi_expiry_data(monkeypatch):
    async def scenario():
        class SurfaceFetcher(FakeFetcher):
            async def get_expirations(self, ticker):
                return ["20990120", "20990217"]

            async def fetch_option_chain(self, request):
                return {
                    "ticker": request.symbol,
                    "expiry": request.expiration,
                    "spot": 100.0,
                    "options": [
                        {"strike": 95, "type": "put", "iv": 0.22},
                        {"strike": 100, "type": "call", "iv": 0.25},
                        {"strike": 105, "type": "call", "iv": 0.0},
                    ],
                    "source": "ibkr",
                }

        monkeypatch.setattr(options, "OptionChainFetcher", SurfaceFetcher)
        request = FakeRequest(Settings(ibkr_enabled=True, atm_strike_radius=2), FakeClient())
        result = await options.get_iv_surface_data(request, "spy")

        assert len(result) == 4
        assert {point["source"] for point in result} == {"ibkr"}
        assert {point["iv"] for point in result} == {0.22, 0.25}
        assert {point["type"] for point in result} == {"call", "put"}
        assert all(point["dte"] > 0 for point in result)

    asyncio.run(scenario())


def test_iv_surface_falls_back_to_yfinance_when_ibkr_disabled(monkeypatch):
    async def scenario():
        async def fake_yfinance(ticker):
            return [{"strike": 100, "dte": 30, "iv": 0.2, "type": "call"}]

        monkeypatch.setattr(options, "async_get_iv_surface", fake_yfinance)
        request = FakeRequest(Settings(ibkr_enabled=False))
        result = await options.get_iv_surface_data(request, "spy")

        assert result == [{"strike": 100, "dte": 30, "iv": 0.2, "type": "call"}]

    asyncio.run(scenario())
