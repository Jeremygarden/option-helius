import asyncio
import sys
import types
from types import SimpleNamespace

from app.core.config import Settings
from app.services.ibkr.client import ClientConfig, IBKRClient
from app.services.ibkr.fetcher import ChainRequest, OptionChainFetcher


class Event:
    def __iadd__(self, handler):
        return self


class FakeContract:
    def __init__(self, symbol, lastTradeDateOrContractMonth=None, strike=0, right="", exchange="SMART", secType="STK"):
        self.symbol = symbol
        self.lastTradeDateOrContractMonth = lastTradeDateOrContractMonth
        self.strike = strike
        self.right = right
        self.exchange = exchange
        self.secType = secType
        self.conId = 0
        self.localSymbol = f"{symbol}{lastTradeDateOrContractMonth or ''}{right}{strike or ''}"


class FakeStock(FakeContract):
    def __init__(self, symbol, exchange="SMART", currency="USD"):
        super().__init__(symbol, exchange=exchange, secType="STK")
        self.currency = currency


class FakeOption(FakeContract):
    def __init__(self, symbol, expiration, strike, right, exchange="SMART"):
        super().__init__(symbol, expiration, strike, right, exchange, secType="OPT")


class FakeTicker:
    def __init__(self, contract):
        self.contract = contract
        self.reqId = id(self)
        self.bid = 4.8
        self.ask = 5.2
        self.last = 5.0
        self.volume = 123
        self.callOpenInterest = 456
        self.putOpenInterest = 321
        self.modelGreeks = SimpleNamespace(delta=0.52, gamma=0.04, theta=-0.02, vega=0.15, impliedVol=0.25)

    def marketPrice(self):
        return 100.0 if self.contract.secType == "STK" else self.last


class FakeIB:
    def __init__(self):
        self.connected = True
        self.disconnectedEvent = Event()
        self.errorEvent = Event()
        self.client = SimpleNamespace(serverVersion=lambda: 178)
        self.tickers = []

    async def connectAsync(self, *args, **kwargs):
        self.connected = True

    def isConnected(self):
        return self.connected

    def disconnect(self):
        self.connected = False

    def managedAccounts(self):
        return ["DU123"]

    async def qualifyContractsAsync(self, *contracts):
        for idx, contract in enumerate(contracts, start=1):
            contract.conId = idx
        return list(contracts)

    async def reqSecDefOptParamsAsync(self, **kwargs):
        return [SimpleNamespace(exchange="SMART", expirations={"20990120", "20990217"}, strikes={80, 90, 95, 100, 105, 110, 120})]

    def reqMktData(self, contract, generic_tick_list, snapshot, regulatory_snapshot, options=None):
        ticker = FakeTicker(contract)
        self.tickers.append(ticker)
        return ticker

    def cancelMktData(self, contract):
        pass


def install_fake_ib_async(monkeypatch):
    module = types.ModuleType("ib_async")
    module.Stock = FakeStock
    module.Option = FakeOption
    monkeypatch.setitem(sys.modules, "ib_async", module)


def test_fetcher_selects_atm_window(monkeypatch):
    install_fake_ib_async(monkeypatch)
    client = IBKRClient(ClientConfig(), ib=FakeIB())
    fetcher = OptionChainFetcher(client, settings=Settings(max_tickers=100, atm_strike_radius=1))

    assert fetcher._select_atm_strikes([80, 90, 95, 100, 105, 110], 101, 1) == [95.0, 100.0, 105.0]


def test_fetch_option_chain_returns_option_helius_shape(monkeypatch):
    install_fake_ib_async(monkeypatch)

    async def scenario():
        client = IBKRClient(ClientConfig(), ib=FakeIB())
        fetcher = OptionChainFetcher(client, settings=Settings(max_tickers=100, atm_strike_radius=1))
        result = await fetcher.fetch_option_chain(ChainRequest(symbol="SPY", expiration="2099-01-20", strike_radius=1, wait_seconds=0))

        assert result["ticker"] == "SPY"
        assert result["expiry"] == "2099-01-20"
        assert result["spot"] == 100.0
        assert result["source"] == "ibkr"
        assert len(result["options"]) == 6
        first = result["options"][0]
        assert {"strike", "expiry", "type", "price", "delta", "gamma", "theta", "vega", "oi", "volume", "iv"} <= set(first)
        assert first["source"] == "ibkr"

    asyncio.run(scenario())
