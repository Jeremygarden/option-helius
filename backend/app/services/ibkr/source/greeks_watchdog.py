"""
greeks_watchdog.py - Option Greeks Health Monitor
==================================================
Periodically scans all active option tickers for None modelGreeks
and automatically re-subscribes them.

Background:
  After IB Gateway reconnects (or during brief data-farm hiccups),
  some option tickers can get stuck with modelGreeks=None even though
  the subscription is technically still active. The root cause is
  usually a stale tick snapshot; cancelling and re-requesting the
  subscription clears it.

Usage:
    watchdog = GreeksWatchdog(client, interval_seconds=60)
    await watchdog.start()

    # ... do work ...

    await watchdog.stop()

Or as an async context manager:

    async with GreeksWatchdog(client) as watchdog:
        await run_dashboard()
"""

import asyncio
import random
import logging
from typing import List, Optional

try:
    from ib_async import Option
except ImportError:
    raise ImportError("ib-async is required. Install with: pip install ib-async")

logger = logging.getLogger(__name__)


class GreeksWatchdog:
    """
    Background task that monitors option tickers for stale (None) modelGreeks
    and automatically re-subscribes them.

    Attributes:
        interval_seconds: How often to scan (default: 60s).
        resubscribe_delay: Brief pause between cancel and re-request (default: 0.15s).
    """

    def __init__(
        self,
        client,  # IBKRClient instance
        interval_seconds: float = 60.0,
        resubscribe_delay: float = 0.15,
    ):
        self._client = client
        self._interval = interval_seconds
        self._resubscribe_delay = resubscribe_delay
        self._task: Optional[asyncio.Task] = None
        self._check_count: int = 0
        self._resubscribe_count: int = 0

    # ---- Context manager ----

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()
        return False

    # ---- Public API ----

    async def start(self) -> None:
        """Start the background watchdog loop."""
        if self._task and not self._task.done():
            logger.warning("GreeksWatchdog is already running")
            return
        self._task = asyncio.create_task(self._watch_loop(), name="greeks-watchdog")
        logger.info(
            f"GreeksWatchdog started (interval={self._interval}s)"
        )

    async def stop(self) -> None:
        """Stop the watchdog loop gracefully."""
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info(
            f"GreeksWatchdog stopped "
            f"(checks={self._check_count}, resubscribes={self._resubscribe_count})"
        )

    @property
    def stats(self) -> dict:
        """Return watchdog statistics."""
        return {
            "check_count": self._check_count,
            "resubscribe_count": self._resubscribe_count,
            "interval_seconds": self._interval,
            "running": self._task is not None and not self._task.done(),
        }

    # ---- Internal ----

    async def _watch_loop(self) -> None:
        """Main loop: sleep then check, forever.
        
        Uses ±10% jitter on the interval to prevent synchronized polling
        when multiple watchdog instances run concurrently.
        """
        while True:
            jitter = self._interval * 0.1 * (random.random() * 2 - 1)  # ±10%
            await asyncio.sleep(max(1.0, self._interval + jitter))
            try:
                await self._check_greeks()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error(f"GreeksWatchdog check failed: {e}", exc_info=True)

    async def _check_greeks(self) -> None:
        """
        Scan all tickers. For any Option ticker with modelGreeks=None,
        cancel and re-request market data.
        """
        self._check_count += 1
        ib = self._client.ib

        if not ib.isConnected():
            logger.debug("GreeksWatchdog: IB not connected, skipping check")
            return

        bad_tickers = []
        for ticker in ib.tickers():
            contract = ticker.contract
            if not isinstance(contract, Option):
                continue
            if ticker.modelGreeks is None:
                bad_tickers.append(ticker)

        if not bad_tickers:
            logger.debug(
                f"GreeksWatchdog check #{self._check_count}: all option Greeks OK"
            )
            return

        logger.warning(
            f"GreeksWatchdog check #{self._check_count}: "
            f"{len(bad_tickers)} option ticker(s) have None modelGreeks — re-subscribing"
        )

        fixed = 0
        failed = 0
        for ticker in bad_tickers:
            contract = ticker.contract
            desc = (
                f"{contract.symbol} "
                f"{getattr(contract, 'lastTradeDateOrContractMonth', '?')} "
                f"{getattr(contract, 'strike', '?')}"
                f"{getattr(contract, 'right', '')}"
            )
            try:
                # Cancel stale subscription
                ib.cancelMktData(contract)
                await asyncio.sleep(self._resubscribe_delay)

                # Re-request with Greeks tick types
                # 100=OptionVolume 101=OptionOpenInterest 106=ImpliedVol
                ib.reqMktData(contract, "100,101,106", False, False)

                self._resubscribe_count += 1
                fixed += 1
                logger.debug(f"  Re-subscribed: {desc}")
            except Exception as e:
                failed += 1
                logger.error(f"  Failed to re-subscribe {desc}: {e}")

        logger.info(
            f"GreeksWatchdog: re-subscribed {fixed} ticker(s), {failed} failed"
        )


# ---- Standalone test helper ----

async def _demo():
    """
    Quick standalone demo — connect to a running IB Gateway
    and start the watchdog for 5 minutes.
    """
    import sys
    sys.path.insert(0, ".")
    from ibkr_client import IBKRClient, ClientConfig

    logging.basicConfig(level=logging.INFO)

    config = ClientConfig(host="127.0.0.1", port=4002, client_id=99)
    async with IBKRClient(config) as client:
        async with GreeksWatchdog(client, interval_seconds=30) as watchdog:
            print("Watchdog running for 5 minutes... press Ctrl+C to stop")
            await asyncio.sleep(300)
        print(f"Final stats: {watchdog.stats}")


if __name__ == "__main__":
    asyncio.run(_demo())
