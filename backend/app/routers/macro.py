from fastapi import APIRouter
from ..mock.macro import get_mock_macro

router = APIRouter()

@router.get("/overview")
async def get_overview():
    return get_mock_macro()
