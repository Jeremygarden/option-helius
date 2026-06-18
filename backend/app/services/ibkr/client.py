"""Async IBKR Gateway client for Option Helius.

This module is adapted from `/home/azureuser/ib-gateway-docker/data_client/`
but packaged for the FastAPI backend:

- lazy `ib_async` import so yfinance fallback paths still import cleanly;
- async connection manager with reconnect callbacks;
- subscription tracking for replay after reconnect;
- structured health checks for future `/health/ibkr` endpoints.
"""

from __future__ import annotations

import asyncio
import random
import logging
import os
import socket
import time
from dataclasses import asdict, dataclass, field
from enum import Enum, auto
from typing import Any, Awaitable, Callable, Dict, List, Optional

from ...core.config import Settings, get_settings

logger = logging.getLogger(__name__)

# IB API message classes/codes that should influence logs/reconnect behavior.
_SESSION_ERRORS = frozenset({1100, 1300, 504})
_DATA_ERRORS = frozenset({354, 10090, 10197})
_INFO_CODES = frozenset({2104, 2106, 2108, 2119, 2158})


class IBKRDependencyError(RuntimeError):
    """Raised when the optional ib-async dependency is unavailable."""


def _load_ib_class():
    try:
        from ib_async import IB  # type: ignore
    except ImportError as exc:
        raise IBKRDependencyError(
            "ib-async is required for IBKR provider connections. "
            "Install backend requirements or run `uv pip install -r requirements.txt`."
        ) from exc
    return IB


def _contract_symbol(contract: Any) -> str:
    return str(getattr(contract, "symbol", "UNKNOWN"))


def _is_option_contract(contract: Any) -> bool:
    sec_type = str(getattr(contract, "secType", "")).upper()
    right = str(getattr(contract, "right", "")).upper()
    return sec_type == "OPT" or right in {"C", "P", "CALL", "PUT"}


class ConnectionState(Enum):
    DISCONNECTED = auto()
    CONNECTING = auto()
    CONNECTED = auto()
    RECONNECTING = auto()


@dataclass
class ReconnectConfig:
    base_delay: float = 5.0
    max_delay: float = 60.0
    backoff_factor: float = 2.0
    jitter_factor: float = 0.3
    max_attempts: int = 0
    connect_timeout: float = 30.0


@dataclass
class SubscriptionRecord:
    req_id: int
    contract: Any
    generic_tick_list: str = ""
    snapshot: bool = False
    regulatory_snapshot: bool = False
    mkt_data_options: list = field(default_factory=list)
    subscribed_at: float = field(default_factory=time.time)


@dataclass
class ClientConfig:
    host: str = "localhost"
    port: int = 4002
    client_id: int = 1
    reconnect: Optional[ReconnectConfig] = None
    connect_timeout: float = 30.0
    readonly: bool = True
    account: str = ""

    def __post_init__(self) -> None:
        if self.reconnect is None:
            self.reconnect = ReconnectConfig(
                base_delay=float(os.getenv("RECONNECT_DELAY", "5")),
                max_attempts=int(os.getenv("MAX_RECONNECT_ATTEMPTS", "0")),
                connect_timeout=self.connect_timeout,
            )

    @classmethod
    def from_settings(cls, settings: Optional[Settings] = None) -> "ClientConfig":
        settings = settings or get_settings()
        return cls(**settings.ibkr_client_config)


@dataclass
class HealthStatus:
    connected: bool
    host: str
    port: int
    client_id: int
    server_version: Optional[int]
    account: Optional[str]
    uptime_seconds: Optional[float]
    reconnect_count: int
    subscription_count: int
    state: str
    timestamp: float

    def dict(self) -> Dict[str, Any]:
        return asdict(self)


class ReconnectManager:
    """Small async reconnect manager for an ib_async.IB instance."""

    def __init__(self, ib: Any, host: str, port: int, client_id: int, config: Optional[ReconnectConfig] = None):
        self._ib = ib
        self._host = host
        self._port = port
        self._client_id = client_id
        self._config = config or ReconnectConfig()
        self._state = ConnectionState.DISCONNECTED
        self._attempt_count = 0
        self._subscriptions: Dict[int, SubscriptionRecord] = {}
        self._reconnect_task: Optional[asyncio.Task] = None
        self._on_connect_callbacks: List[Callable[[], Awaitable[None]]] = []
        self._on_disconnect_callbacks: List[Callable[[], Awaitable[None]]] = []
        self._on_reconnect_callbacks: List[Callable[[], Awaitable[None]]] = []

        disconnected_event = getattr(self._ib, "disconnectedEvent", None)
        if disconnected_event is not None:
            try:
                disconnected_event += self._on_ib_disconnected
            except Exception:  # pragma: no cover - defensive for fake/event variants
                logger.debug("Could not register IB disconnected event", exc_info=True)

    @property
    def state(self) -> ConnectionState:
        return self._state

    @property
    def tracked_subscription_count(self) -> int:
        return len(self._subscriptions)

    def track_subscription(self, record: SubscriptionRecord) -> None:
        self._subscriptions[record.req_id] = record

    def untrack_subscription(self, req_id: int) -> None:
        self._subscriptions.pop(req_id, None)

    def on_connect(self, callback: Callable[[], Awaitable[None]]) -> None:
        self._on_connect_callbacks.append(callback)

    def on_disconnect(self, callback: Callable[[], Awaitable[None]]) -> None:
        self._on_disconnect_callbacks.append(callback)

    def on_reconnect(self, callback: Callable[[], Awaitable[None]]) -> None:
        self._on_reconnect_callbacks.append(callback)

    async def start(self) -> None:
        await self._connect()

    async def stop(self) -> None:
        if self._reconnect_task and not self._reconnect_task.done():
            self._reconnect_task.cancel()
            try:
                await self._reconnect_task
            except asyncio.CancelledError:
                pass
        if self._ib.isConnected():
            self._ib.disconnect()
        self._state = ConnectionState.DISCONNECTED

    async def _connect(self) -> None:
        self._state = ConnectionState.CONNECTING
        try:
            await asyncio.wait_for(
                self._ib.connectAsync(self._host, self._port, clientId=self._client_id),
                timeout=self._config.connect_timeout,
            )
        except asyncio.TimeoutError as exc:
            self._state = ConnectionState.DISCONNECTED
            raise ConnectionError(f"IBKR connection timeout after {self._config.connect_timeout}s") from exc
        except Exception as exc:
            self._state = ConnectionState.DISCONNECTED
            raise ConnectionError(f"IBKR connection failed: {exc}") from exc

        self._state = ConnectionState.CONNECTED
        self._attempt_count = 0
        await self._fire_callbacks(self._on_connect_callbacks)

    async def _on_ib_disconnected(self, *_args: Any) -> None:
        if self._state in {ConnectionState.DISCONNECTED, ConnectionState.RECONNECTING}:
            return
        self._state = ConnectionState.RECONNECTING
        await self._fire_callbacks(self._on_disconnect_callbacks)
        self._reconnect_task = asyncio.create_task(self._reconnect_loop())

    async def _reconnect_loop(self) -> None:
        delay = self._config.base_delay
        attempt = 0
        while True:
            attempt += 1
            self._attempt_count += 1
            if self._config.max_attempts > 0 and attempt > self._config.max_attempts:
                logger.error("IBKR max reconnect attempts reached (%s)", self._config.max_attempts)
                self._state = ConnectionState.DISCONNECTED
                return
            await asyncio.sleep(delay)
            try:
                await self._connect()
                await self._replay_subscriptions()
                await self._fire_callbacks(self._on_reconnect_callbacks)
                return
            except Exception as exc:  # pragma: no cover - timing/reconnect defensive path
                logger.warning("IBKR reconnect attempt %s failed: %s", attempt, exc)
                delay = min(delay * self._config.backoff_factor, self._config.max_delay)

    async def _replay_subscriptions(self) -> None:
        for record in list(self._subscriptions.values()):
            self._ib.reqMktData(
                record.contract,
                record.generic_tick_list,
                record.snapshot,
                record.regulatory_snapshot,
                record.mkt_data_options,
            )

    async def _fire_callbacks(self, callbacks: List[Callable[[], Awaitable[None]]]) -> None:
        for callback in callbacks:
            try:
                await callback()
            except Exception:
                logger.exception("IBKR reconnect callback failed")


class CircuitBreaker:
    """Simple circuit breaker: after N consecutive failures, open the circuit
    for a cooldown period to avoid hammering a dead upstream."""

    def __init__(self, failure_threshold: int = 3, cooldown_seconds: float = 60.0):
        self._failure_threshold = failure_threshold
        self._cooldown = cooldown_seconds
        self._consecutive_failures = 0
        self._last_failure_time: Optional[float] = None
        self._state = "closed"  # closed | open | half-open

    @property
    def state(self) -> str:
        if self._state == "open":
            elapsed = time.time() - (self._last_failure_time or 0)
            if elapsed >= self._cooldown:
                self._state = "half-open"
        return self._state

    def record_success(self) -> None:
        self._consecutive_failures = 0
        self._state = "closed"

    def record_failure(self) -> None:
        self._consecutive_failures += 1
        self._last_failure_time = time.time()
        if self._consecutive_failures >= self._failure_threshold:
            self._state = "open"
            logger.warning("IBKR circuit breaker OPEN after %d consecutive failures", self._consecutive_failures)

    def allow_request(self) -> bool:
        return self.state != "open"


class IBKRClient:
    """Production-oriented async IBKR client wrapper."""

    def __init__(self, config: Optional[ClientConfig] = None, ib: Optional[Any] = None, **kwargs: Any):
        self._config = config or ClientConfig(**kwargs)
        self._ib = ib if ib is not None else _load_ib_class()()
        self._reconnect_mgr = ReconnectManager(
            ib=self._ib,
            host=self._config.host,
            port=self._config.port,
            client_id=self._config.client_id,
            config=self._config.reconnect,
        )
        self._connected_at: Optional[float] = None
        self._reconnect_count = 0
        self._account: Optional[str] = None
        self._circuit_breaker = CircuitBreaker(failure_threshold=3, cooldown_seconds=60.0)
        self._health_check_task: Optional[asyncio.Task] = None
        self._reconnect_mgr.on_reconnect(self._on_reconnect)
        self._setup_error_handler()

    async def __aenter__(self) -> "IBKRClient":
        await self.connect()
        return self

    async def __aexit__(self, exc_type: object, exc_val: object, exc_tb: object) -> bool:
        await self.disconnect()
        return False

    @property
    def config(self) -> ClientConfig:
        return self._config

    @property
    def ib(self) -> Any:
        return self._ib

    @property
    def is_connected(self) -> bool:
        return bool(self._ib.isConnected())

    @property
    def subscription_count(self) -> int:
        return self._reconnect_mgr.tracked_subscription_count

    async def connect(self) -> None:
        logger.info("Connecting to IBKR Gateway at %s:%s", self._config.host, self._config.port)
        await self._reconnect_mgr.start()
        self._connected_at = time.time()
        self._refresh_account()
        self._circuit_breaker.record_success()
        # Start periodic health check (every 30s)
        if self._health_check_task is None or self._health_check_task.done():
            self._health_check_task = asyncio.create_task(self._periodic_health_check())

    async def disconnect(self) -> None:
        logger.info("Disconnecting from IBKR Gateway")
        if self._health_check_task and not self._health_check_task.done():
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
        await self._reconnect_mgr.stop()
        self._connected_at = None

    async def _periodic_health_check(self) -> None:
        """Background task that checks connection health and triggers reconnect if stale.
        
        Uses ±15% jitter on the 30s interval to avoid synchronized health checks
        when multiple client instances are running.
        """
        while True:
            try:
                jitter = 30 * 0.15 * (random.random() * 2 - 1)  # ±15% of 30s
                await asyncio.sleep(max(5.0, 30 + jitter))
                if not self.is_connected:
                    logger.warning("IBKR health check: connection lost, triggering reconnect")
                    self._circuit_breaker.record_failure()
                    if self._circuit_breaker.allow_request():
                        try:
                            await self._reconnect_mgr.start()
                            self._connected_at = time.time()
                            self._circuit_breaker.record_success()
                            logger.info("IBKR health check: reconnected successfully")
                        except Exception as exc:
                            logger.warning("IBKR health check reconnect failed: %s", exc)
                    else:
                        logger.warning("IBKR circuit breaker open, skipping reconnect attempt")
            except asyncio.CancelledError:
                return
            except Exception:
                logger.debug("IBKR health check error", exc_info=True)

    async def subscribe_ticker(self, contract: Any, generic_tick_list: str = "", snapshot: bool = False) -> Any:
        self._require_connected()
        max_tickers = int(os.getenv("MAX_TICKERS", "100"))
        if self.subscription_count >= max_tickers:
            raise RuntimeError(
                f"Ticker subscription limit reached ({self.subscription_count}/{max_tickers}). "
                "Reduce ATM_STRIKE_RADIUS or unsubscribe old tickers."
            )
        if _is_option_contract(contract):
            logger.debug("Subscribing to option contract %s; ensure underlying is subscribed first", _contract_symbol(contract))
        ticker = self._ib.reqMktData(contract, generic_tick_list, snapshot, False)
        req_id = int(getattr(ticker, "reqId", id(ticker)))
        self._reconnect_mgr.track_subscription(
            SubscriptionRecord(req_id=req_id, contract=contract, generic_tick_list=generic_tick_list, snapshot=snapshot)
        )
        return ticker

    async def unsubscribe_ticker(self, contract: Any) -> None:
        self._require_connected()
        self._ib.cancelMktData(contract)
        # ib_async does not expose reqId by contract reliably; replay registry is cleared on disconnect lifecycle.

    async def health_check(self) -> HealthStatus:
        connected = self.is_connected
        server_version = None
        if connected:
            try:
                server_version = int(self._ib.client.serverVersion())
            except Exception:
                server_version = None
        uptime = time.time() - self._connected_at if connected and self._connected_at else None
        return HealthStatus(
            connected=connected,
            host=self._config.host,
            port=self._config.port,
            client_id=self._config.client_id,
            server_version=server_version,
            account=self._account,
            uptime_seconds=uptime,
            reconnect_count=self._reconnect_count,
            subscription_count=self.subscription_count,
            state=self._reconnect_mgr.state.name.lower(),
            timestamp=time.time(),
        )

    @property
    def circuit_breaker_state(self) -> str:
        return self._circuit_breaker.state

    async def get_account_values(self) -> Dict[str, Any]:
        self._require_connected()
        values = await self._ib.accountSummaryAsync()
        return {value.tag: value.value for value in values}

    async def _on_reconnect(self) -> None:
        self._reconnect_count += 1
        self._connected_at = time.time()
        self._refresh_account()

    def _refresh_account(self) -> None:
        if not self.is_connected:
            return
        try:
            accounts = self._ib.managedAccounts()
        except Exception:
            accounts = []
        if accounts:
            self._account = self._config.account or accounts[0]

    def _setup_error_handler(self) -> None:
        error_event = getattr(self._ib, "errorEvent", None)
        if error_event is None:
            return

        def on_error(req_id: int, error_code: int, error_string: str, contract: Any = None) -> None:
            if error_code in _INFO_CODES:
                logger.debug("IBKR info [%s] %s (reqId=%s)", error_code, error_string, req_id)
            elif error_code in _SESSION_ERRORS:
                logger.error("IBKR session error [%s] %s (reqId=%s)", error_code, error_string, req_id)
            elif error_code in _DATA_ERRORS:
                logger.warning("IBKR data error [%s] %s (reqId=%s contract=%s)", error_code, error_string, req_id, contract)
            else:
                logger.warning("IBKR error [%s] %s (reqId=%s)", error_code, error_string, req_id)

        try:
            error_event += on_error
        except Exception:  # pragma: no cover
            logger.debug("Could not register IBKR error event", exc_info=True)

    def _require_connected(self) -> None:
        if not self.is_connected:
            raise ConnectionError("Not connected to IB Gateway. Call connect() first.")


def create_client_from_settings(settings: Optional[Settings] = None) -> IBKRClient:
    return IBKRClient(ClientConfig.from_settings(settings))


def create_paper_client(host: str = "localhost", port: int = 4002, client_id: int = 1, **kwargs: Any) -> IBKRClient:
    return IBKRClient(ClientConfig(host=host, port=port, client_id=client_id, **kwargs))


def create_live_client(host: str = "localhost", port: int = 4001, client_id: int = 1, **kwargs: Any) -> IBKRClient:
    return IBKRClient(ClientConfig(host=host, port=port, client_id=client_id, **kwargs))


async def test_connectivity(host: str = "localhost", port: int = 4002, timeout: float = 5.0) -> bool:
    try:
        conn = await asyncio.wait_for(
            asyncio.to_thread(socket.create_connection, (host, port), timeout=timeout),
            timeout=timeout + 1,
        )
        conn.close()
        return True
    except Exception:
        return False
