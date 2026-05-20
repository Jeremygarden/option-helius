import random
from datetime import datetime

def get_mock_news(ticker: str):
    return [
        {
            "id": "1",
            "headline": f"{ticker} Q1 Earnings Beat Estimates, Guidance Raised",
            "summary": f"{ticker} reported strong revenue growth driven by AI demand...",
            "verdict": "LOAD THE BOAT",
            "confidence": 0.92,
            "timestamp": datetime.now().isoformat()
        },
        {
            "id": "2",
            "headline": "Regulatory Headwinds Loom for Tech Sector",
            "summary": "New antitrust investigations could affect major players...",
            "verdict": "WAIT",
            "confidence": 0.75,
            "timestamp": (datetime.now()).isoformat()
        },
        {
            "id": "3",
            "headline": "Competitor Launches Rival Product",
            "summary": "A new startup claims to have 2x better performance...",
            "verdict": "FADE",
            "confidence": 0.68,
            "timestamp": (datetime.now()).isoformat()
        }
    ]

def get_mock_sentiment_velocity(ticker: str):
    return [{"timestamp": (datetime.now()).isoformat(), "score": random.uniform(-1, 1)} for _ in range(20)]

def get_mock_patterns():
    return [
        {"event": "Post-Earnings Drift", "match_percent": 88.5, "outcome": "Bullish"},
        {"event": "VIX Spike Reversion", "match_percent": 72.0, "outcome": "Neutral"},
        {"event": "Double Bottom Consolidation", "match_percent": 91.2, "outcome": "Bullish"}
    ]
