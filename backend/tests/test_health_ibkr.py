import asyncio
import sys
import time
import types
from types import SimpleNamespace


fastapi_stub = types.ModuleType("fastapi")


class APIRouter:
    def get(self, *_args, **_kwargs):
        def decorator(func):
            return func
        return decorator


class Request:
    pass


def Query(default=None, **_kwargs):
    return default


fastapi_stub.APIRouter = APIRouter
fastapi_stub.Query = Query
fastapi_stub.Request = Request
sys.modules.setdefault("fastapi", fastapi_stub)

from app.core.config import Settings
from app.routers import health


class FakeState:
    pass


class FakeRequest:
    def __init__(self, settings, client=None):
        state = FakeState()
        state.settings = settings
        if client is not None:
            state.ibkr_client = client
        self.app = SimpleNamespace(state=state)


class FakeHealth:
    def __init__(self):
        self.connected = True
        self.host = "ibgateway"
        self.port = 4002
        self.client_id = 11
        self.server_version = 178
        self.account = "DU1234567"
        self.uptime_seconds = 42.0
        self.reconnect_count = 1
        self.subscription_count = 9
        self.state = "connected"
        self.timestamp = time.time()

    def dict(self):
        return self.__dict__.copy()


class FakeClient:
    def __init__(self):
        self.connected = False
        self.disconnected = False

    async def connect(self):
        self.connected = True

    async def disconnect(self):
        self.disconnected = True
        self.connected = False

    async def health_check(self):
        return FakeHealth()

    async def get_account_values(self):
        return {"NetLiquidation": "100000", "AvailableFunds": "90000"}


def test_ibkr_health_reports_disabled_without_connecting():
    async def scenario():
        request = FakeRequest(Settings(ibkr_enabled=False, ibkr_host="ibgateway", ibkr_port=4002))
        result = await health.get_ibkr_health(request)

        assert result["provider"] == "ibkr"
        assert result["enabled"] is False
        assert result["status"] == "disabled"
        assert result["connected"] is False
        assert result["subscription_count"] == 0

    asyncio.run(scenario())


def test_ibkr_health_uses_existing_connected_client():
    async def scenario():
        client = FakeClient()
        request = FakeRequest(Settings(ibkr_enabled=True, ibkr_host="ibgateway", ibkr_client_id=11), client)
        result = await health.get_ibkr_health(request)

        assert result["enabled"] is True
        assert result["status"] == "ok"
        assert result["connected"] is True
        assert result["account"] == "DU1234567"
        assert result["account_info"]["NetLiquidation"] == "100000"
        assert result["subscription_count"] == 9
        assert client.disconnected is False

    asyncio.run(scenario())


def test_ibkr_health_transient_client_disconnects(monkeypatch):
    async def scenario():
        client = FakeClient()
        monkeypatch.setattr(health, "create_client_from_settings", lambda settings: client)
        request = FakeRequest(Settings(ibkr_enabled=True, ibkr_host="ibgateway", ibkr_client_id=11))
        result = await health.get_ibkr_health(request)

        assert result["status"] == "ok"
        assert client.disconnected is True

    asyncio.run(scenario())


def test_ibkr_health_reports_unavailable_on_connect_failure(monkeypatch):
    async def scenario():
        class FailingClient:
            async def connect(self):
                raise ConnectionError("gateway down")

        monkeypatch.setattr(health, "create_client_from_settings", lambda settings: FailingClient())
        request = FakeRequest(Settings(ibkr_enabled=True, ibkr_host="ibgateway"))
        result = await health.get_ibkr_health(request)

        assert result["status"] == "unavailable"
        assert result["connected"] is False
        assert "gateway down" in result["error"]

    asyncio.run(scenario())
