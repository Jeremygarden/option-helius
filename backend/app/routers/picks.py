from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query

from ..services.picks_service import (
    get_cached_picks_response,
    get_picks_response,
    parse_tickers,
    scan_single_ticker_result,
)

router = APIRouter()


@router.get("")
async def get_picks(tickers: Optional[str] = Query(None)):
    return await get_cached_picks_response(tickers)


@router.get("/")
async def get_picks_slash(tickers: Optional[str] = Query(None)):
    return get_picks_response(parse_tickers(tickers))


@router.get("/weekly")
async def get_weekly_picks(tickers: Optional[str] = Query(None, description="Comma-separated tickers")):
    return get_picks_response(parse_tickers(tickers))


@router.get("/scan/{ticker}")
async def scan_single_ticker(ticker: str):
    return scan_single_ticker_result(ticker)
