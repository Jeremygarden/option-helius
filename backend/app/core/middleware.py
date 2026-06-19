"""Security and traffic-control middleware."""

from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

ASGIApp = Callable[[dict[str, Any], Callable[[], Awaitable[dict[str, Any]]], Callable[[dict[str, Any]], Awaitable[None]]], Awaitable[None]]
Message = dict[str, Any]
Receive = Callable[[], Awaitable[Message]]
Scope = dict[str, Any]
Send = Callable[[Message], Awaitable[None]]


@dataclass
class _ClientWindow:
    timestamps: deque[float] = field(default_factory=deque)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class InMemoryRateLimitMiddleware:
    """Small fixed-window ASGI rate limiter for single-process deployments.

    This intentionally avoids an external dependency for the current app. It is
    deterministic, testable, and good enough to prevent accidental endpoint
    abuse in the default Docker deployment. Multi-replica deployments should
    replace this with a Redis-backed limiter at the ingress layer.
    """

    def __init__(self, app: ASGIApp, *, limit: int = 120, window_seconds: int = 60) -> None:
        self.app = app
        self.limit = limit
        self.window_seconds = window_seconds
        self._clients: defaultdict[str, _ClientWindow] = defaultdict(_ClientWindow)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        client_id = self._client_id(scope)
        now = time.monotonic()
        window = self._clients[client_id]
        async with window.lock:
            while window.timestamps and now - window.timestamps[0] >= self.window_seconds:
                window.timestamps.popleft()
            if len(window.timestamps) >= self.limit:
                retry_after = max(1, int(self.window_seconds - (now - window.timestamps[0])))
                await self._send_rate_limited(send, retry_after)
                return
            window.timestamps.append(now)

        await self.app(scope, receive, send)

    def _client_id(self, scope: Scope) -> str:
        headers = {key.lower(): value for key, value in scope.get("headers") or []}
        forwarded_for = headers.get(b"x-forwarded-for")
        if forwarded_for:
            return forwarded_for.decode("latin1").split(",", 1)[0].strip() or "unknown"
        client = scope.get("client")
        return str(client[0]) if client else "unknown"

    async def _send_rate_limited(self, send: Send, retry_after: int) -> None:
        body = b'{"detail":{"error":"Rate limit exceeded","code":"RATE_LIMIT_EXCEEDED","retryable":true}}'
        headers = [
            (b"content-type", b"application/json"),
            (b"retry-after", str(retry_after).encode("ascii")),
            (b"content-length", str(len(body)).encode("ascii")),
        ]
        await send({"type": "http.response.start", "status": 429, "headers": headers})
        await send({"type": "http.response.body", "body": body})


class RequestSizeLimitMiddleware:
    """Reject oversized request bodies before route handlers read them."""

    def __init__(self, app: ASGIApp, *, max_body_bytes: int = 1_048_576) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        declared_length = self._content_length(scope)
        if declared_length is not None and declared_length > self.max_body_bytes:
            await self._send_too_large(send)
            return

        consumed = 0
        rejected = False

        async def limited_receive() -> Message:
            nonlocal consumed, rejected
            message = await receive()
            if message.get("type") == "http.request":
                consumed += len(message.get("body") or b"")
                if consumed > self.max_body_bytes:
                    rejected = True
                    return {"type": "http.disconnect"}
            return message

        await self.app(scope, limited_receive, send)
        if rejected:
            # If an app consumed directly from receive without producing a response,
            # the disconnect above prevents further body processing. Route-level
            # frameworks normally stop before handler execution on disconnect.
            return

    def _content_length(self, scope: Scope) -> int | None:
        for key, value in scope.get("headers") or []:
            if key.lower() == b"content-length":
                try:
                    return int(value.decode("ascii"))
                except ValueError:
                    return None
        return None

    async def _send_too_large(self, send: Send) -> None:
        body = b'{"detail":{"error":"Request body too large","code":"REQUEST_TOO_LARGE","retryable":false}}'
        headers = [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode("ascii")),
        ]
        await send({"type": "http.response.start", "status": 413, "headers": headers})
        await send({"type": "http.response.body", "body": body})
