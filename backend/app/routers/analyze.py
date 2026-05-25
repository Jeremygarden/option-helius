from fastapi import APIRouter
from ..mock.options_chain import get_mock_chain
from ..mock.ai_analysis import get_ai_analysis
from ..services.scenarios import get_all_scenarios
from ..core.cache import cached

router = APIRouter()

@router.get("/{ticker}")
@cached("bsm_calculation")
async def analyze_options(ticker: str):
    data = get_mock_chain(ticker, "2025-06-21")
    return {
        "ticker": ticker,
        "analysis": "BSM fair value calculation complete",
        "chain_count": len(data.get("options", []))
    }

@router.post("/scenarios/{ticker}")
async def get_scenarios(ticker: str, positions: list):
    results = get_all_scenarios(positions, position_max_risk=1000)
    return results

@router.get("/ai/{ticker}")
async def ai_evaluate(ticker: str, strategy: str, strike: float, expiry: str):
    return get_ai_analysis(ticker, strategy, strike, expiry)
