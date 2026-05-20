from fastapi import APIRouter, Query
from ..mock.options_chain import get_mock_chain, get_mock_summary, get_mock_gex, get_mock_iv_surface

router = APIRouter()

@router.get("/chain/{ticker}")
async def get_chain(ticker: str, expiry: str = Query(None)):
    return get_mock_chain(ticker, expiry or "2025-06-21")

@router.get("/summary/{ticker}")
async def get_summary(ticker: str):
    return get_mock_summary(ticker)

@router.get("/gex/{ticker}")
async def get_gex(ticker: str):
    return get_mock_gex(ticker)

@router.get("/iv-surface/{ticker}")
async def get_iv_surface(ticker: str):
    return get_mock_iv_surface(ticker)
