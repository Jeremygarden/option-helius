from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import logging
from .routers import options, sentiment, macro, picks, report, analyze, strategies, notifications, scanner, health
from .mock.options_chain import get_mock_chain
from .core.config import get_settings, validate_ibkr_startup
from .services.ibkr import IBKRDependencyError, OptionChainFetcher, create_client_from_settings

logger = logging.getLogger(__name__)

app = FastAPI(title="Options Helius API")


async def startup_ibkr_lifecycle(application: FastAPI) -> None:
    """Connect the optional IBKR provider during app startup.

    IBKR remains additive: startup failures are logged and saved in app.state,
    while yfinance fallback routes continue serving requests normally.
    """

    settings = get_settings()
    application.state.settings = settings
    application.state.ibkr_client = None
    application.state.ibkr_fetcher = None
    application.state.ibkr_reachable = await validate_ibkr_startup(settings)
    logger.info("Application settings loaded (ibkr_enabled=%s)", settings.ibkr_enabled)

    if not settings.ibkr_enabled:
        return
    if not application.state.ibkr_reachable:
        logger.warning("Skipping IBKR startup connection because Gateway is not reachable")
        return

    try:
        client = create_client_from_settings(settings)
        await client.connect()
        application.state.ibkr_client = client
        application.state.ibkr_fetcher = OptionChainFetcher(client, settings=settings)
        health = await client.health_check()
        logger.info(
            "IBKR connected on startup (host=%s port=%s clientId=%s account=%s serverVersion=%s subscriptions=%s)",
            settings.ibkr_host,
            settings.ibkr_port,
            settings.ibkr_client_id,
            getattr(health, "account", None),
            getattr(health, "server_version", None),
            getattr(health, "subscription_count", 0),
        )
    except IBKRDependencyError as exc:
        logger.warning("IBKR provider dependency missing; yfinance fallback remains active (%s)", exc)
        application.state.ibkr_startup_error = str(exc)
    except Exception as exc:
        logger.warning("IBKR startup connection failed; yfinance fallback remains active (%s)", exc)
        application.state.ibkr_startup_error = str(exc)


async def shutdown_ibkr_lifecycle(application: FastAPI) -> None:
    """Gracefully disconnect the optional IBKR provider during shutdown."""

    client = getattr(application.state, "ibkr_client", None)
    if client is None:
        return

    try:
        await client.disconnect()
        logger.info("IBKR disconnected on shutdown")
    except Exception:
        logger.exception("IBKR shutdown disconnect failed")
    finally:
        application.state.ibkr_client = None
        application.state.ibkr_fetcher = None


@app.on_event("startup")
async def validate_optional_ibkr_config() -> None:
    """Start optional IBKR provider lifecycle without breaking fallbacks."""

    await startup_ibkr_lifecycle(app)


@app.on_event("shutdown")
async def shutdown_optional_ibkr_client() -> None:
    """Disconnect optional IBKR provider lifecycle."""

    await shutdown_ibkr_lifecycle(app)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(options.router, prefix="/api/options", tags=["options"])
app.include_router(sentiment.router, prefix="/api/sentiment", tags=["sentiment"])
app.include_router(macro.router, prefix="/api/macro", tags=["macro"])
app.include_router(picks.router, prefix="/api/picks", tags=["picks"])
app.include_router(report.router, prefix="/api/report", tags=["report"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(strategies.router, prefix="/api/strategies", tags=["strategies"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(scanner.router)
app.include_router(health.router, tags=["health"])

@app.get("/")
async def root():
    return {"status": "ok", "message": "Options Helius Backend Running"}

@app.websocket("/ws/chain/{ticker}")
async def websocket_endpoint(websocket: WebSocket, ticker: str):
    await websocket.accept()
    try:
        while True:
            # Send mock data every 5 seconds
            data = {
                "summary": get_mock_chain(ticker, "2025-06-21"),
                "timestamp": asyncio.get_event_loop().time()
            }
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        print(f"Client disconnected from {ticker} chain")
