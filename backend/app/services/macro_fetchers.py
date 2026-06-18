import asyncio
import logging
import httpx
import pandas as pd
import yfinance as yf
from typing import Optional, Any
from app.core.config import get_settings

logger = logging.getLogger(__name__)

async def fetch_yfinance(ticker: str, period: str = "5d", key: str = "Close") -> Optional[float]:
    """Thin async wrapper around yf.download."""
    try:
        # yfinance download is blocking, run in thread
        data = await asyncio.to_thread(yf.download, ticker, period=period, progress=False)
        if data.empty:
            return None
        return float(data[key].iloc[-1])
    except Exception as exc:
        logger.error(f"Error fetching yfinance for {ticker}: {exc}")
        return None

async def fetch_fred(series_id: str) -> Optional[float]:
    """Fetch data from FRED using fredapi or public CSV fallback."""
    settings = get_settings()
    
    # Try using fredapi if key exists
    if settings.fred_api_key:
        try:
            from fredapi import Fred
            fred = Fred(api_key=settings.fred_api_key)
            data = await asyncio.to_thread(fred.get_series, series_id)
            if not data.empty:
                return float(data.iloc[-1])
        except Exception as exc:
            logger.warning(f"FRED API fetch failed for {series_id}, falling back to CSV: {exc}")

    # Fallback to public CSV
    try:
        url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            resp.raise_for_status()
            df = pd.read_csv(httpx.io.BytesIO(resp.content))
            if not df.empty:
                return float(df.iloc[-1, 1])
    except Exception as exc:
        logger.error(f"FRED CSV fallback failed for {series_id}: {exc}")
        return None

async def fetch_http_json(url: str, path: str = None) -> Optional[Any]:
    """GET + optional jq-style key path."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            if path:
                for key in path.split('.'):
                    data = data[key]
            return data
    except Exception as exc:
        logger.error(f"Error fetching JSON from {url}: {exc}")
        return None

async def fetch_http_csv(url: str, col_index: int = 0, row_index: int = -1) -> Optional[Any]:
    """GET CSV, return cell value."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
            df = pd.read_csv(httpx.io.BytesIO(resp.content))
            if not df.empty:
                return df.iloc[row_index, col_index]
    except Exception as exc:
        logger.error(f"Error fetching CSV from {url}: {exc}")
        return None
