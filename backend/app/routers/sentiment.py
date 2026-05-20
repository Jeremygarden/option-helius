from fastapi import APIRouter
from ..mock.sentiment import get_mock_news, get_mock_sentiment_velocity, get_mock_patterns

router = APIRouter()

@router.get("/news/{ticker}")
async def get_news(ticker: str):
    return get_mock_news(ticker)

@router.get("/velocity/{ticker}")
async def get_velocity(ticker: str):
    return get_mock_sentiment_velocity(ticker)

@router.get("/patterns")
async def get_patterns():
    return get_mock_patterns()
