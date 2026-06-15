"""
Market data service using yfinance + AlphaVantage fallback.
Provides real options chain, Greeks, IV, OI, IV Rank, IV Percentile,
Max Pain, GEX for any ticker. Redis-cached with 5-minute TTL.
"""
import yfinance as yf
import numpy as np
from datetime import datetime, date
from typing import Optional
import logging
import asyncio
import json

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _safe_float(val, default: float = 0.0) -> float:
    try:
        v = float(val)
        return default if (np.isnan(v) or np.isinf(v)) else v
    except Exception:
        return default


def _safe_int(val, default: int = 0) -> int:
    try:
        return int(val) if val is not None else default
    except Exception:
        return default


# ---------------------------------------------------------------------------
# In-process simple cache (fallback when Redis unavailable)
# ---------------------------------------------------------------------------
_local_cache: dict = {}

def _cache_get(key: str):
    import time
    entry = _local_cache.get(key)
    if entry and (time.time() - entry["ts"]) < entry["ttl"]:
        return entry["data"]
    return None

def _cache_set(key: str, data, ttl: int = 300):
    import time
    _local_cache[key] = {"data": data, "ts": time.time(), "ttl": ttl}


async def _redis_get(key: str):
    try:
        from ..core.cache import get_cached
        return await get_cached(key)
    except Exception:
        return _cache_get(key)


async def _redis_set(key: str, data, ttl: int = 300):
    try:
        from ..core.cache import set_cached
        await set_cached(key, data, ttl)
    except Exception:
        _cache_set(key, data, ttl)


# ---------------------------------------------------------------------------
# Core yfinance helpers
# ---------------------------------------------------------------------------

def get_expirations(ticker: str) -> list:
    try:
        t = yf.Ticker(ticker)
        return list(t.options)
    except Exception as e:
        logger.error(f"get_expirations {ticker}: {e}")
        return []


def get_spot_price(ticker: str) -> float:
    try:
        t = yf.Ticker(ticker)
        info = t.fast_info
        price = getattr(info, "last_price", None)
        if price is None:
            price = getattr(info, "lastPrice", None)
        return _safe_float(price)
    except Exception:
        try:
            hist = yf.Ticker(ticker).history(period="2d")
            if not hist.empty:
                return _safe_float(hist["Close"].iloc[-1])
        except Exception:
            pass
        return 0.0


# ---------------------------------------------------------------------------
# Max Pain calculation (OI-weighted)
# ---------------------------------------------------------------------------

def _calculate_max_pain(calls_df, puts_df) -> float:
    """
    Max pain = strike at which total value destroyed for option buyers is minimized
    (i.e., total dollar loss for all option holders at expiry).
    """
    try:
        all_strikes = sorted(set(
            calls_df["strike"].tolist() + puts_df["strike"].tolist()
        ))
        if not all_strikes:
            return 0.0

        min_pain = float("inf")
        max_pain_strike = all_strikes[0]

        for s in all_strikes:
            # Call pain: all calls with strike < s expire ITM → writers pay
            # Writer's loss at price s = sum over strike K < s of: OI(K) * (s - K) * 100
            call_pain = 0.0
            for _, row in calls_df[calls_df["strike"] < s].iterrows():
                oi = _safe_float(row.get("openInterest", 0))
                k = _safe_float(row.get("strike", 0))
                call_pain += oi * (s - k) * 100

            # Put pain: all puts with strike > s expire ITM → writers pay
            put_pain = 0.0
            for _, row in puts_df[puts_df["strike"] > s].iterrows():
                oi = _safe_float(row.get("openInterest", 0))
                k = _safe_float(row.get("strike", 0))
                put_pain += oi * (k - s) * 100

            total_pain = call_pain + put_pain
            if total_pain < min_pain:
                min_pain = total_pain
                max_pain_strike = s

        return float(max_pain_strike)
    except Exception as e:
        logger.error(f"_calculate_max_pain: {e}")
        return 0.0


# ---------------------------------------------------------------------------
# GEX calculation
# ---------------------------------------------------------------------------

def _bsm_gamma(S: float, K: float, T: float, sigma: float, r: float = 0.05) -> float:
    """Calculate BSM gamma. Used when yfinance doesn't provide gamma."""
    try:
        if T <= 0 or sigma <= 0 or S <= 0:
            return 0.0
        from scipy.stats import norm
        d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        return float(norm.pdf(d1) / (S * sigma * np.sqrt(T)))
    except Exception:
        return 0.0


def _calculate_gex(calls_df, puts_df, spot: float, expiry: Optional[str] = None) -> list:
    """
    GEX per strike (in $M).
    Call GEX = +gamma * OI * spot^2 * 0.01 * 100
    Put  GEX = -gamma * OI * spot^2 * 0.01 * 100
    Uses BSM to calculate gamma when yfinance returns zero.
    """
    gex_by_strike: dict = {}

    # Calculate DTE for BSM gamma
    dte_years = 0.0
    if expiry:
        try:
            exp_date = datetime.strptime(expiry, "%Y-%m-%d").date()
            dte_days = (exp_date - date.today()).days
            dte_years = max(dte_days / 365.0, 1/365.0)
        except Exception:
            dte_years = 30 / 365.0
    else:
        dte_years = 30 / 365.0

    for _, row in calls_df.iterrows():
        s = _safe_float(row.get("strike"))
        if s <= 0:
            continue
        gamma = _safe_float(row.get("gamma"))
        # Fallback to BSM gamma if zero
        if gamma == 0.0:
            iv = _safe_float(row.get("impliedVolatility"), 0.3)
            if iv > 0:
                gamma = _bsm_gamma(spot, s, dte_years, iv)
        oi = _safe_float(row.get("openInterest"))
        gex = gamma * oi * spot * spot * 0.01 * 100
        gex_by_strike[s] = gex_by_strike.get(s, 0) + gex

    for _, row in puts_df.iterrows():
        s = _safe_float(row.get("strike"))
        if s <= 0:
            continue
        gamma = _safe_float(row.get("gamma"))
        # Fallback to BSM gamma if zero
        if gamma == 0.0:
            iv = _safe_float(row.get("impliedVolatility"), 0.3)
            if iv > 0:
                gamma = _bsm_gamma(spot, s, dte_years, iv)
        oi = _safe_float(row.get("openInterest"))
        gex = -gamma * oi * spot * spot * 0.01 * 100
        gex_by_strike[s] = gex_by_strike.get(s, 0) + gex

    return [{"strike": k, "gex": round(v / 1e6, 4)} for k, v in sorted(gex_by_strike.items())]


# ---------------------------------------------------------------------------
# IV Rank & IV Percentile (based on 1-year historical ATM IV)
# ---------------------------------------------------------------------------

def _get_historical_iv(ticker: str, lookback_days: int = 252) -> list:
    """
    Approximate historical IV using daily returns volatility (realized vol proxy).
    Returns list of daily IV approximations for the past lookback_days.
    """
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period="1y")
        if hist.empty or len(hist) < 20:
            return []
        closes = hist["Close"].dropna()
        # rolling 21-day realized vol as IV proxy
        log_returns = np.log(closes / closes.shift(1)).dropna()
        rolling_vol = log_returns.rolling(21).std() * np.sqrt(252)
        return rolling_vol.dropna().tolist()
    except Exception as e:
        logger.error(f"_get_historical_iv {ticker}: {e}")
        return []


def get_iv_rank_percentile(ticker: str, current_iv: float) -> dict:
    """
    Calculate IV Rank and IV Percentile from 1-year historical IV.
    IV Rank = (current_iv - min_iv) / (max_iv - min_iv) * 100
    IV Percentile = % of days when IV was below current_iv
    """
    try:
        hist_ivs = _get_historical_iv(ticker)
        if not hist_ivs or len(hist_ivs) < 20:
            return {"iv_rank": 50.0, "iv_percentile": 50.0, "iv_52w_high": current_iv, "iv_52w_low": current_iv}

        iv_min = float(np.min(hist_ivs))
        iv_max = float(np.max(hist_ivs))

        if iv_max <= iv_min:
            return {"iv_rank": 50.0, "iv_percentile": 50.0, "iv_52w_high": round(iv_max, 4), "iv_52w_low": round(iv_min, 4)}

        iv_rank = (current_iv - iv_min) / (iv_max - iv_min) * 100
        iv_rank = float(np.clip(iv_rank, 0, 100))

        iv_percentile = float(np.mean(np.array(hist_ivs) < current_iv)) * 100

        return {
            "iv_rank": round(iv_rank, 1),
            "iv_percentile": round(iv_percentile, 1),
            "iv_52w_high": round(iv_max, 4),
            "iv_52w_low": round(iv_min, 4),
        }
    except Exception as e:
        logger.error(f"get_iv_rank_percentile {ticker}: {e}")
        return {"iv_rank": 50.0, "iv_percentile": 50.0, "iv_52w_high": current_iv, "iv_52w_low": current_iv}


# ---------------------------------------------------------------------------
# Public API: get_options_chain
# ---------------------------------------------------------------------------

def get_options_chain(ticker: str, expiry: Optional[str] = None) -> dict:
    """
    Returns full options chain for a given ticker and expiry.
    If expiry is None, uses the nearest expiration.
    Sync wrapper — uses local cache.
    """
    cache_key = f"chain:{ticker.upper()}:{expiry}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    try:
        t = yf.Ticker(ticker)
        expirations = t.options
        if not expirations:
            # AlphaVantage fallback
            from .alphavantage import av_get_options_chain
            result = av_get_options_chain(ticker)
            _cache_set(cache_key, result, ttl=300)
            return result

        if expiry is None or expiry not in expirations:
            expiry = expirations[0]

        chain = t.option_chain(expiry)
        spot = get_spot_price(ticker)

        options = []

        for _, row in chain.calls.iterrows():
            options.append({
                "strike": _safe_float(row.get("strike")),
                "expiry": expiry,
                "type": "call",
                "bid": _safe_float(row.get("bid")),
                "ask": _safe_float(row.get("ask")),
                "price": _safe_float(row.get("lastPrice")),
                "iv": _safe_float(row.get("impliedVolatility")),
                "delta": _safe_float(row.get("delta")),
                "gamma": _safe_float(row.get("gamma")),
                "theta": _safe_float(row.get("theta")),
                "vega": _safe_float(row.get("vega")),
                "oi": _safe_int(row.get("openInterest")),
                "volume": _safe_int(row.get("volume")),
                "in_the_money": bool(row.get("inTheMoney", False)),
                "contract_symbol": str(row.get("contractSymbol", "")),
            })

        for _, row in chain.puts.iterrows():
            options.append({
                "strike": _safe_float(row.get("strike")),
                "expiry": expiry,
                "type": "put",
                "bid": _safe_float(row.get("bid")),
                "ask": _safe_float(row.get("ask")),
                "price": _safe_float(row.get("lastPrice")),
                "iv": _safe_float(row.get("impliedVolatility")),
                "delta": _safe_float(row.get("delta")),
                "gamma": _safe_float(row.get("gamma")),
                "theta": _safe_float(row.get("theta")),
                "vega": _safe_float(row.get("vega")),
                "oi": _safe_int(row.get("openInterest")),
                "volume": _safe_int(row.get("volume")),
                "in_the_money": bool(row.get("inTheMoney", False)),
                "contract_symbol": str(row.get("contractSymbol", "")),
            })

        # IV rank from ATM IV
        strikes = sorted(set(chain.calls["strike"].tolist()))
        atm_strike = min(strikes, key=lambda x: abs(x - spot)) if strikes else spot
        atm_iv_series = chain.calls[chain.calls["strike"] == atm_strike]["impliedVolatility"].values
        atm_iv = _safe_float(atm_iv_series[0]) if len(atm_iv_series) > 0 else 0.3
        iv_stats = get_iv_rank_percentile(ticker, atm_iv)

        # Max pain
        max_pain = _calculate_max_pain(chain.calls, chain.puts)

        result = {
            "ticker": ticker.upper(),
            "expiry": expiry,
            "spot": round(spot, 2),
            "options": options,
            "expirations": list(expirations),
            "iv_rank": iv_stats["iv_rank"],
            "iv_percentile": iv_stats["iv_percentile"],
            "iv_52w_high": iv_stats["iv_52w_high"],
            "iv_52w_low": iv_stats["iv_52w_low"],
            "max_pain": max_pain,
            "atm_iv": round(atm_iv, 4),
        }
        _cache_set(cache_key, result, ttl=300)
        return result

    except Exception as e:
        logger.error(f"get_options_chain {ticker}/{expiry}: {e}")
        try:
            from .alphavantage import av_get_options_chain
            return av_get_options_chain(ticker)
        except Exception as e2:
            logger.error(f"AV fallback failed for {ticker}: {e2}")
        return {"ticker": ticker, "expiry": expiry, "options": [], "error": str(e)}


# ---------------------------------------------------------------------------
# Public API: get_summary
# ---------------------------------------------------------------------------

def get_summary(ticker: str) -> dict:
    """
    Returns IV rank, IV percentile, PCR, max pain, expected move, GEX summary.
    """
    cache_key = f"summary:{ticker.upper()}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    try:
        t = yf.Ticker(ticker)
        expirations = t.options
        if not expirations:
            # Try FlashAlpha for single stocks
            try:
                from .flashalpha import fa_get_summary, fa_is_supported
                if fa_is_supported(ticker.upper()):
                    fa_summary = fa_get_summary(ticker.upper())
                    if fa_summary:
                        return fa_summary
            except Exception:
                pass
            try:
                from .alphavantage import av_get_summary
                return av_get_summary(ticker)
            except Exception:
                return {"ticker": ticker, "error": "no options data"}

        expiry = expirations[0]
        chain = t.option_chain(expiry)
        spot = get_spot_price(ticker)

        calls = chain.calls
        puts = chain.puts

        # PCR
        call_vol = _safe_float(calls["volume"].fillna(0).sum())
        put_vol = _safe_float(puts["volume"].fillna(0).sum())
        call_oi = _safe_float(calls["openInterest"].fillna(0).sum())
        put_oi = _safe_float(puts["openInterest"].fillna(0).sum())
        pcr_volume = round(put_vol / call_vol, 3) if call_vol > 0 else 1.0
        pcr_oi = round(put_oi / call_oi, 3) if call_oi > 0 else 1.0

        # Max Pain
        max_pain_strike = _calculate_max_pain(calls, puts)

        # Expected move from ATM straddle
        all_strikes = sorted(set(calls["strike"].tolist() + puts["strike"].tolist()))
        atm_strike = min(all_strikes, key=lambda x: abs(x - spot)) if all_strikes else spot

        atm_call = calls[calls["strike"] == atm_strike]["lastPrice"].values
        atm_put = puts[puts["strike"] == atm_strike]["lastPrice"].values
        atm_call_price = _safe_float(atm_call[0]) if len(atm_call) > 0 else 0
        atm_put_price = _safe_float(atm_put[0]) if len(atm_put) > 0 else 0
        expected_move = atm_call_price + atm_put_price
        expected_move_pct = round(expected_move / spot * 100, 2) if spot > 0 else 0

        # ATM IV
        atm_iv_series = calls[calls["strike"] == atm_strike]["impliedVolatility"].values
        atm_iv = _safe_float(atm_iv_series[0]) if len(atm_iv_series) > 0 else 0.3

        # IV Rank & Percentile
        iv_stats = get_iv_rank_percentile(ticker, atm_iv)

        # GEX summary (net)
        gex_data = _calculate_gex(calls, puts, spot, expiry)
        net_gex = round(sum(g["gex"] for g in gex_data), 2)

        result = {
            "ticker": ticker.upper(),
            "spot": round(spot, 2),
            "expiry": expiry,
            "expected_move": f"±${round(expected_move, 2)} ({expected_move_pct}%)",
            "expected_move_dollar": round(expected_move, 2),
            "expected_move_pct": expected_move_pct,
            "max_pain": max_pain_strike,
            "max_pain_distance_pct": round((max_pain_strike - spot) / spot * 100, 2) if spot > 0 else 0,
            "pcr_volume": pcr_volume,
            "pcr_oi": pcr_oi,
            "atm_iv": round(atm_iv, 4),
            "iv_rank": iv_stats["iv_rank"],
            "iv_percentile": iv_stats["iv_percentile"],
            "iv_52w_high": iv_stats["iv_52w_high"],
            "iv_52w_low": iv_stats["iv_52w_low"],
            "net_gex_millions": net_gex,
            "call_volume": int(call_vol),
            "put_volume": int(put_vol),
            "call_oi": int(call_oi),
            "put_oi": int(put_oi),
        }
        _cache_set(cache_key, result, ttl=300)
        return result

    except Exception as e:
        logger.error(f"get_summary {ticker}: {e}")
        return {"ticker": ticker, "error": str(e)}


# ---------------------------------------------------------------------------
# Public API: get_gex
# ---------------------------------------------------------------------------

def get_gex(ticker: str, expiry: Optional[str] = None) -> list:
    """
    Gamma Exposure (GEX) by strike.
    GEX = gamma * OI * spot^2 * 0.01 * contract_multiplier
    Returns list of {"strike": ..., "gex": ... (in $M)}

    For single stocks: tries FlashAlpha first (pre-computed, more accurate).
    For ETFs (SPY, QQQ, etc.) or on FA quota exceeded: falls back to yfinance.
    """
    cache_key = f"gex:{ticker.upper()}:{expiry}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    # --- FlashAlpha path (single stocks only, Free plan) ---
    try:
        from .flashalpha import fa_get_gex, fa_is_supported
        if fa_is_supported(ticker.upper()):
            fa_result = fa_get_gex(ticker.upper(), expiration=expiry)
            if fa_result:
                # Convert FlashAlpha format to internal format
                result = [
                    {
                        "strike": s["strike"],
                        "gex": round(s["net_gex"] / 1_000_000, 4),  # normalize to $M
                        "call_gex": round(s["call_gex"] / 1_000_000, 4),
                        "put_gex": round(s["put_gex"] / 1_000_000, 4),
                        "call_oi": s.get("call_oi", 0),
                        "put_oi": s.get("put_oi", 0),
                        "call_volume": s.get("call_volume", 0),
                        "put_volume": s.get("put_volume", 0),
                        "source": "flashalpha",
                    }
                    for s in fa_result
                ]
                _cache_set(cache_key, result, ttl=300)
                logger.info(f"get_gex {ticker}: using FlashAlpha ({len(result)} strikes)")
                return result
    except Exception as e:
        logger.warning(f"FlashAlpha GEX failed for {ticker}, falling back to yfinance: {e}")

    # --- yfinance fallback ---
    try:
        t = yf.Ticker(ticker)
        expirations = t.options
        if not expirations:
            return []

        expiry = expiry or expirations[0]
        if expiry not in expirations:
            expiry = expirations[0]

        chain = t.option_chain(expiry)
        spot = get_spot_price(ticker)

        result = _calculate_gex(chain.calls, chain.puts, spot, expiry)
        _cache_set(cache_key, result, ttl=300)
        return result

    except Exception as e:
        logger.error(f"get_gex {ticker}: {e}")
        return []


# ---------------------------------------------------------------------------
# Public API: get_iv_surface
# ---------------------------------------------------------------------------

def get_iv_surface(ticker: str) -> list:
    """
    IV surface across all available expirations × strikes.
    Returns list of {strike, dte, iv, type}.
    """
    cache_key = f"iv_surface:{ticker.upper()}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    try:
        t = yf.Ticker(ticker)
        expirations = t.options
        if not expirations:
            return []

        today = date.today()
        points = []

        # Limit to first 8 expirations to avoid rate limiting
        for exp in expirations[:8]:
            try:
                exp_date = datetime.strptime(exp, "%Y-%m-%d").date()
                dte = (exp_date - today).days
                if dte < 1:
                    continue
                chain = t.option_chain(exp)

                for _, row in chain.calls.iterrows():
                    iv = _safe_float(row.get("impliedVolatility"))
                    if iv > 0.01:
                        points.append({
                            "strike": _safe_float(row.get("strike")),
                            "dte": dte,
                            "iv": round(iv, 4),
                            "type": "call",
                        })

                for _, row in chain.puts.iterrows():
                    iv = _safe_float(row.get("impliedVolatility"))
                    if iv > 0.01:
                        points.append({
                            "strike": _safe_float(row.get("strike")),
                            "dte": dte,
                            "iv": round(iv, 4),
                            "type": "put",
                        })
            except Exception:
                continue

        _cache_set(cache_key, points, ttl=600)
        return points

    except Exception as e:
        logger.error(f"get_iv_surface {ticker}: {e}")
        return []


# ---------------------------------------------------------------------------
# Async versions (for router use with Redis)
# ---------------------------------------------------------------------------

async def async_get_options_chain(ticker: str, expiry: Optional[str] = None) -> dict:
    cache_key = f"chain:{ticker.upper()}:{expiry}"
    cached = await _redis_get(cache_key)
    if cached:
        return cached
    result = get_options_chain(ticker, expiry)
    await _redis_set(cache_key, result, 300)
    return result


async def async_get_summary(ticker: str) -> dict:
    cache_key = f"summary:{ticker.upper()}"
    cached = await _redis_get(cache_key)
    if cached:
        return cached
    result = get_summary(ticker)
    await _redis_set(cache_key, result, 300)
    return result


async def async_get_gex(ticker: str, expiry: Optional[str] = None) -> list:
    cache_key = f"gex:{ticker.upper()}:{expiry}"
    cached = await _redis_get(cache_key)
    if cached:
        return cached
    result = get_gex(ticker, expiry)
    await _redis_set(cache_key, result, 300)
    return result


async def async_get_iv_surface(ticker: str) -> list:
    cache_key = f"iv_surface:{ticker.upper()}"
    cached = await _redis_get(cache_key)
    if cached:
        return cached
    result = get_iv_surface(ticker)
    await _redis_set(cache_key, result, 600)
    return result
