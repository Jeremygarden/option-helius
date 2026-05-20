from typing import List, Optional
from pydantic import BaseModel

class OptionData(BaseModel):
    strike: float
    expiry: str
    type: str  # 'call' or 'put'
    price: float
    delta: float
    gamma: float
    theta: float
    vega: float
    oi: int
    volume: int
    iv: float

class OptionChain(BaseModel):
    ticker: str
    expiry: str
    options: List[OptionData]

class OptionSummary(BaseModel):
    ticker: str
    expected_move: str
    max_pain: float
    pcr_volume: float
    pcr_oi: float
    net_gex: str

class GEXData(BaseModel):
    strike: float
    gex: float

class IVSurfacePoint(BaseModel):
    strike: float
    dte: int
    iv: float
