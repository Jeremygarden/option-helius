import asyncio

from tests.mocks.ibkr_mock import MockIBKRServer, make_mock_chain, request_mock_ibkr


def test_make_mock_chain_matches_option_helius_shape():
    chain = make_mock_chain("NVDA", "2026-07-17", strike_radius=3)

    assert chain["ticker"] == "NVDA"
    assert chain["expiry"] == "2026-07-17"
    assert chain["source"] == "ibkr_mock"
    assert len(chain["options"]) == 14  # 7 strikes x call/put

    sample = chain["options"][0]
    for key in ("strike", "expiry", "type", "price", "delta", "gamma", "theta", "vega", "oi", "volume", "iv"):
        assert key in sample
    assert sample["type"] in {"call", "put"}
    assert sample["gamma"] > 0
    assert "modelGreeks" in sample


def test_mock_ibkr_server_serves_health_and_chain():
    async def scenario():
        async with MockIBKRServer() as server:
            health = await request_mock_ibkr(server.host, server.bound_port, {"action": "health"})
            assert health["ok"] is True
            assert health["connected"] is True
            assert health["account"].startswith("DU")

            chain = await request_mock_ibkr(
                server.host,
                server.bound_port,
                {"action": "chain", "ticker": "SPY", "expiry": "2026-07-17", "strike_radius": 2},
            )
            assert chain["ok"] is True
            assert chain["data"]["ticker"] == "SPY"
            assert len(chain["data"]["options"]) == 10

    asyncio.run(scenario())
