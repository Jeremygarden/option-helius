from types import SimpleNamespace

from app.services.ibkr.schemas import IBKRGreeks, IBKROptionChain, IBKROptionData, IBKRQuote


def test_ibkr_greeks_from_ticker_greeks():
    greeks = IBKRGreeks.from_ticker_greeks(
        SimpleNamespace(delta=0.5, gamma=0.04, theta=-0.03, vega=0.2, impliedVol=0.31),
        underlying_price=101.2,
        timestamp=123.0,
    )

    assert greeks.delta == 0.5
    assert greeks.gamma == 0.04
    assert greeks.iv == 0.31
    assert greeks.underlying_price == 101.2
    assert greeks.source == "ibkr"


def test_ibkr_quote_from_ticker_uses_mid_when_last_missing():
    quote = IBKRQuote.from_ticker(
        SimpleNamespace(bid=1.0, ask=1.4, last=0.0, callVolume=12, callOpenInterest=34),
        option_type="call",
    )

    assert quote.price == 1.2
    assert quote.volume == 12
    assert quote.open_interest == 34


def test_ibkr_option_data_matches_existing_option_shape():
    option = IBKROptionData.from_option_dict(
        {
            "strike": "100",
            "expiry": "2099-01-20",
            "type": "put",
            "price": "5.5",
            "delta": "-0.45",
            "gamma": "0.03",
            "theta": "-0.02",
            "vega": "0.11",
            "oi": "200",
            "volume": "80",
            "iv": "0.24",
            "bid": "5.4",
            "ask": "5.6",
            "in_the_money": True,
            "contract_symbol": "SPY20990120P100",
        }
    )

    payload = option.to_option_helius()
    assert payload["type"] == "put"
    assert payload["strike"] == 100.0
    assert payload["oi"] == 200
    assert {"strike", "expiry", "type", "price", "delta", "gamma", "theta", "vega", "oi", "volume", "iv"} <= set(payload)


def test_ibkr_option_chain_from_fetcher_result_preserves_response_shape():
    chain = IBKROptionChain.from_fetcher_result(
        {
            "ticker": "spy",
            "expiry": "2099-01-20",
            "spot": 100.25,
            "expirations": ["2099-01-20"],
            "atm_iv": 0.25,
            "options": [
                {"strike": 100, "expiry": "2099-01-20", "type": "call", "price": 5, "delta": 0.5, "gamma": 0.04, "theta": -0.02, "vega": 0.15, "oi": 456, "volume": 123, "iv": 0.25}
            ],
        }
    )

    payload = chain.to_option_helius()
    assert payload["ticker"] == "SPY"
    assert payload["source"] == "ibkr"
    assert payload["options"][0]["source"] == "ibkr"
    assert payload["options"][0]["gamma"] == 0.04
