import random
from datetime import datetime, timedelta

def get_mock_chain(ticker: str, expiry: str):
    strikes = [500 + i * 5 for i in range(-10, 11)]
    options = []
    for strike in strikes:
        for opt_type in ['call', 'put']:
            options.append({
                "strike": strike,
                "expiry": expiry,
                "type": opt_type,
                "price": random.uniform(5, 50),
                "delta": random.uniform(-1, 1),
                "gamma": random.uniform(0, 0.1),
                "theta": random.uniform(-2, 0),
                "vega": random.uniform(0, 1),
                "oi": random.randint(100, 5000),
                "volume": random.randint(10, 2000),
                "iv": 0.8 if ticker == 'NVDA' else 0.2
            })
    return {"ticker": ticker, "expiry": expiry, "options": options}

def get_mock_summary(ticker: str):
    return {
        "ticker": ticker,
        "expected_move": "±$18.50 (3.2%)",
        "max_pain": 565.0,
        "pcr_volume": 0.87,
        "pcr_oi": 1.12,
        "net_gex": "-$2.4B"
    }

def get_mock_gex(ticker: str):
    strikes = [500 + i * 5 for i in range(-15, 16)]
    return [{"strike": s, "gex": random.uniform(-100, 100)} for s in strikes]

def get_mock_iv_surface(ticker: str):
    strikes = [500 + i * 10 for i in range(-10, 11)]
    dtes = [7, 14, 30, 60, 90, 120, 150, 180]
    points = []
    for s in strikes:
        for d in dtes:
            points.append({
                "strike": s,
                "dte": d,
                "iv": random.uniform(0.15, 0.4) if ticker != 'NVDA' else random.uniform(0.6, 0.9)
            })
    return points
