"""Structured logging, request IDs, and observability helpers."""

from __future__ import annotations

import contextvars
import json
import logging
import os
import sys
import time
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any

RequestScope = dict[str, Any]
Receive = Any
Send = Any

_request_id: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)


def get_request_id() -> str | None:
    """Return the request ID bound to the current async context, if any."""

    return _request_id.get()


def set_request_id(request_id: str | None) -> contextvars.Token:
    """Bind a request ID to the current context and return its reset token."""

    return _request_id.set(request_id)


def reset_request_id(token: contextvars.Token) -> None:
    """Reset the request ID context var after a request finishes."""

    _request_id.reset(token)


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


class RequestIdFilter(logging.Filter):
    """Attach the active request_id to every LogRecord."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = get_request_id() or "-"
        return True


class JsonLogFormatter(logging.Formatter):
    """JSON log formatter for container-friendly structured logs."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", None) or "-",
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        for key, value in getattr(record, "__dict__", {}).items():
            if key.startswith("_") or key in _RESERVED_LOG_RECORD_KEYS:
                continue
            payload[key] = _json_safe(value)

        if record.exc_info:
            payload["exception"] = "".join(traceback.format_exception(*record.exc_info)).strip()

        return json.dumps(payload, ensure_ascii=False, default=str)


_RESERVED_LOG_RECORD_KEYS = frozenset(logging.makeLogRecord({}).__dict__.keys()) | {"message", "asctime"}


def _json_safe(value: Any) -> Any:
    try:
        json.dumps(value, default=str)
        return value
    except TypeError:
        return str(value)


def configure_logging() -> None:
    """Configure app-wide logging once.

    Defaults to JSON logs because the app is primarily Docker-deployed. Set
    ``JSON_LOGS=false`` for local plain-text output.
    """

    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    json_logs = _env_bool("JSON_LOGS", True)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    formatter: logging.Formatter
    if json_logs:
        formatter = JsonLogFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"
        )

    if not root_logger.handlers:
        root_logger.addHandler(logging.StreamHandler(sys.stdout))

    request_filter = RequestIdFilter()
    for handler in root_logger.handlers:
        handler.setLevel(level)
        handler.setFormatter(formatter)
        if not any(isinstance(existing, RequestIdFilter) for existing in handler.filters):
            handler.addFilter(request_filter)


class RequestContextMiddleware:
    """ASGI middleware that propagates request IDs and logs request outcomes."""

    def __init__(self, app: Any, *, slow_request_ms: float | None = None) -> None:
        self.app = app
        self.slow_request_ms = slow_request_ms if slow_request_ms is not None else float(os.getenv("SLOW_REQUEST_MS", "1000"))
        self.logger = logging.getLogger("app.request")

    async def __call__(self, scope: RequestScope, receive: Receive, send: Send) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        request_id = self._request_id_from_headers(scope) or uuid.uuid4().hex
        token = set_request_id(request_id)
        start = time.perf_counter()
        status_code = 500
        method = scope.get("method", "")
        path = scope.get("path", "")
        client_ip = self._client_ip(scope)

        async def send_with_request_id(message: dict[str, Any]) -> None:
            nonlocal status_code
            if message.get("type") == "http.response.start":
                status_code = int(message.get("status", status_code))
                headers = list(message.get("headers") or [])
                if not any(key.lower() == b"x-request-id" for key, _value in headers):
                    headers.append((b"x-request-id", request_id.encode("latin1", errors="ignore")))
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            self.logger.exception(
                "request failed",
                extra={
                    "event": "http_request_failed",
                    "method": method,
                    "path": path,
                    "status_code": status_code,
                    "duration_ms": round(duration_ms, 2),
                    "client_ip": client_ip,
                },
            )
            raise
        else:
            duration_ms = (time.perf_counter() - start) * 1000
            log_method = self.logger.warning if duration_ms >= self.slow_request_ms else self.logger.info
            log_method(
                "request completed",
                extra={
                    "event": "http_request_completed",
                    "method": method,
                    "path": path,
                    "status_code": status_code,
                    "duration_ms": round(duration_ms, 2),
                    "client_ip": client_ip,
                    "slow": duration_ms >= self.slow_request_ms,
                },
            )
        finally:
            reset_request_id(token)

    def _request_id_from_headers(self, scope: RequestScope) -> str | None:
        for key, value in scope.get("headers") or []:
            if key.lower() == b"x-request-id":
                decoded = value.decode("latin1", errors="ignore").strip()
                return decoded[:128] if decoded else None
        return None

    def _client_ip(self, scope: RequestScope) -> str:
        headers = {key.lower(): value for key, value in scope.get("headers") or []}
        forwarded_for = headers.get(b"x-forwarded-for")
        if forwarded_for:
            return forwarded_for.decode("latin1", errors="ignore").split(",", 1)[0].strip() or "unknown"
        client = scope.get("client")
        return str(client[0]) if client else "unknown"
