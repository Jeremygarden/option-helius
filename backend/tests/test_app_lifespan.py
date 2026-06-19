import asyncio
import sys
import types
from types import SimpleNamespace

fastapi_stub = types.ModuleType("fastapi")


class FastAPI:
    def __init__(self, *args, **kwargs):
        self.state = SimpleNamespace()

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
    def __init__(self, *args, **kwargs):
        pass

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


def Query(default=None, **_kwargs):
    return default


def Depends(default=None, **_kwargs):
    return default


def Body(default=None, **_kwargs):
    return default


class HTTPException(Exception):
    def __init__(self, status_code=None, detail=None):
        self.status_code = status_code
        self.detail = detail


fastapi_stub.FastAPI = FastAPI
fastapi_stub.APIRouter = APIRouter
fastapi_stub.WebSocket = WebSocket
fastapi_stub.WebSocketDisconnect = WebSocketDisconnect
fastapi_stub.Query = Query
fastapi_stub.Depends = Depends
fastapi_stub.Body = Body
fastapi_stub.HTTPException = HTTPException
fastapi_stub.Request = type("Request", (), {})
sys.modules["fastapi"] = fastapi_stub

middleware_stub = types.ModuleType("fastapi.middleware")
cors_stub = types.ModuleType("fastapi.middleware.cors")
cors_stub.CORSMiddleware = type("CORSMiddleware", (), {})
sys.modules.setdefault("fastapi.middleware", middleware_stub)
sys.modules.setdefault("fastapi.middleware.cors", cors_stub)
responses_stub = types.ModuleType("fastapi.responses")
responses_stub.JSONResponse = type("JSONResponse", (), {})
sys.modules.setdefault("fastapi.responses", responses_stub)

# Keep the test focused on app lifecycle without importing every unrelated router,
# but let options/health import real modules because their tests monkeypatch them.
for router_name in ("sentiment", "macro", "picks", "report", "analyze", "strategies", "notifications", "scanner"):
    router_module = types.ModuleType(f"app.routers.{router_name}")
    router_module.router = object()
    sys.modules.setdefault(f"app.routers.{router_name}", router_module)

from app import main


class FakeApp:
    def __init__(self):
        self.state = SimpleNamespace()


def test_application_startup_and_shutdown_order(monkeypatch):
    async def scenario():
        events = []
        app = FakeApp()

        async def startup_redis(application):
            events.append("startup_redis")
            application.state.redis_client = object()

        async def startup_db(application):
            events.append("startup_db")
            application.state.db_pool = object()

        async def startup_ibkr(application):
            events.append("startup_ibkr")
            application.state.ibkr_client = object()

        async def shutdown_redis(application):
            events.append("shutdown_redis")
            application.state.redis_client = None

        async def shutdown_db(application):
            events.append("shutdown_db")
            application.state.db_pool = None

        async def shutdown_ibkr(application):
            events.append("shutdown_ibkr")
            application.state.ibkr_client = None

        monkeypatch.setattr(main, "startup_redis_lifecycle", startup_redis)
        monkeypatch.setattr(main, "startup_database_lifecycle", startup_db)
        monkeypatch.setattr(main, "startup_ibkr_lifecycle", startup_ibkr)
        monkeypatch.setattr(main, "shutdown_redis_lifecycle", shutdown_redis)
        monkeypatch.setattr(main, "shutdown_database_lifecycle", shutdown_db)
        monkeypatch.setattr(main, "shutdown_ibkr_lifecycle", shutdown_ibkr)
        monkeypatch.setattr(main.macro_scheduler, "start", lambda: events.append("scheduler_start"))
        monkeypatch.setattr(main.macro_scheduler, "shutdown", lambda: events.append("scheduler_shutdown"))

        await main.startup_application(app)
        await main.shutdown_application(app)

        assert events == [
            "startup_redis",
            "startup_db",
            "startup_ibkr",
            "scheduler_start",
            "scheduler_shutdown",
            "shutdown_ibkr",
            "shutdown_db",
            "shutdown_redis",
        ]

    asyncio.run(scenario())


def test_lifespan_calls_startup_and_shutdown(monkeypatch):
    async def scenario():
        events = []
        app = FakeApp()

        async def startup(application):
            events.append(("startup", application))

        async def shutdown(application):
            events.append(("shutdown", application))

        monkeypatch.setattr(main, "startup_application", startup)
        monkeypatch.setattr(main, "shutdown_application", shutdown)

        async with main.lifespan(app):
            events.append(("inside", app))

        assert events == [("startup", app), ("inside", app), ("shutdown", app)]

    asyncio.run(scenario())
