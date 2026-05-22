from fastapi import APIRouter, Depends, Query
from app.mock.options_chain import get_mock_options_chain
from app.mock.macro import get_macro_data
from app.core.cache import cached
from app.services.scenarios import get_all_scenarios, scenario_pnl

router = APIRouter()

@router.get("/{ticker}")
@cached("options_chain")
async def get_report(ticker: str):
    chain_data = get_mock_options_chain(ticker)
    macro_data = get_macro_data()
    
    # Mock some positions for scenario testing
    mock_positions = [
        {
            "action": "sell",
            "quantity": 1,
            "current_underlying_price": chain_data["spot_price"],
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
            "price": chain_data["spot_price"],
            "change_pct": 2.4,
            "iv_rank": chain_data["iv_rank"],
            "implied_move": chain_data["implied_move"],
            "earnings_date": chain_data["earnings_date"],
            "put_wall": chain_data["put_wall"],
            "gamma_wall": chain_data["gamma_wall"]
        },
        "macro_context": {
            "vix": macro_data["commodities_risk"]["vix_term_structure"][0]["value"],
            "fed_rate": macro_data["monetary_policy"]["fed_funds_rate"]
        },
        "chain": chain_data["chain"],
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
    chain_data = get_mock_options_chain(ticker)
    mock_positions = [
        {
            "action": "sell",
            "quantity": 1,
            "current_underlying_price": chain_data["spot_price"],
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
