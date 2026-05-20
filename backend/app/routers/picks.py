from fastapi import APIRouter
from ..mock.picks import get_mock_picks

router = APIRouter()

@router.get("/weekly")
async def get_weekly_picks():
    return get_mock_picks()
