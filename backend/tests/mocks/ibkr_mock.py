"""Lightweight mock IBKR server for integration tests.

The real backend provider will talk to IB Gateway through ib-async/TCP. This
mock is intentionally simpler: newline-delimited JSON requests over asyncio TCP
that return deterministic, realistic option-chain payloads in the same shape the
Option Helius API already exposes.

Supported request examples:
    {"action": "health"}
    {"action": "quote", "ticker": "NVDA"}
    {"action": "expirations", "ticker": "NVDA"}
    {"action": "chain", "ticker": "NVDA", "expiry": "2026-07-17"}
    {"action": "gex", "ticker": "NVDA", "expiry": "2026-07-17"}
    {"action": "iv_surface", "ticker": "NVDA"}
"""

from __future__ import annotations

import asyncio
import json
import math
import time
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

CONTRACT_MULTIPLIER = 100


def _next_monthly_expiries(count: int = 4) -> List[str]:
    """Return deterministic Friday expiries starting from a fixed base date."""

    # Keep tests stable; do not depend on wall-clock time.
    start = date(2026, 7, 17)
    return [(start + timedelta(days=28 * idx)).isoformat() for idx in range(count)]


def _spot_for(ticker: str) -> float:
    spots = {
        "SPY": 550.0,
        "QQQ": 485.0,
        "NVDA": 125.0,
        "AAPL": 210.0,
        "TSLA": 185.0,
    }
    return spots.get(ticker.upper(), 100.0)


def _base_iv_for(ticker: str) -> float:
    ivs = {
        "SPY": 0.18,
        "QQQ": 0.22,
        "NVDA": 0.58,
        "AAPL": 0.28,
        "TSLA": 0.62,
    }
    return ivs.get(ticker.upper(), 0.32)


def _norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def _gamma_shape(spot: float, strike: float, dte: int, iv: float) -> float:
    """Stable gamma-like curve; not a pricing model, but realistic enough."""

    distance = abs(strike - spot) / max(spot, 1.0)
    tenor_scale = max(math.sqrt(max(dte, 1) / 30.0), 0.45)
    return round(0.035 * math.exp(-distance * 18.0) / max(iv, 0.05) / tenor_scale, 6)


def make_mock_quote(ticker: str = "NVDA") -> Dict[str, Any]:
    ticker = ticker.upper()
    spot = _spot_for(ticker)
    return {
        "ticker": ticker,
        "bid": round(spot - 0.02, 2),
        "ask": round(spot + 0.02, 2),
        "last": round(spot, 2),
        "timestamp": 1_781_654_400.0,
        "source": "ibkr_mock",
    }


def make_mock_chain(ticker: str = "NVDA", expiry: Optional[str] = None, strike_radius: int = 8) -> Dict[str, Any]:
    """Return Option Helius-compatible option chain data.

    Shape matches app.models.option.OptionChain:
    {ticker, expiry, options: [{strike, expiry, type, price, delta, gamma, ...}]}
    """

    ticker = ticker.upper()
    expiry = expiry or _next_monthly_expiries(1)[0]
    spot = _spot_for(ticker)
    base_iv = _base_iv_for(ticker)
    step = 5.0 if spot >= 150 else 2.5
    atm = round(spot / step) * step
    strikes = [round(atm + (idx * step), 2) for idx in range(-strike_radius, strike_radius + 1)]

    try:
        dte = max((date.fromisoformat(expiry) - date(2026, 6, 17)).days, 1)
    except ValueError:
        dte = 30

    options: List[Dict[str, Any]] = []
    for strike in strikes:
        moneyness = (strike - spot) / max(spot, 1.0)
        skew = 1.0 + (0.28 * max(-moneyness, 0.0)) + (0.12 * abs(moneyness))
        iv = round(base_iv * skew * (1.0 + min(dte, 180) / 1800.0), 4)
        gamma = _gamma_shape(spot, strike, dte, iv)
        call_delta = round(_norm_cdf(-moneyness * 9.0), 4)
        put_delta = round(call_delta - 1.0, 4)
        extrinsic = spot * iv * math.sqrt(dte / 365.0) * 0.035

        call_mid = max(0.15, max(spot - strike, 0.0) + extrinsic * math.exp(-max(moneyness, 0) * 5))
        put_mid = max(0.15, max(strike - spot, 0.0) + extrinsic * math.exp(-max(-moneyness, 0) * 5))
        oi_base = int(850 + 4_500 * math.exp(-abs(moneyness) * 14.0))
        vol_base = int(120 + 1_800 * math.exp(-abs(moneyness) * 18.0))

        options.append(
            {
                "strike": strike,
                "expiry": expiry,
                "type": "call",
                "price": round(call_mid, 2),
                "bid": round(max(call_mid - 0.04, 0.01), 2),
                "ask": round(call_mid + 0.04, 2),
                "delta": call_delta,
                "gamma": gamma,
                "theta": round(-0.015 * call_mid, 4),
                "vega": round(0.08 * spot * math.sqrt(dte / 365.0) * math.exp(-abs(moneyness) * 8.0), 4),
                "oi": oi_base,
                "volume": vol_base,
                "iv": iv,
                "modelGreeks": {"delta": call_delta, "gamma": gamma, "impliedVol": iv},
            }
        )
        options.append(
            {
                "strike": strike,
                "expiry": expiry,
                "type": "put",
                "price": round(put_mid, 2),
                "bid": round(max(put_mid - 0.04, 0.01), 2),
                "ask": round(put_mid + 0.04, 2),
                "delta": put_delta,
                "gamma": gamma,
                "theta": round(-0.017 * put_mid, 4),
                "vega": round(0.085 * spot * math.sqrt(dte / 365.0) * math.exp(-abs(moneyness) * 8.0), 4),
                "oi": int(oi_base * (1.05 if strike < spot else 0.9)),
                "volume": int(vol_base * (1.1 if strike < spot else 0.85)),
                "iv": iv,
                "modelGreeks": {"delta": put_delta, "gamma": gamma, "impliedVol": iv},
            }
        )

    return {
        "ticker": ticker,
        "expiry": expiry,
        "spot": round(spot, 2),
        "source": "ibkr_mock",
        "options": options,
    }


def make_mock_gex(ticker: str = "NVDA", expiry: Optional[str] = None) -> List[Dict[str, float]]:
    chain = make_mock_chain(ticker, expiry)
    spot = float(chain["spot"])
    gex_by_strike: Dict[float, float] = {}
    for option in chain["options"]:
        sign = 1 if option["type"] == "call" else -1
        gex = sign * option["gamma"] * option["oi"] * spot * spot * 0.01 * CONTRACT_MULTIPLIER
        gex_by_strike[option["strike"]] = gex_by_strike.get(option["strike"], 0.0) + gex
    return [{"strike": strike, "gex": round(value / 1_000_000, 4)} for strike, value in sorted(gex_by_strike.items())]


def make_mock_iv_surface(ticker: str = "NVDA") -> List[Dict[str, float]]:
    ticker = ticker.upper()
    spot = _spot_for(ticker)
    base_iv = _base_iv_for(ticker)
    dtes = [7, 14, 30, 45, 60, 90]
    step = 5.0 if spot >= 150 else 2.5
    atm = round(spot / step) * step
    strikes = [round(atm + idx * step, 2) for idx in range(-6, 7)]
    points: List[Dict[str, float]] = []
    for dte in dtes:
        term = 1.0 + dte / 900.0
        for strike in strikes:
            distance = abs(strike - spot) / max(spot, 1.0)
            points.append({"strike": strike, "dte": dte, "iv": round(base_iv * term * (1 + distance * 0.65), 4)})
    return points


@dataclass
class MockIBKRServer:
    """Tiny newline-delimited JSON TCP server for IBKR provider tests."""

    host: str = "127.0.0.1"
    port: int = 0
    account: str = "DU1234567"
    _server: Optional[asyncio.base_events.Server] = field(default=None, init=False, repr=False)

    @property
    def bound_port(self) -> int:
        if not self._server or not self._server.sockets:
            return self.port
        return int(self._server.sockets[0].getsockname()[1])

    async def start(self) -> "MockIBKRServer":
        self._server = await asyncio.start_server(self._handle_client, self.host, self.port)
        return self

    async def stop(self) -> None:
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            self._server = None

    async def __aenter__(self) -> "MockIBKRServer":
        return await self.start()

    async def __aexit__(self, *_exc: object) -> None:
        await self.stop()

    async def _handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        try:
            while not reader.at_eof():
                line = await reader.readline()
                if not line:
                    break
                response = self.handle_request(json.loads(line.decode("utf-8")))
                writer.write(json.dumps(response, separators=(",", ":")).encode("utf-8") + b"\n")
                await writer.drain()
        finally:
            writer.close()
            await writer.wait_closed()

    def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        action = str(request.get("action", "health")).lower()
        ticker = str(request.get("ticker", "NVDA")).upper()
        expiry = request.get("expiry")

        if action == "health":
            return {
                "ok": True,
                "connected": True,
                "account": self.account,
                "subscriptions": 0,
                "server_time": 1_781_654_400.0,
                "source": "ibkr_mock",
            }
        if action == "quote":
            return {"ok": True, "data": make_mock_quote(ticker)}
        if action == "expirations":
            return {"ok": True, "ticker": ticker, "expirations": _next_monthly_expiries()}
        if action == "chain":
            return {"ok": True, "data": make_mock_chain(ticker, expiry, int(request.get("strike_radius", 8)))}
        if action == "gex":
            return {"ok": True, "ticker": ticker, "expiry": expiry, "data": make_mock_gex(ticker, expiry)}
        if action == "iv_surface":
            return {"ok": True, "ticker": ticker, "data": make_mock_iv_surface(ticker)}

        return {"ok": False, "error": f"unsupported action: {action}", "source": "ibkr_mock"}


async def request_mock_ibkr(host: str, port: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience client for tests."""

    reader, writer = await asyncio.open_connection(host, port)
    try:
        writer.write(json.dumps(payload).encode("utf-8") + b"\n")
        await writer.drain()
        line = await reader.readline()
        return json.loads(line.decode("utf-8"))
    finally:
        writer.close()
        await writer.wait_closed()
