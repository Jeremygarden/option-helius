import numpy as np
from typing import List, Dict
from app.services.pricing import black_scholes

def calculate_scenarios(S: float, positions: List[Dict], r: float = 0.05) -> List[Dict]:
    scenarios = [
        {"name": "Flash Crash", "spot_change": -0.15, "vol_change": 0.20, "desc": "-15% overnight, Vol Spike"},
        {"name": "Vol Spike", "spot_change": 0.0, "vol_change": 0.50, "desc": "VIX +50%"},
        {"name": "Gap Up", "spot_change": 0.10, "vol_change": -0.05, "desc": "+10% earnings gap"},
        {"name": "IV Crush", "spot_change": 0.0, "vol_change": -0.40, "desc": "IV -40% post-earnings"},
        {"name": "Rate Shock", "spot_change": -0.02, "vol_change": 0.0, "rate_change": 0.005, "desc": "Fed +50bps surprise"}
    ]
    
    results = []
    for sc in scenarios:
        new_S = S * (1 + sc.get("spot_change", 0))
        new_r = r + sc.get("rate_change", 0)
        pnl = 0
        total_delta = 0
        for pos in positions:
            curr = black_scholes(S, pos['strike'], pos['dte']/365, r, pos['vol'], pos['type'])
            new_vol = pos['vol'] * (1 + sc.get("vol_change", 0))
            after = black_scholes(new_S, pos['strike'], pos['dte']/365, new_r, new_vol, pos['type'])
            pos_pnl = (after.price - curr.price) * pos['size'] * 100
            pnl += pos_pnl
            total_delta += after.delta * pos['size'] * 100
        advice = "Buy puts" if total_delta > 50 else "Sell calls" if total_delta < -50 else "Maintain"
        if sc['name'] == "IV Crush": advice = "Close position"
        if sc['name'] == "Rate Shock": advice = "Reduce delta"
        results.append({
            "scenario": sc['name'],
            "trigger": sc['desc'],
            "pnl": round(pnl, 2),
            "delta_change": round(total_delta, 2),
            "advice": advice
        })
    return results
