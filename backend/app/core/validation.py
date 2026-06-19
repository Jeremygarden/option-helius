"""Input validation helpers shared by API routers.

FastAPI/Pydantic handles basic type coercion for HTTP requests, but most of the
public endpoints accept path/query strings that also need domain constraints.
Keeping those checks here makes direct service/router tests exercise the same
rules and returns the standard API error shape for bad client input.
"""

from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from typing import Any
from urllib.parse import urlparse

from .errors import validation_error

_TICKER_RE = re.compile(r"^[A-Z][A-Z0-9.\-]{0,9}$")
_EXPIRY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def normalize_ticker(ticker: str, *, field: str = "ticker") -> str:
    """Normalize and validate an equity/ETF ticker symbol.

    Allows common listed-symbol forms such as BRK.B and BF-B while rejecting
    empty strings, path traversal, punctuation-heavy payloads, and very long
    values that can fan out to expensive upstream calls.
    """

    if not isinstance(ticker, str):
        raise validation_error(f"{field} must be a string", code="INVALID_TICKER")
    normalized = ticker.strip().upper()
    if not _TICKER_RE.fullmatch(normalized):
        raise validation_error(
            f"{field} must be 1-10 characters using letters, numbers, '.' or '-'",
            code="INVALID_TICKER",
        )
    return normalized


def normalize_optional_expiry(expiry: str | None) -> str | None:
    """Validate optional YYYY-MM-DD option expiration date strings."""

    if expiry is None or expiry == "":
        return None
    if not isinstance(expiry, str) or not _EXPIRY_RE.fullmatch(expiry.strip()):
        raise validation_error("expiry must use YYYY-MM-DD format", code="INVALID_EXPIRY")
    return expiry.strip()


def validate_numeric_range(value: float | int, *, field: str, minimum: float, maximum: float) -> float:
    """Validate numeric query/body values with a clear 422 on bad ranges."""

    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise validation_error(f"{field} must be numeric", code="INVALID_NUMBER")
    numeric = float(value)
    if numeric < minimum or numeric > maximum:
        raise validation_error(f"{field} must be between {minimum:g} and {maximum:g}", code="OUT_OF_RANGE")
    return numeric


def parse_ticker_list(tickers: str | None, *, max_count: int = 20) -> list[str] | None:
    """Parse and validate comma-separated ticker query params."""

    if tickers is None or tickers.strip() == "":
        return None
    parsed = [normalize_ticker(part) for part in tickers.split(",") if part.strip()]
    if not parsed:
        return None
    deduped = list(dict.fromkeys(parsed))
    if len(deduped) > max_count:
        raise validation_error(f"tickers must include at most {max_count} symbols", code="TOO_MANY_TICKERS")
    return deduped


def validate_positions_payload(positions: Any, *, max_positions: int = 25) -> list[dict[str, Any]]:
    """Validate option position legs used by scenario calculations."""

    if not isinstance(positions, Sequence) or isinstance(positions, (str, bytes, bytearray)):
        raise validation_error("positions must be a list", code="INVALID_POSITIONS")
    if len(positions) == 0:
        raise validation_error("positions must include at least one leg", code="INVALID_POSITIONS")
    if len(positions) > max_positions:
        raise validation_error(f"positions must include at most {max_positions} legs", code="TOO_MANY_POSITIONS")

    validated: list[dict[str, Any]] = []
    for idx, leg in enumerate(positions):
        if not isinstance(leg, Mapping):
            raise validation_error(f"positions[{idx}] must be an object", code="INVALID_POSITION_LEG")
        item = dict(leg)
        action = str(item.get("action", "buy")).lower()
        if action not in {"buy", "sell"}:
            raise validation_error(f"positions[{idx}].action must be buy or sell", code="INVALID_POSITION_ACTION")
        item["action"] = action
        item["quantity"] = validate_numeric_range(item.get("quantity", 0), field=f"positions[{idx}].quantity", minimum=1, maximum=1000)
        item["current_underlying_price"] = validate_numeric_range(
            item.get("current_underlying_price", 0),
            field=f"positions[{idx}].current_underlying_price",
            minimum=0.01,
            maximum=1_000_000,
        )
        for greek in ("delta", "gamma", "vega", "theta", "rho"):
            item[greek] = validate_numeric_range(item.get(greek, 0), field=f"positions[{idx}].{greek}", minimum=-10_000, maximum=10_000)
        validated.append(item)
    return validated


def validate_webhook_url(url: str, *, field: str = "webhook_url") -> str:
    """Require outbound webhook URLs to be explicit HTTP(S) URLs."""

    if not isinstance(url, str):
        raise validation_error(f"{field} must be a URL string", code="INVALID_URL")
    normalized = url.strip()
    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise validation_error(f"{field} must be an http(s) URL", code="INVALID_URL")
    if len(normalized) > 2048:
        raise validation_error(f"{field} is too long", code="INVALID_URL")
    return normalized
