"""
option_chain.py - Option Chain Fetcher with Greeks
===================================================
Fetches option chains from IB Gateway and subscribes to live
Greeks (delta, gamma, theta, vega, IV) using ib_async.

Key IB API pitfalls handled:
  1. Ticker subscription limit (100/account): ATM window filtering
  2. Underlying MUST be subscribed first for Greeks to calculate
  3. reqSecDefOptParams for chain discovery (strikes/expirations)
  4. Greeks via genericTickList='101' (reqMktData tick type)
  5. Paper account requires live market data subscription

Usage:
    chain = OptionChainFetcher(client)
    options = await chain.get_atm_chain("AAPL", "2024-01-19", strike_radius=5)
    for opt in options:
        print(f"{opt.strike}: delta={opt.delta}, iv={opt.impl_vol}")
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple

try:
    from ib_async import IB, Contract, Option, Stock, Ticker, util
    from ib_async.contract import ContractDetails, OptionChain
except ImportError:
    raise ImportError(
        "ib-async is required. Install with: pip install ib-async"
    )

logger = logging.getLogger(__name__)

# IB generic tick list for option market data
# 100 = Option Volume
# 101 = Option Open Interest + Greeks (delta, gamma, theta, vega, IV)
# 104 = Historical volatility (30-day HV)
# 106 = Implied volatility index
OPTION_TICK_LIST = "100,101"
UNDERLYING_TICK_LIST = "100,101,104,106"

# Max simultaneous market data subscriptions per IB account
IB_MAX_TICKERS = 100

# Reserve some slots for underlying subscriptions
UNDERLYING_SLOTS_RESERVED = 5


@dataclass
class GreekSnapshot:
    """Option Greeks at a point in time."""

    # Contract info
    symbol: str
    expiration: str   # YYYYMMDD
    strike: float
    right: str        # 'C' or 'P'

    # Market data
    bid: Optional[float] = None
    ask: Optional[float] = None
    last: Optional[float] = None
    volume: Optional[float] = None
    open_interest: Optional[float] = None

    # Greeks (from IB model)
    delta: Optional[float] = None
    gamma: Optional[float] = None
    theta: Optional[float] = None
    vega: Optional[float] = None
    impl_vol: Optional[float] = None

    # Underlying price at time of snapshot
    underlying_price: Optional[float] = None

    # Metadata
    timestamp: Optional[float] = None
    req_id: Optional[int] = None


@dataclass
class ChainSpec:
    """Specification for an option chain subscription."""

    underlying_symbol: str
    exchange: str = "SMART"
    currency: str = "USD"
    expiration: Optional[str] = None  # YYYYMMDD; None = nearest expiry
    strike_radius: int = 5            # strikes above/below ATM to include


class OptionChainFetcher:
    """
    Fetches option chains with Greeks from IB Gateway.

    Handles the two most common IB pitfalls:
    1. Ticker limit: Only subscribes to ATM ± N strikes (dynamic filtering)
    2. Underlying first: Always subscribes underlying before options

    Example:
        async with IBKRClient(port=4002) as client:
            fetcher = OptionChainFetcher(client.ib)

            # Get ATM options for AAPL with Greeks
            greeks = await fetcher.subscribe_atm_chain("AAPL", strike_radius=5)

            # Await first update
            await asyncio.sleep(2)

            # Read Greeks
            for ticker in greeks.values():
                print(fetcher.extract_greeks(ticker))
    """

    def __init__(self, ib: IB):
        self._ib = ib

        # Track active subscriptions: symbol -> list of Tickers
        self._underlying_tickers: Dict[str, Ticker] = {}
        self._option_tickers: Dict[str, List[Ticker]] = {}  # symbol -> [Ticker]

        # Track subscription counts
        self._subscription_count: int = 0
        self._max_option_subs: int = IB_MAX_TICKERS - UNDERLYING_SLOTS_RESERVED

    # ---- Public API ----

    async def get_option_chain_params(
        self, symbol: str, exchange: str = "SMART", currency: str = "USD"
    ) -> List[OptionChain]:
        """
        Fetch available strikes and expirations for a symbol.
        Uses reqSecDefOptParams - does NOT consume ticker quota.

        Returns list of OptionChain (contains strikes and expirations).
        """
        # Build underlying contract
        stock = Stock(symbol, exchange, currency)
        await self._ib.qualifyContractsAsync(stock)

        logger.info(f"Fetching option chain params for {symbol}...")
        chains = await self._ib.reqSecDefOptParamsAsync(
            underlyingSymbol=symbol,
            futFopExchange="",
            underlyingSecType="STK",
            underlyingConId=stock.conId,
        )

        # Filter to SMART/relevant exchange
        smart_chains = [c for c in chains if c.exchange in ("SMART", "CBOE", exchange)]
        if not smart_chains:
            smart_chains = chains

        logger.info(
            f"Found {len(chains)} chain(s) for {symbol}; "
            f"using {len(smart_chains)} after exchange filter"
        )
        return smart_chains

    async def get_underlying_price(self, symbol: str) -> Optional[float]:
        """
        Get current underlying price.
        Subscribes to underlying market data if not already subscribed.

        ⚠️  IB PITFALL: Must subscribe underlying BEFORE options.
            Without underlying price, IB cannot compute option Greeks.
        """
        if symbol in self._underlying_tickers:
            ticker = self._underlying_tickers[symbol]
        else:
            ticker = await self._subscribe_underlying(symbol)

        # Wait up to 5s for price
        for _ in range(50):
            price = ticker.marketPrice()
            if price and price > 0:
                return price
            await asyncio.sleep(0.1)

        return None

    async def subscribe_atm_chain(
        self,
        symbol: str,
        expiration: Optional[str] = None,
        strike_radius: int = 5,
        exchange: str = "SMART",
        currency: str = "USD",
        include_puts: bool = True,
        include_calls: bool = True,
    ) -> Dict[str, Ticker]:
        """
        Subscribe to live Greeks for ATM options.

        Automatically:
        1. Subscribes underlying first (required for Greeks)
        2. Finds nearest expiry if none specified
        3. Filters to ATM ± strike_radius strikes
        4. Respects 100-ticker limit

        Args:
            symbol: Underlying symbol (e.g., "AAPL")
            expiration: YYYYMMDD expiry, or None for nearest
            strike_radius: Strikes above/below ATM to include
            exchange: Exchange (default: SMART)
            currency: Currency (default: USD)
            include_puts: Include put options
            include_calls: Include call options

        Returns:
            Dict of "STRIKE_RIGHT" -> Ticker (live updated)

        ⚠️  Paper trading market data note:
            Paper trading accounts use live data subscriptions.
            If you don't have market data subscriptions, IB will
            return delayed or no data. Add subscriptions in IBKR
            account management.
        """
        logger.info(
            f"Subscribing ATM chain for {symbol} "
            f"expiry={expiration or 'nearest'} "
            f"radius=±{strike_radius}"
        )

        # Step 1: Subscribe underlying FIRST (required for Greeks)
        underlying_ticker = await self._subscribe_underlying(symbol, exchange, currency)

        # Step 2: Wait for underlying price
        underlying_price = None
        logger.info(f"Waiting for {symbol} underlying price...")
        for i in range(100):  # Up to 10s
            underlying_price = underlying_ticker.marketPrice()
            if underlying_price and underlying_price > 0:
                break
            await asyncio.sleep(0.1)

        if not underlying_price:
            logger.warning(
                f"Could not get {symbol} underlying price. "
                f"Greeks may not compute correctly."
            )
            # Use last known or fallback
            underlying_price = underlying_ticker.last or underlying_ticker.close or 0

        logger.info(f"{symbol} underlying price: {underlying_price:.2f}")

        # Step 3: Get option chain parameters
        chains = await self.get_option_chain_params(symbol, exchange, currency)
        if not chains:
            raise ValueError(f"No option chains found for {symbol}")

        chain = chains[0]  # Use first (usually SMART)

        # Step 4: Select expiration
        target_expiry = expiration or self._nearest_expiry(chain.expirations)
        if target_expiry not in chain.expirations:
            # Find closest
            target_expiry = min(
                chain.expirations,
                key=lambda e: abs((datetime.strptime(e, "%Y%m%d").date() - date.today()).days),
            )
        logger.info(f"Using expiration: {target_expiry}")

        # Step 5: Select ATM strikes
        atm_strikes = self._select_atm_strikes(
            all_strikes=sorted(chain.strikes),
            underlying_price=underlying_price,
            radius=strike_radius,
        )
        logger.info(
            f"ATM filter: price={underlying_price:.2f}, "
            f"strikes={[str(s) for s in atm_strikes]}"
        )

        # Step 6: Build option contracts
        rights = []
        if include_calls:
            rights.append("C")
        if include_puts:
            rights.append("P")

        options = [
            Option(symbol, target_expiry, strike, right, exchange)
            for strike in atm_strikes
            for right in rights
        ]

        # Step 7: Qualify contracts (get conId) - MANDATORY before subscribing
        # ⚠️  AUDIT FIX #15: qualifyContractsAsync is required!
        #   reqSecDefOptParams returns "definition" objects (no conId).
        #   Subscribing an unqualified contract causes a SILENT FAILURE -
        #   IB accepts the request but never sends data back.
        logger.info(f"Qualifying {len(options)} option contracts (reqSecDefOptParams -> qualifyContractsAsync)...")
        try:
            qualified = await self._ib.qualifyContractsAsync(*options)
        except Exception as e:
            logger.error(f"qualifyContractsAsync failed for {symbol}: {e}")
            raise

        # Only keep contracts that got a conId assigned (fully resolved)
        valid_options = [o for o in qualified if getattr(o, 'conId', 0)]
        rejected = len(options) - len(valid_options)
        if rejected:
            logger.warning(
                f"{rejected} contract(s) failed qualification for {symbol} "
                f"exp={target_expiry} and will be skipped. "
                f"Common causes: expired contract, invalid strike, exchange mismatch."
            )
        logger.info(f"Qualified {len(valid_options)}/{len(options)} option contracts")

        # Step 8: Enforce ticker limit
        available_slots = self._max_option_subs - self._subscription_count
        if len(valid_options) > available_slots:
            logger.warning(
                f"Ticker limit: {len(valid_options)} options but only "
                f"{available_slots} slots available. Trimming to ATM-nearest."
            )
            valid_options = self._trim_to_slot_limit(
                valid_options, underlying_price, available_slots
            )

        # Step 9: Subscribe to market data with Greeks tick list
        result: Dict[str, Ticker] = {}
        for opt in valid_options:
            key = f"{opt.strike}_{opt.right}"
            ticker = self._ib.reqMktData(opt, OPTION_TICK_LIST, False, False)
            result[key] = ticker
            self._subscription_count += 1

        # Track for cleanup
        self._option_tickers[symbol] = list(result.values())

        logger.info(
            f"Subscribed to {len(result)} option tickers for {symbol}. "
            f"Total subscriptions: {self._subscription_count}"
        )
        return result

    def extract_greeks(self, ticker: Ticker) -> Optional[GreekSnapshot]:
        """
        Extract Greeks from a live ticker.
        Greeks are populated asynchronously by IB after subscription.

        Returns None if Greeks not yet available.
        """
        if not ticker.contract:
            return None

        contract = ticker.contract
        if not hasattr(contract, 'strike'):
            return None

        # modelGreeks is the IB model-computed Greeks
        greeks = ticker.modelGreeks

        if greeks is None:
            return None

        # Get underlying price
        underlying_price = None
        if ticker.modelGreeks:
            underlying_price = ticker.modelGreeks.undPrice

        return GreekSnapshot(
            symbol=contract.symbol,
            expiration=contract.lastTradeDateOrContractMonth,
            strike=contract.strike,
            right=contract.right,
            bid=ticker.bid,
            ask=ticker.ask,
            last=ticker.last,
            volume=ticker.volume,
            delta=greeks.delta,
            gamma=greeks.gamma,
            theta=greeks.theta,
            vega=greeks.vega,
            impl_vol=greeks.impliedVol,
            underlying_price=underlying_price,
            timestamp=ticker.time.timestamp() if ticker.time else None,
        )

    def extract_all_greeks(self, symbol: str) -> List[GreekSnapshot]:
        """Extract Greeks from all option tickers for a symbol."""
        tickers = self._option_tickers.get(symbol, [])
        results = []
        for ticker in tickers:
            snap = self.extract_greeks(ticker)
            if snap:
                results.append(snap)
        return results

    async def cancel_chain(self, symbol: str) -> None:
        """Cancel all market data subscriptions for a symbol."""
        # Cancel options
        for ticker in self._option_tickers.pop(symbol, []):
            try:
                self._ib.cancelMktData(ticker.contract)
                self._subscription_count = max(0, self._subscription_count - 1)
            except Exception as e:
                logger.warning(f"Failed to cancel option ticker: {e}")

        # Cancel underlying
        if symbol in self._underlying_tickers:
            ticker = self._underlying_tickers.pop(symbol)
            try:
                self._ib.cancelMktData(ticker.contract)
            except Exception as e:
                logger.warning(f"Failed to cancel underlying ticker: {e}")

        logger.info(f"Cancelled all subscriptions for {symbol}")

    # ---- Internal helpers ----

    async def _subscribe_underlying(
        self,
        symbol: str,
        exchange: str = "SMART",
        currency: str = "USD",
    ) -> Ticker:
        """
        Subscribe to underlying market data.

        ⚠️  This MUST be called before any option subscriptions.
            IB cannot compute Greeks without the underlying price feed.
        """
        if symbol in self._underlying_tickers:
            logger.debug(f"Underlying {symbol} already subscribed")
            return self._underlying_tickers[symbol]

        stock = Stock(symbol, exchange, currency)
        await self._ib.qualifyContractsAsync(stock)

        ticker = self._ib.reqMktData(stock, UNDERLYING_TICK_LIST, False, False)
        self._underlying_tickers[symbol] = ticker
        logger.info(f"Subscribed underlying {symbol} (required for option Greeks)")
        return ticker

    def _nearest_expiry(self, expirations: List[str]) -> str:
        """Find the nearest expiration date from a list of YYYYMMDD strings."""
        today = date.today()
        future_expiries = [
            e for e in expirations
            if datetime.strptime(e, "%Y%m%d").date() >= today
        ]
        if not future_expiries:
            return min(expirations)  # fallback
        return min(future_expiries)

    def _select_atm_strikes(
        self,
        all_strikes: List[float],
        underlying_price: float,
        radius: int,
    ) -> List[float]:
        """
        Select strikes within 'radius' positions of ATM.

        ⚠️  IB PITFALL: Ticker limit is 100 per account.
            This method filters to ATM ± radius to stay within limits.
            Adjust radius based on how many expirations you're tracking.
        """
        if not all_strikes:
            return []

        # Find the index of the closest strike to current price
        atm_idx = min(range(len(all_strikes)), key=lambda i: abs(all_strikes[i] - underlying_price))

        lo = max(0, atm_idx - radius)
        hi = min(len(all_strikes), atm_idx + radius + 1)

        return all_strikes[lo:hi]

    def _trim_to_slot_limit(
        self,
        contracts: List[Contract],
        underlying_price: float,
        max_slots: int,
    ) -> List[Contract]:
        """
        Trim contract list to fit within ticker slot limit.
        Prioritizes contracts closest to ATM.
        """
        if not contracts or max_slots <= 0:
            return []

        # Sort by distance from ATM
        sorted_contracts = sorted(
            contracts,
            key=lambda c: abs(c.strike - underlying_price) if hasattr(c, 'strike') else 0
        )
        return sorted_contracts[:max_slots]
