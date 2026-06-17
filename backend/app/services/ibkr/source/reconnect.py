"""
reconnect.py - Auto-reconnection Logic for IB Gateway
======================================================
Handles automatic reconnection with exponential backoff after
IB Gateway disconnects. Also re-subscribes all active market
data subscriptions after reconnection.

Key behaviors:
  - Exponential backoff with jitter to avoid thundering herd
  - Re-subscribes all symbols on reconnect (IB does NOT auto-restore)
  - Tracks subscription state for replay after reconnect
  - Fires user callbacks on connect/disconnect/reconnect events
"""

import asyncio
import datetime
import logging
import random
import time
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Awaitable, Callable, Dict, List, Optional, Set

try:
    import pytz
    _HAS_PYTZ = True
except ImportError:
    _HAS_PYTZ = False

logger = logging.getLogger(__name__)


class ConnectionState(Enum):
    DISCONNECTED = auto()
    CONNECTING = auto()
    CONNECTED = auto()
    RECONNECTING = auto()


@dataclass
class ReconnectConfig:
    """Configuration for reconnection behavior."""

    # Base delay between reconnect attempts (seconds)
    base_delay: float = 5.0

    # Maximum delay cap (seconds)
    max_delay: float = 60.0

    # Exponential backoff multiplier
    backoff_factor: float = 2.0

    # Add random jitter to avoid thundering herd (0.0 = no jitter, 1.0 = full jitter)
    jitter_factor: float = 0.3

    # Max reconnect attempts (0 = unlimited)
    max_attempts: int = 0

    # Timeout for each connection attempt (seconds)
    connect_timeout: float = 30.0

    # Grace period after connection before marking as stable (seconds)
    stability_grace_period: float = 5.0


@dataclass
class SubscriptionRecord:
    """Record of an active market data subscription for replay on reconnect."""

    req_id: int
    contract: Any  # ib_async Contract
    generic_tick_list: str = ""
    snapshot: bool = False
    regulatory_snapshot: bool = False
    mkt_data_options: list = field(default_factory=list)

    # Timestamp when first subscribed
    subscribed_at: float = field(default_factory=time.time)


class ReconnectManager:
    """
    Manages automatic reconnection to IB Gateway.

    Usage:
        manager = ReconnectManager(ib_client, config=ReconnectConfig())
        manager.on_reconnect(my_resubscribe_callback)
        await manager.start()

    The manager monitors connection state and automatically:
    1. Detects disconnection
    2. Waits with exponential backoff
    3. Reconnects to gateway
    4. Re-subscribes all tracked market data subscriptions
    5. Fires registered callbacks
    """

    def __init__(
        self,
        ib,  # ib_async.IB instance
        host: str = "127.0.0.1",
        port: int = 4002,
        client_id: int = 1,
        config: Optional[ReconnectConfig] = None,
    ):
        self._ib = ib
        self._host = host
        self._port = port
        self._client_id = client_id
        self._config = config or ReconnectConfig()

        # State tracking
        self._state = ConnectionState.DISCONNECTED
        self._attempt_count = 0
        self._last_connected_at: Optional[float] = None
        self._reconnect_task: Optional[asyncio.Task] = None

        # Subscription registry: reqId -> SubscriptionRecord
        # These are replayed on every reconnect
        self._subscriptions: Dict[int, SubscriptionRecord] = {}

        # Event callbacks
        self._on_connect_callbacks: List[Callable[[], Awaitable[None]]] = []
        self._on_disconnect_callbacks: List[Callable[[], Awaitable[None]]] = []
        self._on_reconnect_callbacks: List[Callable[[], Awaitable[None]]] = []

        # Wire up IB disconnect event
        self._ib.disconnectedEvent += self._on_ib_disconnected

    # ---- Public API ----

    def track_subscription(self, record: SubscriptionRecord) -> None:
        """Register a subscription for replay on reconnect."""
        self._subscriptions[record.req_id] = record
        logger.debug(f"Tracking subscription reqId={record.req_id} contract={record.contract.symbol}")

    def untrack_subscription(self, req_id: int) -> None:
        """Remove a subscription from the replay registry."""
        self._subscriptions.pop(req_id, None)
        logger.debug(f"Removed subscription reqId={req_id}")

    def clear_subscriptions(self) -> None:
        """Clear all tracked subscriptions."""
        self._subscriptions.clear()

    @property
    def tracked_subscription_count(self) -> int:
        return len(self._subscriptions)

    @property
    def state(self) -> ConnectionState:
        return self._state

    @property
    def is_connected(self) -> bool:
        return self._state == ConnectionState.CONNECTED

    def on_connect(self, callback: Callable[[], Awaitable[None]]) -> None:
        """Register a callback to fire when (re)connected."""
        self._on_connect_callbacks.append(callback)

    def on_disconnect(self, callback: Callable[[], Awaitable[None]]) -> None:
        """Register a callback to fire when disconnected."""
        self._on_disconnect_callbacks.append(callback)

    def on_reconnect(self, callback: Callable[[], Awaitable[None]]) -> None:
        """Register a callback to fire after successful reconnection."""
        self._on_reconnect_callbacks.append(callback)

    async def start(self) -> None:
        """Connect and begin monitoring. Blocks until connected."""
        await self._connect()

    async def stop(self) -> None:
        """Disconnect and stop reconnection monitoring."""
        if self._reconnect_task and not self._reconnect_task.done():
            self._reconnect_task.cancel()
            try:
                await self._reconnect_task
            except asyncio.CancelledError:
                pass

        if self._ib.isConnected():
            self._ib.disconnect()

        self._state = ConnectionState.DISCONNECTED

    # ---- Connection logic ----

    async def _connect(self) -> None:
        """Attempt to connect to IB Gateway."""
        self._state = ConnectionState.CONNECTING
        logger.info(f"Connecting to IB Gateway at {self._host}:{self._port} (clientId={self._client_id})")

        try:
            await asyncio.wait_for(
                self._ib.connectAsync(self._host, self._port, clientId=self._client_id),
                timeout=self._config.connect_timeout,
            )
            self._state = ConnectionState.CONNECTED
            self._last_connected_at = time.time()
            self._attempt_count = 0
            logger.info("Connected to IB Gateway")
            await self._fire_callbacks(self._on_connect_callbacks)

        except asyncio.TimeoutError:
            self._state = ConnectionState.DISCONNECTED
            raise ConnectionError(f"Connection timeout after {self._config.connect_timeout}s")
        except Exception as e:
            self._state = ConnectionState.DISCONNECTED
            raise ConnectionError(f"Connection failed: {e}") from e

    async def _on_ib_disconnected(self) -> None:
        """Called by ib_async when connection is lost."""
        if self._state in (ConnectionState.DISCONNECTED, ConnectionState.RECONNECTING):
            return  # Already handling disconnect

        logger.warning("IB Gateway disconnected - starting reconnect loop")
        self._state = ConnectionState.RECONNECTING

        await self._fire_callbacks(self._on_disconnect_callbacks)

        # Launch reconnect in background
        self._reconnect_task = asyncio.create_task(self._reconnect_loop())

    async def _reconnect_loop(self) -> None:
        """
        Reconnect loop with exponential backoff.
        After reconnect, replays all tracked subscriptions.
        During IBKR nightly maintenance window (ET 23:45-00:45), waits
        5 minutes between attempts instead of hammering the server.
        """
        attempt = 0
        delay = self._config.base_delay

        while True:
            attempt += 1
            self._attempt_count += 1

            # Check attempt limit
            if self._config.max_attempts > 0 and attempt > self._config.max_attempts:
                logger.error(f"Max reconnect attempts ({self._config.max_attempts}) reached. Giving up.")
                self._state = ConnectionState.DISCONNECTED
                return

            # Check if we're in IBKR nightly maintenance window
            if _is_ibkr_maintenance_window():
                maint_wait = 300  # 5 minutes
                logger.info(
                    f"In IBKR nightly maintenance window (ET 23:45-00:45). "
                    f"Waiting {maint_wait}s before reconnect attempt {attempt}..."
                )
                await asyncio.sleep(maint_wait)
                continue

            logger.info(f"Reconnect attempt {attempt} in {delay:.1f}s...")
            await asyncio.sleep(delay)

            try:
                await self._connect()

                # Re-subscribe all tracked subscriptions
                await self._resubscribe_all()

                # Fire reconnect callbacks
                await self._fire_callbacks(self._on_reconnect_callbacks)

                logger.info(f"Reconnected successfully after {attempt} attempt(s)")
                return

            except Exception as e:
                logger.warning(f"Reconnect attempt {attempt} failed: {e}")

                # Compute next delay with exponential backoff + jitter
                delay = min(delay * self._config.backoff_factor, self._config.max_delay)
                if self._config.jitter_factor > 0:
                    jitter = delay * self._config.jitter_factor * random.random()
                    delay = delay + jitter

    async def _resubscribe_all(self) -> None:
        """
        Re-subscribe all tracked market data subscriptions.

        ⚠️  IMPORTANT: After IB Gateway disconnects and reconnects, ALL
        market data subscriptions are lost. You MUST re-request each one.
        IB does not auto-restore subscriptions.
        """
        if not self._subscriptions:
            logger.info("No subscriptions to restore")
            return

        count = len(self._subscriptions)
        logger.info(f"Re-subscribing {count} market data subscription(s) after reconnect...")

        restored = 0
        failed = 0

        for req_id, record in self._subscriptions.items():
            try:
                # Cancel any stale ticker first (may or may not exist)
                try:
                    self._ib.cancelMktData(record.contract)
                except Exception:
                    pass  # Ignore cancel errors

                # Re-request market data
                self._ib.reqMktData(
                    record.contract,
                    record.generic_tick_list,
                    record.snapshot,
                    record.regulatory_snapshot,
                    record.mkt_data_options,
                )
                restored += 1
                logger.debug(f"  Restored reqId={req_id} symbol={record.contract.symbol}")

            except Exception as e:
                failed += 1
                logger.error(f"  Failed to restore reqId={req_id} symbol={record.contract.symbol}: {e}")

        logger.info(f"Re-subscription complete: {restored} restored, {failed} failed")

    async def _fire_callbacks(self, callbacks: List[Callable]) -> None:
        """Fire a list of async callbacks."""
        for cb in callbacks:
            try:
                if asyncio.iscoroutinefunction(cb):
                    await cb()
                else:
                    cb()
            except Exception as e:
                logger.error(f"Error in reconnect callback {cb.__name__}: {e}")


def compute_backoff_delay(
    attempt: int,
    base_delay: float = 5.0,
    max_delay: float = 60.0,
    backoff_factor: float = 2.0,
    jitter_factor: float = 0.3,
) -> float:
    """
    Compute exponential backoff delay for reconnect attempt N.

    Example delays with defaults:
      Attempt 1: ~5.0s
      Attempt 2: ~10.0s
      Attempt 3: ~20.0s
      Attempt 4: ~40.0s
      Attempt 5+: ~60.0s (capped)
    """
    delay = min(base_delay * (backoff_factor ** (attempt - 1)), max_delay)
    if jitter_factor > 0:
        jitter = delay * jitter_factor * random.random()
        delay += jitter
    return delay


def _is_ibkr_maintenance_window() -> bool:
    """
    Returns True if current wall-clock time falls in IBKR's nightly
    maintenance window (approximately ET 23:45 - 00:45).

    During this window the reconnect loop should back off aggressively
    rather than hammering the server with rapid retries.
    """
    if _HAS_PYTZ:
        et = pytz.timezone("America/New_York")
        now_et = datetime.datetime.now(et).time()
    else:
        # Fallback: use UTC-5 as a rough Eastern approximation
        utc_now = datetime.datetime.utcnow()
        et_offset = datetime.timedelta(hours=5)
        now_et = (utc_now - et_offset).time()

    # Window: 23:45 -> midnight -> 00:45
    return now_et >= datetime.time(23, 45) or now_et < datetime.time(0, 45)
