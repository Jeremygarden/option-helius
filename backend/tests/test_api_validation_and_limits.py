import asyncio
import sys
import types

import pytest

fastapi_stub = types.ModuleType("fastapi")


class HTTPException(Exception):
    def __init__(self, status_code=None, detail=None):
        self.status_code = status_code
        self.detail = detail


fastapi_stub.HTTPException = HTTPException
sys.modules.setdefault("fastapi", fastapi_stub)
responses_stub = types.ModuleType("fastapi.responses")
responses_stub.JSONResponse = type("JSONResponse", (), {})
sys.modules.setdefault("fastapi.responses", responses_stub)

from app.core.errors import APIError
from app.core.logging import RequestContextMiddleware, get_request_id
from app.core.middleware import InMemoryRateLimitMiddleware, RequestSizeLimitMiddleware
from app.core.validation import normalize_ticker, parse_ticker_list, validate_positions_payload, validate_webhook_url


async def _noop_app(scope, receive, send):
    await send({"type": "http.response.start", "status": 200, "headers": []})
    await send({"type": "http.response.body", "body": b"ok"})


def _http_scope(headers=None, client=("127.0.0.1", 12345)):
    return {"type": "http", "headers": headers or [], "client": client}


async def _empty_receive():
    return {"type": "http.request", "body": b"", "more_body": False}


async def _collect_response(app, scope=None, receive=_empty_receive):
    messages = []

    async def send(message):
        messages.append(message)

    await app(scope or _http_scope(), receive, send)
    return messages


def test_ticker_validation_accepts_common_symbols_and_rejects_bad_inputs():
    assert normalize_ticker(" spy ") == "SPY"
    assert normalize_ticker("brk.b") == "BRK.B"
    assert normalize_ticker("bf-b") == "BF-B"

    for bad in ("", "../SPY", "SPY;DROP", "TOO-LONG-TICKER"):
        with pytest.raises(APIError) as excinfo:
            normalize_ticker(bad)
        assert excinfo.value.status_code == 422
        assert excinfo.value.detail["code"] == "INVALID_TICKER"


def test_ticker_list_validation_dedupes_and_limits():
    assert parse_ticker_list("spy, SPY,qqq") == ["SPY", "QQQ"]
    with pytest.raises(APIError) as excinfo:
        parse_ticker_list(",".join(f"T{i}" for i in range(21)))
    assert excinfo.value.detail["code"] == "TOO_MANY_TICKERS"


def test_position_and_webhook_validation_return_422_errors():
    positions = validate_positions_payload([
        {"action": "SELL", "quantity": 1, "current_underlying_price": 100, "delta": -0.2, "gamma": 0.01, "vega": 0.1, "theta": -0.03, "rho": 0.0}
    ])
    assert positions[0]["action"] == "sell"

    with pytest.raises(APIError) as excinfo:
        validate_positions_payload([])
    assert excinfo.value.status_code == 422

    assert validate_webhook_url("https://discord.com/api/webhooks/test")
    with pytest.raises(APIError) as excinfo:
        validate_webhook_url("file:///tmp/token")
    assert excinfo.value.detail["code"] == "INVALID_URL"


def test_rate_limit_middleware_returns_429_after_limit():
    async def scenario():
        app = InMemoryRateLimitMiddleware(_noop_app, limit=2, window_seconds=60)
        first = await _collect_response(app)
        second = await _collect_response(app)
        third = await _collect_response(app)
        assert first[0]["status"] == 200
        assert second[0]["status"] == 200
        assert third[0]["status"] == 429
        headers = dict(third[0]["headers"])
        assert b"retry-after" in headers

    asyncio.run(scenario())


def test_request_size_limit_rejects_large_declared_body():
    async def scenario():
        app = RequestSizeLimitMiddleware(_noop_app, max_body_bytes=5)
        messages = await _collect_response(app, scope=_http_scope(headers=[(b"content-length", b"6")]))
        assert messages[0]["status"] == 413
        assert b"REQUEST_TOO_LARGE" in messages[1]["body"]

    asyncio.run(scenario())


def test_request_context_middleware_propagates_request_id_and_header():
    async def scenario():
        seen_request_ids = []

        async def app(scope, receive, send):
            seen_request_ids.append(get_request_id())
            await send({"type": "http.response.start", "status": 204, "headers": []})
            await send({"type": "http.response.body", "body": b""})

        middleware = RequestContextMiddleware(app)
        messages = await _collect_response(
            middleware,
            scope=_http_scope(headers=[(b"x-request-id", b"test-request-1")]),
        )

        assert seen_request_ids == ["test-request-1"]
        assert dict(messages[0]["headers"])[b"x-request-id"] == b"test-request-1"
        assert get_request_id() is None

    asyncio.run(scenario())
