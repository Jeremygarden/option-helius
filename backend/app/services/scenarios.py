from typing import List, Dict
import numpy as np

def scenario_pnl(position_legs: list, scenario: dict, position_max_risk: float = None) -> dict:
    """
    Full Greeks-based P&L simulation using Taylor series approximation.
    
    ΔP ≈ Delta*ΔS + 0.5*Gamma*ΔS² + Vega*ΔIV + Theta*Δt + Rho*Δr
    
    Where:
    - ΔS = price change in dollars (not %)
    - ΔIV = IV change (absolute, e.g. 0.20 = +20 vol points)
    - Δt = time elapsed in years
    - Δr = rate change
    """
    total_delta_pnl = 0
    total_gamma_pnl = 0
    total_vega_pnl = 0
    total_theta_pnl = 0
    total_rho_pnl = 0
    
    for leg in position_legs:
        # leg keys: action, quantity, current_underlying_price, delta, gamma, vega, theta, rho
        sign = 1 if leg.get('action', 'buy') == 'buy' else -1
        qty = leg.get('quantity', 0) * 100  # options multiplier
        
        S = leg.get('current_underlying_price', 0)
        delta_S = scenario.get('price_change_pct', 0) / 100 * S
        delta_IV = scenario.get('iv_change_abs', 0)  # e.g. 0.30 for +30 vol pts
        delta_t = scenario.get('days_elapsed', 0) / 365
        delta_r = scenario.get('rate_change', 0)
        
        delta_pnl = sign * leg.get('delta', 0) * delta_S * qty
        gamma_pnl = sign * 0.5 * leg.get('gamma', 0) * (delta_S**2) * qty
        vega_pnl = sign * leg.get('vega', 0) * delta_IV * 100 * qty # vega is usually per 1% (0.01) shift, so *100 if delta_IV is absolute decimal? 
        # Actually, standard vega is per 1 vol point (0.01). 
        # If delta_IV is 0.20 (20 pts), then vega_pnl = vega * 20 * qty.
        vega_pnl = sign * leg.get('vega', 0) * (delta_IV * 100) * qty
        
        theta_pnl = sign * leg.get('theta', 0) * delta_t * 365 * qty  # theta is usually per day
        rho_pnl = sign * leg.get('rho', 0) * (delta_r * 100) * qty # rho is per 1% (100bps) change
        
        total_delta_pnl += delta_pnl
        total_gamma_pnl += gamma_pnl
        total_vega_pnl += vega_pnl
        total_theta_pnl += theta_pnl
        total_rho_pnl += rho_pnl
    
    total_pnl = total_delta_pnl + total_gamma_pnl + total_vega_pnl + total_theta_pnl + total_rho_pnl
    
    # Identify dominant risk
    risks = {
        "Delta": total_delta_pnl,
        "Gamma": total_gamma_pnl,
        "Vega": total_vega_pnl,
        "Theta": total_theta_pnl,
        "Rho": total_rho_pnl
    }
    dominant_risk = max(risks, key=lambda x: abs(risks[x]))

    return {
        "total_pnl": round(total_pnl, 2),
        "breakdown": {
            "delta_pnl": round(total_delta_pnl, 2),
            "gamma_pnl": round(total_gamma_pnl, 2),
            "vega_pnl": round(total_vega_pnl, 2),
            "theta_pnl": round(total_theta_pnl, 2),
            "rho_pnl": round(total_rho_pnl, 2),
        },
        "pnl_pct_of_max_risk": round(total_pnl / position_max_risk * 100, 1) if position_max_risk else None,
        "survival": total_pnl > -(position_max_risk * 0.8) if position_max_risk else True,
        "dominant_risk": dominant_risk
    }

HEDGE_SUGGESTIONS = {
    "Flash Crash": [
        {"hedge": "买入 OTM Put (Delta hedge)", "cost_estimate": "underlying * 0.005", "effectiveness": "HIGH"},
        {"hedge": "降低整体 Delta 至中性", "cost_estimate": "0", "effectiveness": "MEDIUM"},
    ],
    "Vol Spike": [
        {"hedge": "买入 VIX Call 期权", "cost_estimate": "$200-500/contract", "effectiveness": "HIGH"},
        {"hedge": "减少 Vega 暴露 (平仓短期卖方)", "cost_estimate": "0", "effectiveness": "HIGH"},
    ],
    "IV Crush": [
        {"hedge": "财报前平仓卖方仓位", "cost_estimate": "0 (但放弃剩余时间价值)", "effectiveness": "VERY HIGH"},
        {"hedge": "转为 Calendar Spread 降低 Vega", "cost_estimate": "premium差额", "effectiveness": "MEDIUM"},
    ],
    "Black Swan": [
        {"hedge": "买入深度OTM Put作为灾难保险 (1-2% of portfolio)", "cost_estimate": "portfolio * 0.015", "effectiveness": "HIGH"},
        {"hedge": "持有10-15%现金作为Buffer", "cost_estimate": "0", "effectiveness": "MEDIUM"},
    ],
    "Slow Bleed": [
        {"hedge": "动态调整 Delta 对冲", "cost_estimate": "佣金成本", "effectiveness": "MEDIUM"},
        {"hedge": "卖出 OTM Call (Covered Call) 补偿损耗", "cost_estimate": "0", "effectiveness": "MEDIUM"},
    ],
    "Rate Shock": [
        {"hedge": "减少对利率敏感的长久期部位", "cost_estimate": "0", "effectiveness": "MEDIUM"},
        {"hedge": "使用利率期货对冲", "cost_estimate": "保证金", "effectiveness": "HIGH"},
    ]
}

SCENARIO_TEMPLATES = {
    "Flash Crash": {"price_change_pct": -15, "iv_change_abs": 0.80, "days_elapsed": 1},
    "Vol Spike": {"price_change_pct": -5, "iv_change_abs": 0.50, "days_elapsed": 1},
    "Gap Up": {"price_change_pct": 10, "iv_change_abs": -0.40, "days_elapsed": 1},
    "IV Expansion": {"price_change_pct": 2, "iv_change_abs": 0.60, "days_elapsed": 1},
    "IV Crush": {"price_change_pct": -3, "iv_change_abs": -0.40, "days_elapsed": 1},
    "Slow Bleed": {"price_change_pct": -20, "iv_change_abs": 0.30, "days_elapsed": 30},
    "Rate Shock": {"price_change_pct": -8, "iv_change_abs": 0.25, "rate_change": 0.005, "days_elapsed": 1},
    "Black Swan": {"price_change_pct": -30, "iv_change_abs": 1.50, "days_elapsed": 1},
}

def get_all_scenarios(position_legs: list, position_max_risk: float = None) -> List[Dict]:
    results = []
    for name, params in SCENARIO_TEMPLATES.items():
        res = scenario_pnl(position_legs, params, position_max_risk)
        res["name"] = name
        res["trigger"] = f"Price {params['price_change_pct']}%, IV +{params['iv_change_abs']*100}pts"
        res["hedges"] = HEDGE_SUGGESTIONS.get(name, [])
        results.append(res)
    return results
