"""
AlphaVantage integration — fallback data source when yfinance rate-limits.
API docs: https://www.alphavantage.co/documentation/
"""
import os
import requests
import logging
from typing import Optional
from datetime import datetime, date

logger = logging.getLogger(__name__)

AV_API_KEY = os.getenv("ALPHAVANTAGE_API_KEY", "4ZVBTAERBE2N4AUG")
AV_BASE_URL = "https://www.alphavantage.co/query"

_av_session = requests.Session()
_av_session.headers.update({"User-Agent": "OptionsHelius/1.0"})


def _av_get(params: dict, timeout: int = 15) -> dict:
    """Make a GET request to AlphaVantage API with error handling."""
    try:
        params["apikey"] = AV_API_KEY
        resp = _av_session.get(AV_BASE_URL, params=params, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        if "Note" in data:
            logger.warning(f"AlphaVantage rate limit: {data['Note']}")
            return {}
        if "Information" in data:
            logger.warning(f"AlphaVantage info: {data['Information']}")
            return {}
        return data
    except requests.Timeout:
        logger.error(f"AlphaVantage timeout: {params}")
        return {}
    except requests.RequestException as e:
        logger.error(f"AlphaVantage request error: {e}")
        return {}
    except Exception as e:
        logger.error(f"AlphaVantage unexpected error: {e}")
        return {}


def av_get_quote(ticker: str) -> dict:
    """
    Get real-time quote for a ticker via AlphaVantage GLOBAL_QUOTE.
    Returns {"price": float, "change": float, "change_pct": float, ...}
    """
    data = _av_get({"function": "GLOBAL_QUOTE", "symbol": ticker})
    quote = data.get("Global Quote", {})
    if not quote:
        return {"price": 0.0, "error": "no data"}
    try:
        return {
            "ticker": ticker.upper(),
            "price": float(quote.get("05. price", 0) or 0),
            "change": float(quote.get("09. change", 0) or 0),
            "change_pct": float((quote.get("10. change percent", "0%") or "0%").replace("%", "")),
            "volume": int(float(quote.get("06. volume", 0) or 0)),
            "prev_close": float(quote.get("08. previous close", 0) or 0),
            "open": float(quote.get("02. open", 0) or 0),
            "high": float(quote.get("03. high", 0) or 0),
            "low": float(quote.get("04. low", 0) or 0),
            "latest_trading_day": quote.get("07. latest trading day", ""),
        }
    except Exception as e:
        logger.error(f"av_get_quote parse error {ticker}: {e}")
        return {"ticker": ticker, "price": 0.0, "error": str(e)}


def av_get_options_chain(ticker: str, date_str: Optional[str] = None) -> dict:
    """
    Get options chain from AlphaVantage REALTIME_OPTIONS endpoint.
    Note: This endpoint requires a premium AV subscription.
    Returns standardized dict matching yfinance format.
    """
    params = {"function": "REALTIME_OPTIONS", "symbol": ticker, "require_premium": "true"}
    if date_str:
        params["date"] = date_str

    data = _av_get(params)

    if not data or "data" not in data:
        logger.warning(f"AlphaVantage options unavailable for {ticker}, returning empty chain")
        return {
            "ticker": ticker.upper(),
            "expiry": date_str or "",
            "spot": av_get_quote(ticker).get("price", 0.0),
            "options": [],
            "expirations": [],
            "error": "AlphaVantage options requires premium plan",
            "source": "alphavantage",
        }

    options = []
    spot = 0.0
    expirations_set = set()

    try:
        for item in data.get("data", []):
            try:
                strike = float(item.get("strike", 0) or 0)
                exp = item.get("expiration", "")
                opt_type = item.get("type", "").lower()
                if exp:
                    expirations_set.add(exp)

                bid = float(item.get("bid", 0) or 0)
                ask = float(item.get("ask", 0) or 0)
                last = float(item.get("last", 0) or 0)
                iv = float(item.get("implied_volatility", 0) or 0)
                delta = float(item.get("delta", 0) or 0)
                gamma = float(item.get("gamma", 0) or 0)
                theta = float(item.get("theta", 0) or 0)
                vega = float(item.get("vega", 0) or 0)
                oi = int(float(item.get("open_interest", 0) or 0))
                volume = int(float(item.get("volume", 0) or 0))

                underlying = float(item.get("underlying_price", 0) or 0)
                if underlying > 0:
                    spot = underlying

                itm = (opt_type == "call" and underlying > 0 and strike < underlying) or \
                      (opt_type == "put" and underlying > 0 and strike > underlying)

                options.append({
                    "strike": strike,
                    "expiry": exp,
                    "type": opt_type,
                    "bid": bid,
                    "ask": ask,
                    "price": last,
                    "iv": iv,
                    "delta": delta,
                    "gamma": gamma,
                    "theta": theta,
                    "vega": vega,
                    "oi": oi,
                    "volume": volume,
                    "in_the_money": bool(itm),
                    "contract_symbol": item.get("contract_id", ""),
                })
            except Exception:
                continue

        if spot == 0.0:
            quote = av_get_quote(ticker)
            spot = quote.get("price", 0.0)

    except Exception as e:
        logger.error(f"av_get_options_chain parse {ticker}: {e}")

    return {
        "ticker": ticker.upper(),
        "expiry": date_str or (sorted(expirations_set)[0] if expirations_set else ""),
        "spot": round(spot, 2),
        "options": options,
        "expirations": sorted(expirations_set),
        "source": "alphavantage",
    }


def av_get_summary(ticker: str) -> dict:
    """
    Build a summary dict from AlphaVantage data.
    Falls back to quote data when full options aren't available.
    """
    quote = av_get_quote(ticker)
    spot = quote.get("price", 0.0)

    chain = av_get_options_chain(ticker)
    options = chain.get("options", [])

    calls = [o for o in options if o.get("type") == "call"]
    puts = [o for o in options if o.get("type") == "put"]

    # PCR
    call_vol = sum(o.get("volume", 0) for o in calls)
    put_vol = sum(o.get("volume", 0) for o in puts)
    call_oi = sum(o.get("oi", 0) for o in calls)
    put_oi = sum(o.get("oi", 0) for o in puts)
    pcr_volume = round(put_vol / call_vol, 3) if call_vol > 0 else 1.0
    pcr_oi = round(put_oi / call_oi, 3) if call_oi > 0 else 1.0

    return {
        "ticker": ticker.upper(),
        "spot": round(spot, 2),
        "expiry": chain.get("expiry", ""),
        "expected_move": "N/A",
        "expected_move_dollar": 0.0,
        "expected_move_pct": 0.0,
        "max_pain": spot,
        "max_pain_distance_pct": 0.0,
        "pcr_volume": pcr_volume,
        "pcr_oi": pcr_oi,
        "atm_iv": 0.30,
        "iv_rank": 50.0,
        "iv_percentile": 50.0,
        "iv_52w_high": 0.0,
        "iv_52w_low": 0.0,
        "net_gex_millions": 0.0,
        "call_volume": call_vol,
        "put_volume": put_vol,
        "call_oi": call_oi,
        "put_oi": put_oi,
        "source": "alphavantage",
    }


def av_get_historical_daily(ticker: str, outputsize: str = "compact") -> list:
    """
    Get historical daily OHLCV data from AlphaVantage.
    outputsize: "compact" (100 days) or "full" (20+ years)
    Returns list of {"date": ..., "open": ..., "high": ..., "low": ..., "close": ..., "volume": ...}
    """
    data = _av_get({"function": "TIME_SERIES_DAILY", "symbol": ticker, "outputsize": outputsize})
    ts = data.get("Time Series (Daily)", {})
    if not ts:
        return []

    result = []
    for date_str, values in sorted(ts.items(), reverse=True):
        try:
            result.append({
                "date": date_str,
                "open": float(values.get("1. open", 0)),
                "high": float(values.get("2. high", 0)),
                "low": float(values.get("3. low", 0)),
                "close": float(values.get("4. close", 0)),
                "volume": int(float(values.get("5. volume", 0))),
            })
        except Exception:
            continue
    return result


def av_get_overview(ticker: str) -> dict:
    """
    Get fundamental overview from AlphaVantage OVERVIEW endpoint.
    Returns company overview with PE, market cap, beta, etc.
    """
    data = _av_get({"function": "OVERVIEW", "symbol": ticker})
    if not data or "Symbol" not in data:
        return {}
    try:
        return {
            "ticker": data.get("Symbol", ticker),
            "name": data.get("Name", ""),
            "sector": data.get("Sector", ""),
            "industry": data.get("Industry", ""),
            "market_cap": int(float(data.get("MarketCapitalization", 0) or 0)),
            "pe_ratio": float(data.get("PERatio", 0) or 0),
            "beta": float(data.get("Beta", 1.0) or 1.0),
            "52w_high": float(data.get("52WeekHigh", 0) or 0),
            "52w_low": float(data.get("52WeekLow", 0) or 0),
            "forward_pe": float(data.get("ForwardPE", 0) or 0),
            "dividend_yield": float(data.get("DividendYield", 0) or 0),
            "eps": float(data.get("EPS", 0) or 0),
        }
    except Exception as e:
        logger.error(f"av_get_overview parse {ticker}: {e}")
        return {}
