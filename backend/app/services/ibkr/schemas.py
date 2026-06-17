"""Pydantic schemas for IBKR option data.

These models validate IBKR provider output while preserving the existing
option-helius API shape.  The public conversion methods intentionally emit the
same field names used by ``backend/app/models/option.py`` so IBKR can be added
as a primary provider without breaking yfinance/AlphaVantage clients.
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

OptionType = Literal["call", "put"]


class IBKRGreeks(BaseModel):
    """IBKR model Greeks for an option contract."""

    delta: float = 0.0
    gamma: float = 0.0
    theta: float = 0.0
    vega: float = 0.0
    iv: float = 0.0
    underlying_price: Optional[float] = None
    timestamp: Optional[float] = None
    source: Literal["ibkr"] = "ibkr"

    @classmethod
    def from_ticker_greeks(cls, greeks: Any, underlying_price: Optional[float] = None, timestamp: Optional[float] = None) -> "IBKRGreeks":
        if greeks is None:
            return cls(underlying_price=underlying_price, timestamp=timestamp)
        return cls(
            delta=_float(getattr(greeks, "delta", 0.0)),
            gamma=_float(getattr(greeks, "gamma", 0.0)),
            theta=_float(getattr(greeks, "theta", 0.0)),
            vega=_float(getattr(greeks, "vega", 0.0)),
            iv=_float(getattr(greeks, "impliedVol", getattr(greeks, "iv", 0.0))),
            underlying_price=underlying_price,
            timestamp=timestamp,
        )


class IBKRQuote(BaseModel):
    """IBKR market quote for an option or underlying."""

    bid: float = 0.0
    ask: float = 0.0
    last: float = 0.0
    price: float = 0.0
    volume: int = 0
    open_interest: int = 0
    source: Literal["ibkr"] = "ibkr"

    @classmethod
    def from_ticker(cls, ticker: Any, option_type: Optional[OptionType] = None) -> "IBKRQuote":
        bid = _float(getattr(ticker, "bid", 0.0))
        ask = _float(getattr(ticker, "ask", 0.0))
        last = _float(getattr(ticker, "last", 0.0))
        mid = round((bid + ask) / 2, 4) if bid > 0 and ask > 0 else 0.0
        volume_attr = "callVolume" if option_type == "call" else "putVolume" if option_type == "put" else "volume"
        oi_attr = "callOpenInterest" if option_type == "call" else "putOpenInterest" if option_type == "put" else "openInterest"
        return cls(
            bid=bid,
            ask=ask,
            last=last,
            price=last or mid,
            volume=_int(getattr(ticker, volume_attr, None) or getattr(ticker, "volume", 0)),
            open_interest=_int(getattr(ticker, oi_attr, None) or getattr(ticker, "openInterest", 0)),
        )


class IBKROptionData(BaseModel):
    """Single option row compatible with existing OptionData responses."""

    strike: float
    expiry: str
    type: OptionType
    price: float = 0.0
    delta: float = 0.0
    gamma: float = 0.0
    theta: float = 0.0
    vega: float = 0.0
    oi: int = 0
    volume: int = 0
    iv: float = 0.0
    bid: float = 0.0
    ask: float = 0.0
    in_the_money: bool = False
    contract_symbol: str = ""
    source: Literal["ibkr"] = "ibkr"

    def to_option_helius(self) -> Dict[str, Any]:
        """Return the existing option-helius option row shape."""
        return {
            "strike": self.strike,
            "expiry": self.expiry,
            "type": self.type,
            "bid": self.bid,
            "ask": self.ask,
            "price": self.price,
            "iv": self.iv,
            "delta": self.delta,
            "gamma": self.gamma,
            "theta": self.theta,
            "vega": self.vega,
            "oi": self.oi,
            "volume": self.volume,
            "in_the_money": self.in_the_money,
            "contract_symbol": self.contract_symbol,
            "source": self.source,
        }

    @classmethod
    def from_option_dict(cls, data: Dict[str, Any]) -> "IBKROptionData":
        return cls(
            strike=_float(data.get("strike")),
            expiry=str(data.get("expiry") or ""),
            type="put" if str(data.get("type", "")).lower().startswith("p") else "call",
            price=_float(data.get("price")),
            delta=_float(data.get("delta")),
            gamma=_float(data.get("gamma")),
            theta=_float(data.get("theta")),
            vega=_float(data.get("vega")),
            oi=_int(data.get("oi")),
            volume=_int(data.get("volume")),
            iv=_float(data.get("iv")),
            bid=_float(data.get("bid")),
            ask=_float(data.get("ask")),
            in_the_money=bool(data.get("in_the_money", False)),
            contract_symbol=str(data.get("contract_symbol") or ""),
        )


class IBKROptionChain(BaseModel):
    """Option chain response compatible with existing OptionChain endpoints."""

    ticker: str
    expiry: str
    options: List[IBKROptionData] = Field(default_factory=list)
    spot: float = 0.0
    expirations: List[str] = Field(default_factory=list)
    atm_iv: float = 0.0
    source: Literal["ibkr"] = "ibkr"

    def to_option_helius(self) -> Dict[str, Any]:
        """Return the dictionary shape used by current routers/services."""
        return {
            "ticker": self.ticker,
            "expiry": self.expiry,
            "spot": self.spot,
            "options": [option.to_option_helius() for option in self.options],
            "expirations": self.expirations,
            "atm_iv": self.atm_iv,
            "source": self.source,
        }

    @classmethod
    def from_fetcher_result(cls, data: Dict[str, Any]) -> "IBKROptionChain":
        options = [IBKROptionData.from_option_dict(item) for item in data.get("options", [])]
        return cls(
            ticker=str(data.get("ticker") or "").upper(),
            expiry=str(data.get("expiry") or ""),
            options=options,
            spot=_float(data.get("spot")),
            expirations=[str(exp) for exp in data.get("expirations", [])],
            atm_iv=_float(data.get("atm_iv")),
        )


def _float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        value = float(value)
        if value != value or value in (float("inf"), float("-inf")):
            return default
        return value
    except Exception:
        return default


def _int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(float(value))
    except Exception:
        return default
