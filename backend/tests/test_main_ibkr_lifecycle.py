import sys
import types

fastapi_stub = types.ModuleType("fastapi")


class FastAPI:
    def __init__(self, *args, **kwargs):
        self.state = type("State", (), {})()

    def on_event(self, *_args, **_kwargs):
        def decorator(func):
            return func
        return decorator

    def add_middleware(self, *args, **kwargs):
        pass

    def include_router(self, *args, **kwargs):
        pass

    def get(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator

    def websocket(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator


class APIRouter:
    def get(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator

    def post(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator


class WebSocket:
    pass


class WebSocketDisconnect(Exception):
    pass


class HTTPException(Exception):
    pass


def Query(default=None, **_kwargs):
    return default


def Depends(default=None, **_kwargs):
    return default


def Body(default=None, **_kwargs):
    return default


fastapi_stub.FastAPI = FastAPI
fastapi_stub.APIRouter = APIRouter
fastapi_stub.WebSocket = WebSocket
fastapi_stub.WebSocketDisconnect = WebSocketDisconnect
fastapi_stub.Query = Query
fastapi_stub.Depends = Depends
fastapi_stub.HTTPException = HTTPException
fastapi_stub.Body = Body
fastapi_stub.Request = type("Request", (), {})
# Force the stub even if another test imported a partial fastapi module first.
sys.modules["fastapi"] = fastapi_stub

middleware_stub = types.ModuleType("fastapi.middleware")
cors_stub = types.ModuleType("fastapi.middleware.cors")
cors_stub.CORSMiddleware = type("CORSMiddleware", (), {})
sys.modules.setdefault("fastapi.middleware", middleware_stub)
sys.modules.setdefault("fastapi.middleware.cors", cors_stub)

for router_name in ("sentiment", "macro", "picks", "report", "analyze", "strategies", "notifications", "scanner"):
    router_module = types.ModuleType(f"app.routers.{router_name}")
    router_module.router = object()
    sys.modules.setdefault(f"app.routers.{router_name}", router_module)

import asyncio
from types import SimpleNamespace

from app.core.config import Settings
from app import main


class FakeState:
    pass


class FakeApp:
    def __init__(self):
        self.state = FakeState()


class FakeHealth:
    account = "DU1234567"
    server_version = 178
    subscription_count = 0


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


class FakeFetcher:
    def __init__(self, client, settings=None):
        self._client = client
        self.settings = settings


def test_startup_lifecycle_connects_ibkr_when_enabled_and_reachable(monkeypatch):
    async def scenario():
        settings = Settings(ibkr_enabled=True, ibkr_host="ibgateway", ibkr_client_id=17)
        client = FakeClient()
        app = FakeApp()

        monkeypatch.setattr(main, "get_settings", lambda: settings)
        monkeypatch.setattr(main, "validate_ibkr_startup", lambda loaded_settings: asyncio.sleep(0, result=True))
        monkeypatch.setattr(main, "create_client_from_settings", lambda loaded_settings: client)
        monkeypatch.setattr(main, "OptionChainFetcher", FakeFetcher)

        await main.startup_ibkr_lifecycle(app)

        assert app.state.settings is settings
        assert app.state.ibkr_reachable is True
        assert app.state.ibkr_client is client
        assert app.state.ibkr_fetcher._client is client
        assert app.state.ibkr_fetcher.settings is settings
        assert client.connected is True

    asyncio.run(scenario())


def test_startup_lifecycle_skips_connect_when_ibkr_disabled(monkeypatch):
    async def scenario():
        settings = Settings(ibkr_enabled=False)
        app = FakeApp()
        created = False

        monkeypatch.setattr(main, "get_settings", lambda: settings)
        monkeypatch.setattr(main, "validate_ibkr_startup", lambda loaded_settings: asyncio.sleep(0, result=False))

        def fail_if_called(_settings):
            nonlocal created
            created = True
            raise AssertionError("client should not be created when IBKR is disabled")

        monkeypatch.setattr(main, "create_client_from_settings", fail_if_called)

        await main.startup_ibkr_lifecycle(app)

        assert app.state.ibkr_client is None
        assert app.state.ibkr_fetcher is None
        assert created is False

    asyncio.run(scenario())


def test_startup_lifecycle_records_error_and_preserves_fallback(monkeypatch):
    async def scenario():
        settings = Settings(ibkr_enabled=True)
        app = FakeApp()

        class FailingClient:
            async def connect(self):
                raise ConnectionError("gateway down")

        monkeypatch.setattr(main, "get_settings", lambda: settings)
        monkeypatch.setattr(main, "validate_ibkr_startup", lambda loaded_settings: asyncio.sleep(0, result=True))
        monkeypatch.setattr(main, "create_client_from_settings", lambda loaded_settings: FailingClient())

        await main.startup_ibkr_lifecycle(app)

        assert app.state.ibkr_client is None
        assert "gateway down" in app.state.ibkr_startup_error

    asyncio.run(scenario())


def test_shutdown_lifecycle_disconnects_and_clears_state():
    async def scenario():
        client = FakeClient()
        app = FakeApp()
        app.state.ibkr_client = client
        app.state.ibkr_fetcher = SimpleNamespace(_client=client)

        await main.shutdown_ibkr_lifecycle(app)

        assert client.disconnected is True
        assert app.state.ibkr_client is None
        assert app.state.ibkr_fetcher is None

    asyncio.run(scenario())
