from fastapi import APIRouter
from app.mock.options_chain import get_mock_options_chain
from app.mock.ai_analysis import get_ai_analysis
from app.services.scenarios import calculate_scenarios
from app.core.cache import cached

router = APIRouter()

@router.get("/{ticker}")
@cached("bsm_calculation")
async def analyze_options(ticker: str):
    data = get_mock_options_chain(ticker)
    return {
        "ticker": ticker,
        "analysis": "BSM fair value calculation complete",
        "put_wall": data["put_wall"],
        "gamma_wall": data["gamma_wall"],
        "implied_move": data["implied_move"]
    }

@router.post("/scenarios/{ticker}")
async def get_scenarios(ticker: str, positions: list):
    data = get_mock_options_chain(ticker)
    results = calculate_scenarios(data["spot_price"], positions)
    return results

@router.get("/ai/{ticker}")
async def ai_evaluate(ticker: str, strategy: str, strike: float, expiry: str):
    return get_ai_analysis(ticker, strategy, strike, expiry)
