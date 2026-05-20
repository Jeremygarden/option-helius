from fastapi import APIRouter, Depends
from app.mock.options_chain import get_mock_options_chain
from app.mock.macro import get_macro_data
from app.core.cache import cached

router = APIRouter()

@router.get("/{ticker}")
@cached("options_chain")
async def get_report(ticker: str):
    chain_data = get_mock_options_chain(ticker)
    macro_data = get_macro_data()
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
        "chain": chain_data["chain"]
    }
