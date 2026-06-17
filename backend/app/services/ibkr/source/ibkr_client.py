"""
ibkr_client.py - IB Gateway Connection Client
==============================================
Production-grade wrapper around ib_async.IB with:
  - Async connect/disconnect
  - Automatic reconnection via ReconnectManager
  - Health check endpoint
  - Connection state management
  - Structured logging

Usage:
    async with IBKRClient(host="127.0.0.1", port=4002) as client:
        await client.connect()
        # do work
        health = await client.health_check()
"""

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional

try:
    from ib_async import IB, Contract, Option, Ticker, util
except ImportError:
    raise ImportError(
        "ib-async is required. Install with: pip install ib-async\n"
        "Note: Use 'ib-async' (not 'ib_insync') - it's the maintained fork."
    )

from reconnect import ReconnectConfig, ReconnectManager, SubscriptionRecord

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Error code registry
# ---------------------------------------------------------------------------

_CRITICAL_ERRORS: Dict[int, str] = {
    1100: "Connectivity between IB and TWS has been lost",
    1300: "Socket port has been reset and destination port",
    10197: "No market data permissions for a competing session",
    354: "Requested market data is not subscribed – check account data subscriptions",
    320: "Server error when reading an API client request",
    10090: "Part of requested market data is not subscribed",
    200:  "No security definition found",
    162:  "Historical data Service error message",
    504:  "Not connected",
}

# Errors that indicate the session is broken and a reconnect is needed
_SESSION_ERRORS: frozenset = frozenset({1100, 1300, 504})

# Errors that indicate data-subscription problems (user action required)
_DATA_ERRORS: frozenset = frozenset({354, 10090, 10197})

# Info-level codes that are expected and should not be treated as warnings
_INFO_CODES: frozenset = frozenset({2104, 2106, 2108, 2119, 2158})


@dataclass
class ClientConfig:
    """Configuration for IBKRClient."""

    host: str = "127.0.0.1"
    port: int = 4002  # Default: paper trading
    client_id: int = 1

    # Reconnect settings
    reconnect: ReconnectConfig = None

    # Timeout for initial connection
    connect_timeout: float = 30.0

    # Read-only mode: don't allow order placement
    readonly: bool = True

    # Account filter (empty = use first available)
    account: str = ""

    def __post_init__(self):
        if self.reconnect is None:
            self.reconnect = ReconnectConfig(
                base_delay=float(os.getenv("RECONNECT_DELAY", "5")),
                max_attempts=int(os.getenv("MAX_RECONNECT_ATTEMPTS", "0")),
            )


@dataclass
class HealthStatus:
    """Health check result."""

    connected: bool
    host: str
    port: int
    client_id: int
    server_version: Optional[int]
    account: Optional[str]
    uptime_seconds: Optional[float]
    reconnect_count: int
    timestamp: float


class IBKRClient:
    """
    Production IBKR data client with automatic reconnection.

    Features:
    - Connects to IB Gateway (paper or live)
    - Auto-reconnects on disconnect with exponential backoff
    - Tracks and re-subscribes all market data on reconnect
    - Health check endpoint
    - Can be used as async context manager

    Example:
        config = ClientConfig(host="127.0.0.1", port=4002, client_id=1)
        client = IBKRClient(config)
        await client.connect()

        # Subscribe to a stock
        contract = Stock("AAPL", "SMART", "USD")
        ticker = await client.subscribe_ticker(contract)

        # Check health
        health = await client.health_check()
        print(f"Connected: {health.connected}")

        # Cleanup
        await client.disconnect()
    """

    def __init__(self, config: Optional[ClientConfig] = None, **kwargs):
        """
        Create IBKRClient.

        Args:
            config: ClientConfig instance, or pass individual kwargs
            **kwargs: host, port, client_id, etc. (shorthand for ClientConfig)
        """
        if config is None:
            config = ClientConfig(**kwargs)
        self._config = config

        # ib_async IB instance
        self._ib = IB()

        # Reconnect manager
        self._reconnect_mgr = ReconnectManager(
            ib=self._ib,
            host=config.host,
            port=config.port,
            client_id=config.client_id,
            config=config.reconnect,
        )

        # State
        self._connected_at: Optional[float] = None
        self._reconnect_count: int = 0
        self._account: Optional[str] = None

        # Wire up reconnect events
        self._reconnect_mgr.on_reconnect(self._on_reconnect)

        # Wire up structured error handler
        self._setup_error_handler()

    # ---- Context manager support ----

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()
        return False

    # ---- Connection management ----

    async def connect(self) -> None:
        """Connect to IB Gateway and start reconnect monitoring."""
        logger.info(
            f"Connecting to IB Gateway at {self._config.host}:{self._config.port} "
            f"(clientId={self._config.client_id})"
        )
        await self._reconnect_mgr.start()
        self._connected_at = time.time()

        # Load account info
        if self._ib.isConnected():
            accounts = self._ib.managedAccounts()
            if accounts:
                target = self._config.account or accounts[0]
                self._account = target
                logger.info(f"Using account: {self._account}")

    async def disconnect(self) -> None:
        """Disconnect from IB Gateway."""
        logger.info("Disconnecting from IB Gateway")
        await self._reconnect_mgr.stop()
        self._connected_at = None

    @property
    def is_connected(self) -> bool:
        return self._ib.isConnected()

    @property
    def ib(self) -> IB:
        """Direct access to underlying ib_async.IB (for advanced use)."""
        return self._ib

    # ---- Market data ----

    async def subscribe_ticker(
        self,
        contract: Contract,
        generic_tick_list: str = "",
        snapshot: bool = False,
    ) -> Ticker:
        """
        Subscribe to market data for a contract.
        Automatically registered for replay on reconnect.

        Args:
            contract: ib_async Contract (Stock, Option, Future, etc.)
            generic_tick_list: IB generic tick type list (e.g., "100,101,104,106")
              - 100: Option Volume
              - 101: Option Open Interest
              - 104: Historical Volatility
              - 106: Implied Volatility
            snapshot: If True, request one-time snapshot instead of live feed

        Returns:
            ib_async Ticker object (updated in real-time)

        ⚠️  IMPORTANT: Always subscribe to the underlying BEFORE options!
            IB requires underlying price to compute option Greeks correctly.
            See option_chain.py for correct subscription order.
        """
        self._require_connected()

        # Guard 1: enforce subscription limit
        max_tickers = int(os.getenv("MAX_TICKERS", "100"))
        current_count = self._reconnect_mgr.tracked_subscription_count
        if current_count >= max_tickers:
            raise RuntimeError(
                f"Ticker subscription limit reached ({current_count}/{max_tickers}). "
                f"Cancel unused tickers with unsubscribe_ticker() before adding new ones. "
                f"Adjust ATM_STRIKE_RADIUS in .env to reduce the option window size."
            )

        # Guard 2: for options, warn if underlying is not already subscribed
        if isinstance(contract, Option):
            underlying_symbol = contract.symbol
            underlying_subscribed = any(
                rec.contract.symbol == underlying_symbol
                and not isinstance(rec.contract, Option)
                for rec in self._reconnect_mgr._subscriptions.values()
            )
            if not underlying_subscribed:
                logger.warning(
                    f"⚠️  Subscribing to option {underlying_symbol} "
                    f"{contract.strike}{contract.right} without an underlying subscription! "
                    f"modelGreeks will be None until Stock('{underlying_symbol}', 'SMART', 'USD') "
                    f"is also subscribed. Call subscribe_ticker(underlying) first."
                )

        ticker = self._ib.reqMktData(contract, generic_tick_list, snapshot, False)

        # Register for reconnect replay
        req_id = ticker.reqId if hasattr(ticker, 'reqId') else id(ticker)
        self._reconnect_mgr.track_subscription(SubscriptionRecord(
            req_id=req_id,
            contract=contract,
            generic_tick_list=generic_tick_list,
            snapshot=snapshot,
        ))

        logger.debug(f"Subscribed to {contract.symbol} reqId={req_id} ticks='{generic_tick_list}'")
        return ticker

    async def unsubscribe_ticker(self, contract: Contract) -> None:
        """Cancel market data subscription for a contract."""
        self._require_connected()
        self._ib.cancelMktData(contract)
        logger.debug(f"Unsubscribed from {contract.symbol}")

    # ---- Health check ----

    async def health_check(self) -> HealthStatus:
        """
        Return current health status.
        Can be polled by external monitoring systems.
        """
        connected = self._ib.isConnected()
        server_version = None
        account = self._account

        if connected:
            try:
                server_version = self._ib.client.serverVersion()
            except Exception:
                pass

        uptime = None
        if self._connected_at and connected:
            uptime = time.time() - self._connected_at

        return HealthStatus(
            connected=connected,
            host=self._config.host,
            port=self._config.port,
            client_id=self._config.client_id,
            server_version=server_version,
            account=account,
            uptime_seconds=uptime,
            reconnect_count=self._reconnect_count,
            timestamp=time.time(),
        )

    # ---- Account info ----

    async def get_account_values(self) -> Dict[str, Any]:
        """Fetch current account values (cash, net liquidation, etc.)."""
        self._require_connected()
        values = await self._ib.accountSummaryAsync()
        return {v.tag: v.value for v in values}

    # ---- Internal callbacks ----

    async def _on_reconnect(self) -> None:
        """Called by ReconnectManager after successful reconnection."""
        self._reconnect_count += 1
        self._connected_at = time.time()
        logger.info(f"Reconnected (total reconnects: {self._reconnect_count})")

        # Refresh account list
        accounts = self._ib.managedAccounts()
        if accounts:
            self._account = self._config.account or accounts[0]

    def _setup_error_handler(self) -> None:
        """Register structured error handler on ib.errorEvent."""

        def on_error(req_id: int, error_code: int, error_string: str, contract=None):
            # Suppress known informational codes
            if error_code in _INFO_CODES:
                logger.debug(f"IB info [{error_code}] {error_string} (reqId={req_id})")
                return

            if error_code in _SESSION_ERRORS:
                logger.error(
                    f"IB SESSION error [{error_code}] {error_string} "
                    f"(reqId={req_id}) – reconnect will be triggered"
                )
            elif error_code in _DATA_ERRORS:
                logger.warning(
                    f"IB DATA error [{error_code}] {error_string} (reqId={req_id})"
                )
                if error_code == 10197:
                    logger.critical(
                        "⚠️  COMPETING SESSION detected! Another IBKR client "
                        "(phone app / TWS) is logged in on this account. "
                        "Market data will be unavailable until the other "
                        "session disconnects. Close all other IBKR clients."
                    )
                elif error_code in (354, 10090):
                    logger.error(
                        f"⚠️  Insufficient market data subscription for reqId={req_id}. "
                        f"Contract: {contract}. "
                        f"Check IBKR account subscriptions "
                        f"(OPRA for options, NASDAQ/NYSE for US stocks)."
                    )
            elif error_code in _CRITICAL_ERRORS:
                logger.error(
                    f"IB error [{error_code}] "
                    f"{_CRITICAL_ERRORS.get(error_code, error_string)} "
                    f"(reqId={req_id}, raw='{error_string}')"
                )
            else:
                # Unknown / unexpected error codes
                logger.warning(
                    f"IB unknown error [{error_code}] {error_string} (reqId={req_id})"
                )

        self._ib.errorEvent += on_error

    # ---- Internal helpers ----

    def _require_connected(self) -> None:
        """Raise if not connected."""
        if not self._ib.isConnected():
            raise ConnectionError(
                "Not connected to IB Gateway. Call connect() first."
            )


# ---- Convenience factory ----

def create_paper_client(
    host: str = "127.0.0.1",
    port: int = 4002,
    client_id: int = 1,
    **kwargs,
) -> IBKRClient:
    """Create a paper trading client with sensible defaults."""
    return IBKRClient(ClientConfig(host=host, port=port, client_id=client_id, **kwargs))


def create_live_client(
    host: str = "127.0.0.1",
    port: int = 4001,
    client_id: int = 1,
    **kwargs,
) -> IBKRClient:
    """Create a live trading client. Use with caution!"""
    return IBKRClient(ClientConfig(host=host, port=port, client_id=client_id, **kwargs))


# ---- Quick connectivity test ----

async def test_connectivity(host: str = "127.0.0.1", port: int = 4002) -> bool:
    """
    Quick async connectivity test - does NOT require IBKR auth.
    Uses raw TCP socket, same as smoke_test.py.
    """
    import socket
    loop = asyncio.get_event_loop()
    try:
        future = loop.run_in_executor(
            None,
            lambda: socket.create_connection((host, port), timeout=5)
        )
        conn = await asyncio.wait_for(future, timeout=10)
        conn.close()
        return True
    except Exception:
        return False
