from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from .routers import options, sentiment, macro, picks, report, analyze, strategies
from .mock.options_chain import get_mock_options_chain

app = FastAPI(title="Options Helius API")

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
                "summary": get_mock_options_chain(ticker),
                "timestamp": asyncio.get_event_loop().time()
            }
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        print(f"Client disconnected from {ticker} chain")
