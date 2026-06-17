"""IBKR option-chain fetcher adapted for Option Helius response shapes.

The fetcher ports the production IB Gateway option-chain flow while keeping it
additive to the existing yfinance service:

1. subscribe the underlying first so IBKR can compute model Greeks;
2. discover expirations/strikes via reqSecDefOptParamsAsync (no ticker quota);
3. qualify ATM-window option contracts;
4. subscribe option market data with generic ticks for OI/volume/Greeks;
5. return dictionaries compatible with existing option-helius endpoints.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from ...core.config import Settings, get_settings
from .client import IBKRClient

logger = logging.getLogger(__name__)

OPTION_TICK_LIST = "100,101"
UNDERLYING_TICK_LIST = "100,101,104,106"
IB_MAX_TICKERS = 100
UNDERLYING_SLOTS_RESERVED = 5


class IBKRFallbackError(RuntimeError):
    """Raised when IBKR data is unavailable and caller should use fallback."""


@dataclass(frozen=True)
class ChainRequest:
    symbol: str
    expiration: Optional[str] = None
    strike_radius: int = 8
    exchange: str = "SMART"
    currency: str = "USD"
    include_calls: bool = True
    include_puts: bool = True
    wait_seconds: float = 1.5


def _load_contract_classes():
    try:
        from ib_async import Option, Stock  # type: ignore
    except ImportError as exc:
        raise IBKRFallbackError("ib-async is not installed; use fallback provider") from exc
    return Stock, Option


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        value = float(value)
        if value != value or value in (float("inf"), float("-inf")):
            return default
        return value
    except Exception:
        return default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(float(value))
    except Exception:
        return default


def _normalize_expiry_for_ib(expiry: Optional[str]) -> Optional[str]:
    if not expiry:
        return None
    expiry = expiry.strip()
    if "-" in expiry:
        return datetime.strptime(expiry, "%Y-%m-%d").strftime("%Y%m%d")
    return expiry


def _normalize_expiry_for_api(expiry: Optional[str]) -> Optional[str]:
    if not expiry:
        return None
    expiry = expiry.strip()
    if "-" in expiry:
        return expiry
    return datetime.strptime(expiry, "%Y%m%d").strftime("%Y-%m-%d")


def _ticker_market_price(ticker: Any) -> float:
    try:
        price = ticker.marketPrice()
        if price and price > 0:
            return float(price)
    except Exception:
        pass
    for attr in ("last", "close", "bid", "ask"):
        price = _safe_float(getattr(ticker, attr, None))
        if price > 0:
            return price
    return 0.0


def _chain_expirations(chain: Any) -> List[str]:
    return sorted(str(e) for e in getattr(chain, "expirations", []) or [])


def _chain_strikes(chain: Any) -> List[float]:
    return sorted(_safe_float(s) for s in (getattr(chain, "strikes", []) or []) if _safe_float(s) > 0)


class OptionChainFetcher:
    """Fetch IBKR option chains and map them to option-helius dictionaries."""

    def __init__(self, client: IBKRClient, settings: Optional[Settings] = None):
        self._client = client
        self._ib = client.ib
        self._settings = settings or get_settings()
        self._underlying_tickers: Dict[str, Any] = {}
        self._option_tickers: Dict[str, List[Any]] = {}
        self._max_option_subs = max(0, int(self._settings.max_tickers or IB_MAX_TICKERS) - UNDERLYING_SLOTS_RESERVED)

    async def get_option_chain_params(self, symbol: str, exchange: str = "SMART", currency: str = "USD") -> List[Any]:
        Stock, _Option = _load_contract_classes()
        stock = Stock(symbol.upper(), exchange, currency)
        qualified = await self._ib.qualifyContractsAsync(stock)
        stock = qualified[0] if qualified else stock
        con_id = getattr(stock, "conId", 0)
        if not con_id:
            raise IBKRFallbackError(f"IBKR could not qualify underlying contract for {symbol}")

        chains = await self._ib.reqSecDefOptParamsAsync(
            underlyingSymbol=symbol.upper(),
            futFopExchange="",
            underlyingSecType="STK",
            underlyingConId=con_id,
        )
        smart = [chain for chain in chains if getattr(chain, "exchange", None) in {"SMART", "CBOE", exchange}]
        return smart or list(chains)

    async def fetch_option_chain(self, request: ChainRequest | str, **kwargs: Any) -> Dict[str, Any]:
        """Return an option-helius-compatible option chain from IBKR.

        Raises IBKRFallbackError/ConnectionError on missing IBKR data so callers can
        fall back to yfinance without changing API schemas.
        """
        if isinstance(request, str):
            request = ChainRequest(symbol=request, **kwargs)
        request = ChainRequest(
            symbol=request.symbol.upper(),
            expiration=_normalize_expiry_for_ib(request.expiration),
            strike_radius=max(0, int(request.strike_radius)),
            exchange=request.exchange,
            currency=request.currency,
            include_calls=request.include_calls,
            include_puts=request.include_puts,
            wait_seconds=request.wait_seconds,
        )

        tickers, expiry, spot = await self.subscribe_atm_chain(request)
        if request.wait_seconds > 0:
            await asyncio.sleep(request.wait_seconds)

        options = [self.extract_option(ticker, expiry, spot) for ticker in tickers.values()]
        options = [option for option in options if option is not None]
        if not options:
            raise IBKRFallbackError(f"IBKR returned no option data for {request.symbol} {expiry}")

        atm_iv_values = [option["iv"] for option in options if option.get("iv", 0) > 0]
        atm_iv = sum(atm_iv_values) / len(atm_iv_values) if atm_iv_values else 0.0
        return {
            "ticker": request.symbol,
            "expiry": _normalize_expiry_for_api(expiry),
            "spot": round(spot, 2),
            "options": sorted(options, key=lambda item: (item["strike"], item["type"])),
            "expirations": [_normalize_expiry_for_api(exp) for exp in await self.get_expirations(request.symbol)],
            "atm_iv": round(atm_iv, 4),
            "source": "ibkr",
        }

    async def get_expirations(self, symbol: str, exchange: str = "SMART", currency: str = "USD") -> List[str]:
        chains = await self.get_option_chain_params(symbol, exchange, currency)
        expirations: set[str] = set()
        for chain in chains:
            expirations.update(_chain_expirations(chain))
        return sorted(expirations)

    async def subscribe_atm_chain(self, request: ChainRequest) -> Tuple[Dict[str, Any], str, float]:
        symbol = request.symbol.upper()
        underlying_ticker = await self._subscribe_underlying(symbol, request.exchange, request.currency)
        spot = await self._wait_for_underlying_price(symbol, underlying_ticker)

        chains = await self.get_option_chain_params(symbol, request.exchange, request.currency)
        if not chains:
            raise IBKRFallbackError(f"No IBKR option chains found for {symbol}")
        chain = chains[0]
        expiry = self._select_expiry(_chain_expirations(chain), request.expiration)
        strikes = self._select_atm_strikes(_chain_strikes(chain), spot, request.strike_radius)
        if not strikes:
            raise IBKRFallbackError(f"No IBKR strikes found for {symbol}")

        rights: List[str] = []
        if request.include_calls:
            rights.append("C")
        if request.include_puts:
            rights.append("P")
        if not rights:
            raise ValueError("At least one of include_calls/include_puts must be true")

        _Stock, Option = _load_contract_classes()
        contracts = [Option(symbol, expiry, strike, right, request.exchange) for strike in strikes for right in rights]
        try:
            qualified = await self._ib.qualifyContractsAsync(*contracts)
        except Exception as exc:
            raise IBKRFallbackError(f"IBKR failed to qualify option contracts for {symbol}: {exc}") from exc

        valid = [contract for contract in qualified if getattr(contract, "conId", 0)]
        available = self._max_option_subs - self._client.subscription_count
        if len(valid) > available:
            valid = self._trim_to_slot_limit(valid, spot, max(0, available))
        if not valid:
            raise IBKRFallbackError(f"IBKR ticker limit leaves no slots for {symbol}")

        tickers: Dict[str, Any] = {}
        for contract in valid:
            ticker = await self._client.subscribe_ticker(contract, OPTION_TICK_LIST, snapshot=False)
            key = f"{getattr(contract, 'strike', 0)}_{getattr(contract, 'right', '')}"
            tickers[key] = ticker
        self._option_tickers[symbol] = list(tickers.values())
        return tickers, expiry, spot

    def extract_option(self, ticker: Any, expiry: Optional[str] = None, underlying_price: float = 0.0) -> Optional[Dict[str, Any]]:
        contract = getattr(ticker, "contract", None)
        if contract is None or not hasattr(contract, "strike"):
            return None
        right = str(getattr(contract, "right", "")).upper()
        option_type = "call" if right in {"C", "CALL"} else "put"
        greeks = getattr(ticker, "modelGreeks", None) or getattr(ticker, "bidGreeks", None) or getattr(ticker, "askGreeks", None)

        bid = _safe_float(getattr(ticker, "bid", None))
        ask = _safe_float(getattr(ticker, "ask", None))
        last = _safe_float(getattr(ticker, "last", None))
        mid = round((bid + ask) / 2, 4) if bid > 0 and ask > 0 else 0.0
        price = last or mid

        oi_attr = "callOpenInterest" if option_type == "call" else "putOpenInterest"
        volume_attr = "callVolume" if option_type == "call" else "putVolume"
        iv = _safe_float(getattr(greeks, "impliedVol", None)) if greeks else _safe_float(getattr(ticker, "impliedVolatility", None))
        return {
            "strike": _safe_float(getattr(contract, "strike", None)),
            "expiry": _normalize_expiry_for_api(expiry or getattr(contract, "lastTradeDateOrContractMonth", None)),
            "type": option_type,
            "bid": bid,
            "ask": ask,
            "price": price,
            "iv": iv,
            "delta": _safe_float(getattr(greeks, "delta", None)) if greeks else 0.0,
            "gamma": _safe_float(getattr(greeks, "gamma", None)) if greeks else 0.0,
            "theta": _safe_float(getattr(greeks, "theta", None)) if greeks else 0.0,
            "vega": _safe_float(getattr(greeks, "vega", None)) if greeks else 0.0,
            "oi": _safe_int(getattr(ticker, oi_attr, None) or getattr(ticker, "openInterest", None)),
            "volume": _safe_int(getattr(ticker, volume_attr, None) or getattr(ticker, "volume", None)),
            "in_the_money": self._is_in_the_money(option_type, _safe_float(getattr(contract, "strike", None)), underlying_price),
            "contract_symbol": str(getattr(contract, "localSymbol", "") or getattr(contract, "symbol", "")),
            "source": "ibkr",
        }

    async def cancel_chain(self, symbol: str) -> None:
        for ticker in self._option_tickers.pop(symbol.upper(), []):
            contract = getattr(ticker, "contract", None)
            if contract is not None:
                try:
                    await self._client.unsubscribe_ticker(contract)
                except Exception:
                    logger.debug("Failed to cancel IBKR option ticker", exc_info=True)
        ticker = self._underlying_tickers.pop(symbol.upper(), None)
        if ticker is not None and getattr(ticker, "contract", None) is not None:
            try:
                await self._client.unsubscribe_ticker(ticker.contract)
            except Exception:
                logger.debug("Failed to cancel IBKR underlying ticker", exc_info=True)

    async def _subscribe_underlying(self, symbol: str, exchange: str, currency: str) -> Any:
        if symbol in self._underlying_tickers:
            return self._underlying_tickers[symbol]
        Stock, _Option = _load_contract_classes()
        stock = Stock(symbol, exchange, currency)
        qualified = await self._ib.qualifyContractsAsync(stock)
        stock = qualified[0] if qualified else stock
        ticker = await self._client.subscribe_ticker(stock, UNDERLYING_TICK_LIST, snapshot=False)
        self._underlying_tickers[symbol] = ticker
        return ticker

    async def _wait_for_underlying_price(self, symbol: str, ticker: Any) -> float:
        for _ in range(50):
            price = _ticker_market_price(ticker)
            if price > 0:
                return price
            await asyncio.sleep(0.1)
        price = _ticker_market_price(ticker)
        if price <= 0:
            raise IBKRFallbackError(f"IBKR returned no underlying price for {symbol}")
        return price

    def _select_expiry(self, expirations: Sequence[str], requested: Optional[str]) -> str:
        if not expirations:
            raise IBKRFallbackError("IBKR returned no expirations")
        if requested and requested in expirations:
            return requested
        if requested:
            requested_date = datetime.strptime(requested, "%Y%m%d").date()
            return min(expirations, key=lambda exp: abs((datetime.strptime(exp, "%Y%m%d").date() - requested_date).days))
        today = date.today()
        future = [exp for exp in expirations if datetime.strptime(exp, "%Y%m%d").date() >= today]
        return min(future or list(expirations))

    def _select_atm_strikes(self, all_strikes: Sequence[float], underlying_price: float, radius: int) -> List[float]:
        strikes = sorted(float(strike) for strike in all_strikes if float(strike) > 0)
        if not strikes:
            return []
        atm_idx = min(range(len(strikes)), key=lambda idx: abs(strikes[idx] - underlying_price))
        lo = max(0, atm_idx - radius)
        hi = min(len(strikes), atm_idx + radius + 1)
        return strikes[lo:hi]

    def _trim_to_slot_limit(self, contracts: Iterable[Any], underlying_price: float, max_slots: int) -> List[Any]:
        if max_slots <= 0:
            return []
        return sorted(contracts, key=lambda c: abs(_safe_float(getattr(c, "strike", 0)) - underlying_price))[:max_slots]

    def _is_in_the_money(self, option_type: str, strike: float, underlying_price: float) -> bool:
        if underlying_price <= 0 or strike <= 0:
            return False
        return underlying_price > strike if option_type == "call" else underlying_price < strike
