"""Standardized API error responses for Option Helius.

All API errors should return a consistent JSON shape:
{
    "error": "Human-readable error message",
    "code": "MACHINE_READABLE_CODE",
    "retryable": true/false
}

Status code mapping:
- 422: Validation errors (bad input from the client)
- 503: Upstream service unavailable (IBKR down, yfinance timeout, FRED unreachable)
- 504: Gateway timeout (upstream took too long)
- 404: Resource not found
- 500: Unexpected internal server error
"""

from fastapi import HTTPException
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)


class APIError(HTTPException):
    """Standard API error with consistent JSON shape."""

    def __init__(self, status_code: int, error: str, code: str, retryable: bool = False):
        detail = {"error": error, "code": code, "retryable": retryable}
        super().__init__(status_code=status_code, detail=detail)


def validation_error(message: str, code: str = "VALIDATION_ERROR") -> APIError:
    """422 — bad input from the client."""
    return APIError(422, message, code, retryable=False)


def not_found_error(message: str, code: str = "NOT_FOUND") -> APIError:
    """404 — resource not found."""
    return APIError(404, message, code, retryable=False)


def upstream_unavailable(service: str, detail: str = "", code: str = "UPSTREAM_UNAVAILABLE") -> APIError:
    """503 — upstream service (IBKR, yfinance, FRED) is down."""
    msg = f"{service} unavailable"
    if detail:
        msg += f": {detail}"
    return APIError(503, msg, code, retryable=True)


def timeout_error(service: str, seconds: float = 0, code: str = "TIMEOUT") -> APIError:
    """504 — upstream took too long."""
    msg = f"{service} timeout"
    if seconds:
        msg += f" after {seconds}s"
    return APIError(504, msg, code, retryable=True)


def internal_error(message: str = "Internal server error", code: str = "INTERNAL_ERROR") -> APIError:
    """500 — unexpected internal error."""
    return APIError(500, message, code, retryable=False)
