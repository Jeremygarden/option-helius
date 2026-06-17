import asyncio
from types import SimpleNamespace
import sys

import pytest

from app.services.ibkr import ClientConfig, IBKRClient, IBKRDependencyError, create_client_from_settings
from app.core.config import Settings


class Event:
    def __init__(self):
        self.handlers = []

    def __iadd__(self, handler):
        self.handlers.append(handler)
        return self


class FakeIB:
    def __init__(self):
        self.connected = False
        self.disconnectedEvent = Event()
        self.errorEvent = Event()
        self.client = SimpleNamespace(serverVersion=lambda: 178)
        self.requests = []

    async def connectAsync(self, host, port, clientId):
        self.connected = True
        self.host = host
        self.port = port
        self.client_id = clientId

    def isConnected(self):
        return self.connected

    def disconnect(self):
        self.connected = False

    def managedAccounts(self):
        return ["DU1234567"]

    def reqMktData(self, contract, generic_tick_list, snapshot, regulatory_snapshot, options=None):
        ticker = SimpleNamespace(reqId=len(self.requests) + 1)
        self.requests.append((contract, generic_tick_list, snapshot, regulatory_snapshot, options))
        return ticker

    def cancelMktData(self, contract):
        self.cancelled = contract

    async def accountSummaryAsync(self):
        return [SimpleNamespace(tag="NetLiquidation", value="100000")]


def test_client_import_does_not_require_ib_async_until_default_instantiation(monkeypatch):
    # Mask ib_async to simulate it not being installed
    monkeypatch.setitem(sys.modules, "ib_async", None)
    
    with pytest.raises(IBKRDependencyError) as exc:
        IBKRClient(ClientConfig())
    assert "ib-async is required" in str(exc.value)


def test_create_client_from_settings_uses_safe_config_with_injected_ib():
    settings = Settings(ibkr_enabled=True, ibkr_host="ibgateway", ibkr_port=4002, ibkr_client_id=9)
    config = ClientConfig.from_settings(settings)
    client = IBKRClient(config=config, ib=FakeIB())
    assert client.config.host == "ibgateway"
    assert client.config.client_id == 9


def test_ibkr_client_connect_health_subscribe_disconnect():
    async def scenario():
        fake = FakeIB()
        client = IBKRClient(config=ClientConfig(host="ibgateway", port=4002, client_id=3), ib=fake)
        await client.connect()

        assert client.is_connected is True
        assert fake.host == "ibgateway"
        assert fake.client_id == 3

        contract = SimpleNamespace(symbol="NVDA", secType="STK")
        ticker = await client.subscribe_ticker(contract, generic_tick_list="100,101")
        assert ticker.reqId == 1
        assert client.subscription_count == 1

        health = await client.health_check()
        assert health.connected is True
        assert health.account == "DU1234567"
        assert health.server_version == 178
        assert health.subscription_count == 1
        assert health.dict()["state"] == "connected"

        values = await client.get_account_values()
        assert values["NetLiquidation"] == "100000"

        await client.disconnect()
        assert client.is_connected is False

    asyncio.run(scenario())
