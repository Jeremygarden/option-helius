from fastapi import APIRouter, Depends, Query
from ..mock.options_chain import get_mock_chain
from ..mock.macro import get_mock_macro
from ..core.cache import cached
from ..services.scenarios import get_all_scenarios, scenario_pnl

router = APIRouter()

@router.get("/{ticker}")
@cached("options_chain")
async def get_report(ticker: str):
    chain_data = get_mock_chain(ticker, "2025-06-21")
    macro_data = get_mock_macro()

    # Use a default spot price from chain context
    spot_price = 580.0  # REVIEW: chain_data doesn't contain spot_price, using default

    mock_positions = [
        {
            "action": "sell",
            "quantity": 1,
            "current_underlying_price": spot_price,
            "delta": 0.25,
            "gamma": 0.002,
            "vega": 15.5,
            "theta": -8.2,
            "rho": 0.5
        }
    ]

    scenarios = get_all_scenarios(mock_positions, position_max_risk=1000)

    return {
        "ticker": ticker,
        "summary": {
            "name": f"{ticker} Corp",
            "price": spot_price,
            "change_pct": 2.4,
            "iv_rank": macro_data.get("iv_rank", 65),
            "implied_move": "±3.2%",
            "earnings_date": "2025-07-15",
            "put_wall": 550,
            "gamma_wall": 600
        },
        "macro_context": {
            "vix": macro_data["commodities_risk"]["vix_term_structure"][0]["value"],
            "fed_rate": macro_data["monetary_policy"]["fed_funds_rate"]
        },
        "chain": chain_data,
        "scenarios": scenarios
    }

@router.get("/{ticker}/scenarios/custom")
async def get_custom_scenario(
    ticker: str,
    price_change: float = Query(-5, alias="ds"),
    iv_change: float = Query(0.1, alias="dv"),
    days: int = Query(1, alias="dt"),
    rate_change: float = Query(0, alias="dr")
):
    spot_price = 580.0  # REVIEW: should come from real data source
    mock_positions = [
        {
            "action": "sell",
            "quantity": 1,
            "current_underlying_price": spot_price,
            "delta": 0.25,
            "gamma": 0.002,
            "vega": 15.5,
            "theta": -8.2,
            "rho": 0.5
        }
    ]
    params = {
        "price_change_pct": price_change,
        "iv_change_abs": iv_change,
        "days_elapsed": days,
        "rate_change": rate_change
    }
    result = scenario_pnl(mock_positions, params, position_max_risk=1000)
    return result
