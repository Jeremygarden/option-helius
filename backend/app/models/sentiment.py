from typing import List
from pydantic import BaseModel

class NewsItem(BaseModel):
    id: str
    headline: str
    summary: str
    verdict: str  # 'LOAD THE BOAT', 'WAIT', 'FADE'
    confidence: float
    timestamp: str

class SentimentPoint(BaseModel):
    timestamp: str
    score: float

class PriceImpactPoint(BaseModel):
    time_offset: int
    impact: float

class HistoricalPattern(BaseModel):
    event: str
    match_percent: float
    outcome: str
