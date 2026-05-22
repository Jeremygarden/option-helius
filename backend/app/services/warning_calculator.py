"""
Warning Indicator Weight Calculator
Weights derived from reverse engineering against 13 historical crash data points.
"""

INDICATOR_WEIGHTS = {
    # Original 8 (slightly reduced to make room)
    "cape": 0.08,           # was ~0.10
    "aiae": 0.10,           # was ~0.14
    "m7_concentration": 0.06,  # was ~0.08
    "vix": 0.08,            # was ~0.10
    "yield_curve": 0.08,    # was ~0.12
    "pe_gap": 0.04,         # was ~0.05
    "trend": 0.10,          # was ~0.15
    "erp": 0.04,            # was ~0.05
    
    # New 10
    "fear_greed": 0.07,     # sentiment composite, well-known
    "put_call_ratio": 0.05, # contrarian options signal
    "naaim_exposure": 0.07, # institutional positioning
    "skew": 0.05,           # tail risk pricing
    "move": 0.04,           # bond vol
    "hy_oas": 0.06,         # credit stress leading indicator
    "dxy": 0.03,            # dollar regime
    "gold_copper": 0.05,    # fear vs growth
    "sectors_200dma": 0.05, # breadth
    "rsp_spy": 0.05,        # concentration
}

def score_cape(v: float) -> float:
    if v < 15: return 0
    elif v < 20: return 20 + (v-15)/5 * 25
    elif v < 25: return 45 + (v-20)/5 * 20
    elif v < 30: return 65 + (v-25)/5 * 15
    elif v < 35: return 80 + (v-30)/5 * 15
    else: return 100

def score_aiae(v: float) -> float:
    if v < 0.20: return 0
    elif v < 0.30: return (v-0.20)/0.10 * 40
    elif v < 0.40: return 40 + (v-0.30)/0.10 * 30
    elif v < 0.50: return 70 + (v-0.40)/0.10 * 30
    else: return 100

def score_m7(v: float) -> float:
    if v < 10: return 0
    elif v < 15: return (v-10)/5 * 20
    elif v < 22: return 20 + (v-15)/7 * 40
    elif v < 30: return 60 + (v-22)/8 * 40
    else: return 100

def score_vix(v: float) -> float:
    if v < 12: return 100
    elif v < 15: return 80
    elif v < 19: return 60
    elif v < 24: return 30
    else: return 10

def score_yield_curve(v: float) -> float:
    if v < -80: return 100
    elif v < -40: return 90
    elif v < -10: return 80
    elif v < 20: return 65
    elif v < 80: return 40
    elif v < 150: return 15
    else: return 0

def score_pe_gap(v: float) -> float:
    if v < 10: return 10
    elif v < 15: return 50
    elif v < 25: return 85
    else: return 100

def score_trend(v: float) -> float:
    if v < -5: return 20
    elif v < 5: return 50
    elif v < 15: return 85
    else: return 100

def score_erp(v: float) -> float:
    if v < -0.06: return 100
    elif v < -0.02: return 85
    elif v < 0.02: return 50
    elif v < 0.05: return 20
    else: return 5

# --- New Indicators ---

def score_fear_greed(v: float) -> float:
    if v > 75: return 85
    elif v > 60: return 65
    elif v > 40: return 30
    elif v > 25: return 20
    else: return 10

def score_put_call_ratio(v: float) -> float:
    if v < 0.60: return 85
    elif v < 0.80: return 70
    elif v < 1.10: return 50
    elif v < 1.30: return 40
    else: return 20

def score_naaim(v: float) -> float:
    if v > 90: return 85
    elif v > 70: return 65
    elif v > 50: return 40
    elif v > 30: return 25
    else: return 10

def score_skew(v: float) -> float:
    if v > 155: return 80
    elif v > 140: return 60
    elif v > 120: return 40
    elif v > 105: return 25
    else: return 15

def score_move(v: float) -> float:
    if v > 150: return 85
    elif v > 110: return 65
    elif v > 80: return 40
    elif v > 60: return 25
    else: return 15

def score_hy_oas(v: float) -> float:
    if v > 600: return 90
    elif v > 400: return 75
    elif v > 300: return 55
    elif v > 200: return 35
    else: return 20

def score_dxy(v_3m_pct: float) -> float:
    if v_3m_pct > 8: return 80
    elif v_3m_pct > 3: return 55
    elif v_3m_pct > -3: return 35
    elif v_3m_pct > -8: return 25
    else: return 60

def score_gold_copper(v: float) -> float:
    if v > 800: return 85
    elif v > 650: return 65
    elif v > 500: return 45
    elif v > 400: return 25
    else: return 15

def score_sectors_200dma(v_pct: float) -> float:
    if v_pct > 80: return 70
    elif v_pct > 65: return 45
    elif v_pct > 50: return 35
    elif v_pct > 35: return 50
    else: return 75

def score_rsp_spy(v_diff_pct: float) -> float:
    if v_diff_pct < -15: return 85
    elif v_diff_pct < -8: return 70
    elif v_diff_pct < -3: return 50
    elif v_diff_pct < 5: return 25
    else: return 35

SCORING_FUNCS = {
    "cape": score_cape,
    "aiae": score_aiae,
    "m7_concentration": score_m7,
    "vix": score_vix,
    "yield_curve": score_yield_curve,
    "pe_gap": score_pe_gap,
    "trend": score_trend,
    "erp": score_erp,
    "fear_greed": score_fear_greed,
    "put_call_ratio": score_put_call_ratio,
    "naaim_exposure": score_naaim,
    "skew": score_skew,
    "move": score_move,
    "hy_oas": score_hy_oas,
    "dxy": score_dxy,
    "gold_copper": score_gold_copper,
    "sectors_200dma": score_sectors_200dma,
    "rsp_spy": score_rsp_spy
}

CATEGORY_MAP = {
    "volatility": ["vix", "move", "skew"],
    "sentiment": ["fear_greed", "put_call_ratio", "naaim_exposure"],
    "cross_asset": ["yield_curve", "hy_oas", "dxy", "gold_copper"],
    "breadth": ["sectors_200dma", "rsp_spy"],
    "valuation": ["cape", "pe_gap", "erp"],
    "positioning": ["aiae", "m7_concentration", "trend"]
}

def compute_composite_score_v2(indicators: dict) -> dict:
    total_score = 0
    breakdown = {}
    category_scores = {cat: {"total": 0, "weight": 0} for cat in CATEGORY_MAP}

    for key, weight in INDICATOR_WEIGHTS.items():
        val = indicators.get(key, 0)
        ind_score = SCORING_FUNCS[key](val)
        weighted = ind_score * weight
        total_score += weighted
        
        breakdown[key] = {
            "value": val,
            "score": round(ind_score, 2),
            "weighted": round(weighted, 2)
        }
        
        # Aggregate by category
        for cat, keys in CATEGORY_MAP.items():
            if key in keys:
                category_scores[cat]["total"] += weighted
                category_scores[cat]["weight"] += weight

    # Normalize category scores to 0-100 scale
    cat_summary = {}
    for cat, data in category_scores.items():
        if data["weight"] > 0:
            cat_summary[cat] = round(data["total"] / data["weight"], 1)
        else:
            cat_summary[cat] = 0

    signal = "绿色"
    if total_score > 65: signal = "红色预警" # Model D optimized threshold
    elif total_score > 55: signal = "橙色预警"
    elif total_score > 40: signal = "黄色预警"
    
    return {
        "score": round(total_score, 1),
        "signal": signal,
        "breakdown": breakdown,
        "category_scores": cat_summary
    }

def compute_score_v3_5factor(indicators: dict) -> float:
    """Model C: 5-Factor Reduced Model (anti-overfitting)"""
    factor_weights = {
        "liquidity_factor": 0.28,    # yield_curve(60%) + hy_oas(40%)
        "positioning_factor": 0.24,  # aiae(50%) + naaim(50%)
        "sentiment_factor": 0.20,    # fear_greed(40%) + put_call_ratio(30%) + vix(30%)
        "valuation_factor": 0.16,    # cape(60%) + erp(40%)
        "structure_factor": 0.12,    # m7_concentration(50%) + rsp_spy(50%)
    }
    
    yc_score = SCORING_FUNCS["yield_curve"](indicators.get("yield_curve", 0))
    hy_score = SCORING_FUNCS["hy_oas"](indicators.get("hy_oas", 0))
    liq = yc_score * 0.60 + hy_score * 0.40
    
    aiae_score = SCORING_FUNCS["aiae"](indicators.get("aiae", 0))
    naaim_score = SCORING_FUNCS["naaim_exposure"](indicators.get("naaim_exposure", 0))
    pos = aiae_score * 0.50 + naaim_score * 0.50
    
    fg_score = SCORING_FUNCS["fear_greed"](indicators.get("fear_greed", 0))
    pcr_score = SCORING_FUNCS["put_call_ratio"](indicators.get("put_call_ratio", 0))
    vix_score = SCORING_FUNCS["vix"](indicators.get("vix", 0))
    sent = fg_score * 0.40 + pcr_score * 0.30 + vix_score * 0.30
    
    cape_score = SCORING_FUNCS["cape"](indicators.get("cape", 0))
    erp_score = SCORING_FUNCS["erp"](indicators.get("erp", 0))
    val = cape_score * 0.60 + erp_score * 0.40
    
    m7_score = SCORING_FUNCS["m7_concentration"](indicators.get("m7_concentration", 0))
    rsp_score = SCORING_FUNCS["rsp_spy"](indicators.get("rsp_spy", 0))
    struc = m7_score * 0.50 + rsp_score * 0.50
    
    score = (liq * factor_weights["liquidity_factor"] +
            pos * factor_weights["positioning_factor"] +
            sent * factor_weights["sentiment_factor"] +
            val * factor_weights["valuation_factor"] +
            struc * factor_weights["structure_factor"])
    return round(score, 1)

def run_backtest():
    """Run all 4 models on historical events for comparison"""
    # Re-importing to avoid circular issues and use local definitions
    from app.mock.macro import BACKTEST_EVENTS, HISTORICAL_INDICATOR_VALUES
    
    # Original 8 weights from weight_optimizer.py
    original_8_weights = {
        "cape": 0.1466, "aiae": 0.2014, "m7_concentration": 0.1118, "vix": 0.0805,
        "yield_curve": 0.1086, "pe_gap": 0.0863, "trend": 0.2248, "erp": 0.0400
    }

    results = []
    for event in BACKTEST_EVENTS:
        date = event["date"]
        ind = HISTORICAL_INDICATOR_VALUES[date]
        
        # Model A
        score_a = sum(SCORING_FUNCS[k](ind[k]) * original_8_weights[k] for k in original_8_weights)
        
        # Model B (18 indicators, default 55/70)
        # Use compute_composite_score_v2 but override signal thresholds for comparison
        score_b = 0
        for k, w in INDICATOR_WEIGHTS.items():
            score_b += SCORING_FUNCS[k](ind[k]) * w
        
        # Model C
        score_c = compute_score_v3_5factor(ind)
        
        # Model D (18 indicators, high 55/65 threshold)
        score_d = score_b
        
        results.append({
            "date": date,
            "event": event["event"],
            "max_dd": event["max_dd"],
            "return_1y": event["return_1y"],
            "model_a": round(score_a, 1),
            "model_b": round(score_b, 1),
            "model_c": score_c,
            "model_d": round(score_d, 1)
        })
    return results
