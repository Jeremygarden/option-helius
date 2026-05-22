"""
Warning Calculator v2: Sigmoid scoring + Momentum adjustment
Replaces hard-threshold step functions with continuous sigmoid curves.
Anti-overfitting design: no thresholds tuned to specific historical values.
"""

import math
from typing import Dict, Tuple, Optional, Any

def sigmoid_score(v: float, center: float, steepness: float, 
                  floor: float = 5.0, ceiling: float = 95.0,
                  invert: bool = False) -> float:
    """
    Continuous sigmoid scoring function.
    
    Args:
        v: current value
        center: midpoint — value where score = 50 (neutral zone)
        steepness: how fast it rises (higher = steeper transition)
        floor: minimum score (default 5, not 0 — nothing is perfectly safe)
        ceiling: maximum score (default 95, not 100 — nothing is certain doom)
        invert: True for indicators where LOW value = HIGH danger (VIX, PCR)
    
    Returns: score in [floor, ceiling]
    """
    try:
        # Adjustment: Scale steepness to provide more range
        if invert:
            raw = 1.0 / (1.0 + math.exp(steepness * (v - center)))
        else:
            raw = 1.0 / (1.0 + math.exp(-steepness * (v - center)))
        return floor + (ceiling - floor) * raw
    except (OverflowError, ZeroDivisionError):
        if invert:
            return floor if (v - center) > 0 else ceiling
        else:
            return ceiling if (v - center) > 0 else floor

def dual_sigmoid_score(v: float) -> float:
    """
    U-shaped danger: both high and low values are dangerous.
    Minimum danger at v=60 (optimal), maximum at extremes.
    """
    # Distance from optimal (60%)
    distance = abs(v - 60.0)
    # Sigmoid on the distance: large distance = high danger
    # center=20, steepness=0.10
    try:
        raw = 1.0 / (1.0 + math.exp(-0.10 * (distance - 20.0)))
        return 5.0 + 90.0 * raw
    except OverflowError:
        return 95.0 if (distance - 20.0) > 0 else 5.0

def momentum_multiplier(current: float, hist_mean: float, hist_std: float,
                        alpha: float = 0.15, invert: bool = False) -> float:
    """
    Momentum adjustment: amplify score if indicator is moving toward danger,
    dampen if moving away.
    """
    if hist_std == 0:
        return 1.0
    
    z = (current - hist_mean) / hist_std
    if invert:
        z = -z  # low values moving lower = more danger
    
    z_clamped = max(-2.0, min(2.0, z))
    return 1.0 + alpha * z_clamped

def final_score(sigmoid_s: float, momentum_mult: float,
                floor: float = 5.0, ceiling: float = 95.0) -> float:
    """
    Apply momentum to sigmoid score, then re-clamp to valid range.
    """
    raw = sigmoid_s * momentum_mult
    return max(floor, min(ceiling, raw))

SIGMOID_PARAMS = {
    # Valuation
    "cape": {
        "center": 25.0, "steepness": 0.12, "invert": False,
        "baseline_mean": 22.0, "baseline_std": 3.0,
    },
    "pe_gap": {
        "center": 15.0, "steepness": 0.10, "invert": False,
        "baseline_mean": 12.0, "baseline_std": 5.0,
    },
    "erp": {
        "center": 0.02, "steepness": 50.0, "invert": True,
        "baseline_mean": 0.03, "baseline_std": 0.015,
    },
    # Volatility
    "vix": {
        "center": 18.0, "steepness": 0.25, "invert": True,
        "baseline_mean": 20.0, "baseline_std": 5.0,
    },
    "skew": {
        "center": 130.0, "steepness": 0.08, "invert": False,
        "baseline_mean": 128.0, "baseline_std": 8.0,
    },
    "move": {
        "center": 100.0, "steepness": 0.04, "invert": False,
        "baseline_mean": 95.0, "baseline_std": 20.0,
    },
    # Positioning
    "aiae": {
        "center": 0.38, "steepness": 15.0, "invert": False,
        "baseline_mean": 0.36, "baseline_std": 0.04,
    },
    "m7_concentration": {
        "center": 20.0, "steepness": 0.15, "invert": False,
        "baseline_mean": 18.0, "baseline_std": 4.0,
    },
    "trend": {
        "center": 8.0, "steepness": 0.12, "invert": False,
        "baseline_mean": 7.0, "baseline_std": 8.0,
    },
    "naaim_exposure": {
        "center": 65.0, "steepness": 0.06, "invert": False,
        "baseline_mean": 60.0, "baseline_std": 18.0,
    },
    # Sentiment
    "fear_greed": {
        "center": 55.0, "steepness": 0.06, "invert": False,
        "baseline_mean": 52.0, "baseline_std": 18.0,
    },
    "put_call_ratio": {
        "center": 0.85, "steepness": 6.0, "invert": True,
        "baseline_mean": 0.90, "baseline_std": 0.15,
    },
    # Cross-Asset
    "yield_curve": {
        "center": 50.0, "steepness": 0.015, "invert": True,
        "baseline_mean": 80.0, "baseline_std": 80.0,
    },
    "hy_oas": {
        "center": 350.0, "steepness": 0.008, "invert": False,
        "baseline_mean": 320.0, "baseline_std": 80.0,
    },
    "dxy": {
        "center": 0.0, "steepness": 0.15, "invert": False,
        "baseline_mean": 0.5, "baseline_std": 4.0,
    },
    "gold_copper": {
        "center": 550.0, "steepness": 0.004, "invert": False,
        "baseline_mean": 530.0, "baseline_std": 80.0,
    },
    # Breadth
    "sectors_200dma": {
        "center": 60.0, "steepness": 0.06, "invert": False,
        "dual_mode": True,
        "baseline_mean": 62.0, "baseline_std": 15.0,
    },
    "rsp_spy": {
        "center": -5.0, "steepness": 0.15, "invert": True,
        "baseline_mean": -3.0, "baseline_std": 5.0,
    },
}

FACTOR_CONFIG = {
    "liquidity": {
        "weight": 0.28,
        "components": {"yield_curve": 0.60, "hy_oas": 0.40},
        "description": "流动性收紧信号（领先指标）"
    },
    "positioning": {
        "weight": 0.24,
        "components": {"aiae": 0.50, "naaim_exposure": 0.50},
        "description": "资金配置拥挤度"
    },
    "sentiment": {
        "weight": 0.20,
        "components": {"fear_greed": 0.40, "put_call_ratio": 0.30, "vix": 0.30},
        "description": "市场情绪过热程度"
    },
    "valuation": {
        "weight": 0.16,
        "components": {"cape": 0.60, "erp": 0.40},
        "description": "估值压缩空间"
    },
    "structure": {
        "weight": 0.12,
        "components": {"m7_concentration": 0.50, "rsp_spy": 0.50},
        "description": "市场结构集中度"
    },
}

MOCK_MOMENTUM_DATA = {
    "cape":              (37.0,  35.5,  1.2),
    "aiae":              (0.51,  0.49,  0.015),
    "m7_concentration":  (31.0,  29.5,  1.5),
    "vix":               (14.5,  16.2,  2.8),
    "yield_curve":       (15.0,  25.0,  30.0),
    "pe_gap":            (22.0,  20.0,  3.0),
    "trend":             (12.0,  10.5,  4.0),
    "erp":               (-0.01, 0.005, 0.02),
    "fear_greed":        (66.94, 58.0,  12.0),
    "put_call_ratio":    (1.19,  0.95,  0.15),
    "naaim_exposure":    (93.79, 82.0,  12.0),
    "skew":              (138.74,132.0, 6.0),
    "move":              (76.78, 82.0,  15.0),
    "hy_oas":            (278.0, 295.0, 40.0),
    "dxy":               (2.1,   0.5,   3.5),
    "gold_copper":       (762.25,720.0, 45.0),
    "sectors_200dma":    (81.82, 74.0,  8.0),
    "rsp_spy":           (-9.48, -7.0,  3.0),
}

def get_signal_label(score: float) -> str:
    if score >= 75: return "红色预警"
    if score >= 60: return "橙色警示"
    if score >= 40: return "黄色中性"
    return "绿色安全"

def compute_score_sigmoid_18(
    indicators: Dict[str, float],
    momentum_data: Optional[Dict[str, Tuple[float, float, float]]] = None
) -> Dict:
    """Full 18-indicator scoring with sigmoid + momentum."""
    breakdown = {}
    total_weighted_score = 0.0
    total_weight = 0.0
    momentum_contribution = 0.0
    
    # Identify present indicators
    present_ids = [id for id in SIGMOID_PARAMS if id in indicators]
    if not present_ids:
        # Fallback to defaults for all if none provided, or return 50
        present_ids = list(SIGMOID_PARAMS.keys())
        
    weight_per_indicator = 1.0 / len(present_ids)
    
    category_map = {
        "valuation": ["cape", "pe_gap", "erp"],
        "volatility": ["vix", "skew", "move"],
        "positioning": ["aiae", "m7_concentration", "trend", "naaim_exposure"],
        "sentiment": ["fear_greed", "put_call_ratio"],
        "cross_asset": ["yield_curve", "hy_oas", "dxy", "gold_copper"],
        "breadth": ["sectors_200dma", "rsp_spy"]
    }
    
    category_scores = {cat: 0.0 for cat in category_map}
    cat_counts = {cat: 0 for cat in category_map}

    for ind_id in present_ids:
        params = SIGMOID_PARAMS[ind_id]
        val = indicators.get(ind_id)
        
        # 1. Sigmoid score
        if params.get("dual_mode"):
            s_score = dual_sigmoid_score(val)
        else:
            s_score = sigmoid_score(val, params["center"], params["steepness"], invert=params["invert"])
            
        # 2. Momentum adjustment
        m_mult = 1.0
        if momentum_data and ind_id in momentum_data:
            curr, m_mean, m_std = momentum_data[ind_id]
            m_mult = momentum_multiplier(curr, m_mean, m_std, invert=params["invert"])
        
        f_score = final_score(s_score, m_mult)
        
        # Tracking
        weighted = f_score * weight_per_indicator
        total_weighted_score += weighted
        momentum_contribution += (f_score - s_score) * weight_per_indicator
        
        breakdown[ind_id] = {
            "value": val,
            "sigmoid_score": round(s_score, 2),
            "momentum_mult": round(m_mult, 2),
            "final_score": round(f_score, 2),
            "weighted": round(weighted, 2)
        }
        
        # Category aggregation
        for cat, members in category_map.items():
            if ind_id in members:
                category_scores[cat] += f_score
                cat_counts[cat] += 1
                break

    for cat in category_scores:
        if cat_counts[cat] > 0:
            category_scores[cat] = round(category_scores[cat] / cat_counts[cat], 2)
        else:
            category_scores[cat] = 50.0

    return {
        "score": round(total_weighted_score, 2),
        "signal": get_signal_label(total_weighted_score),
        "breakdown": breakdown,
        "category_scores": category_scores,
        "momentum_active": momentum_data is not None,
        "momentum_contribution": round(momentum_contribution, 2)
    }

def compute_score_5factor_sigmoid(
    indicators: Dict[str, float],
    momentum_data: Optional[Dict[str, Tuple[float, float, float]]] = None
) -> Dict:
    """5-factor model with sigmoid scoring."""
    factor_results = {}
    total_score = 0.0
    
    for factor_id, config in FACTOR_CONFIG.items():
        f_score = 0.0
        components = {}
        for ind_id, weight in config["components"].items():
            params = SIGMOID_PARAMS[ind_id]
            val = indicators.get(ind_id, params["center"])
            
            if params.get("dual_mode"):
                s_score = dual_sigmoid_score(val)
            else:
                s_score = sigmoid_score(val, params["center"], params["steepness"], invert=params["invert"])
                
            m_mult = 1.0
            if momentum_data and ind_id in momentum_data:
                curr, m_mean, m_std = momentum_data[ind_id]
                m_mult = momentum_multiplier(curr, m_mean, m_std, invert=params["invert"])
                
            final_ind_score = final_score(s_score, m_mult)
            f_score += final_ind_score * weight
            components[ind_id] = round(final_ind_score, 2)
            
        factor_results[factor_id] = {
            "score": round(f_score, 2),
            "weight": config["weight"],
            "components": components,
            "description": config["description"]
        }
        total_score += f_score * config["weight"]
        
    return {
        "score": round(total_score, 2),
        "signal": get_signal_label(total_score),
        "factors": factor_results
    }

def compare_all_models(
    indicators: Dict[str, float],
    momentum_data: Optional[Dict[str, Tuple[float, float, float]]] = None
) -> Dict:
    """Run all 4 models and return comparison."""
    return {
        "model_c_v2_sigmoid_18": compute_score_sigmoid_18(indicators, momentum_data),
        "model_c_v2_sigmoid_5factor": compute_score_5factor_sigmoid(indicators, momentum_data),
    }
