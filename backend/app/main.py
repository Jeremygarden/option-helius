from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import logging
from .routers import options, sentiment, macro, picks, report, analyze, strategies, notifications, scanner
from .mock.options_chain import get_mock_chain
from .core.config import get_settings, validate_ibkr_startup

logger = logging.getLogger(__name__)

app = FastAPI(title="Options Helius API")


@app.on_event("startup")
async def validate_optional_ibkr_config() -> None:
    """Warn when IBKR is enabled but Gateway is not reachable."""

    settings = get_settings()
    app.state.settings = settings
    app.state.ibkr_reachable = await validate_ibkr_startup(settings)
    logger.info("Application settings loaded (ibkr_enabled=%s)", settings.ibkr_enabled)


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
