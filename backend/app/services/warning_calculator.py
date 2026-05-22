"""
Warning Indicator Weight Calculator
Weights derived from reverse engineering against 13 historical crash data points.
Optimization target: reproduce historical composite scores with RMSE < 5 points.
Note: Achieved RMSE ~11.5 with current heuristic scoring functions.
"""

OPTIMIZED_WEIGHTS = {
  "cape": 0.01,
  "aiae": 0.2943,
  "vix": 0.0688,
  "trend": 0.3114,
  "erp": 0.01,
  "yield_curve": 0.2391,
  "pe_gap": 0.01,
  "m7_concentration": 0.0565
}

HISTORICAL_BACKTEST = [
    {"date": "1929-09", "event": "大萧条前夕", "target": 85, "computed": 86.09, "yr1_return": "-38.6%", "max_drawdown": "-86.2%", "correct": True},
    {"date": "1937-02", "event": "1937二次探底前", "target": 72, "computed": 48.85, "yr1_return": "-35.0%", "max_drawdown": "-60.0%", "correct": True},
    {"date": "1946-05", "event": "战后通胀回调", "target": 55, "computed": 55.07, "yr1_return": "-12.1%", "max_drawdown": "-29.6%", "correct": True},
    {"date": "1968-12", "event": "漂亮50泡沫前夕", "target": 68, "computed": 65.99, "yr1_return": "-8.5%", "max_drawdown": "-36.1%", "correct": True},
    {"date": "1972-12", "event": "漂亮50泡沫顶点", "target": 78, "computed": 71.07, "yr1_return": "-14.7%", "max_drawdown": "-48.2%", "correct": True},
    {"date": "1987-08", "event": "黑色星期一前夕", "target": 62, "computed": 71.77, "yr1_return": "-12.8%", "max_drawdown": "-33.5%", "correct": True},
    {"date": "1990-06", "event": "海湾战争前夕", "target": 50, "computed": 47.40, "yr1_return": "-3.1%", "max_drawdown": "-19.9%", "correct": True},
    {"date": "1999-12", "event": "互联网泡沫顶点", "target": 82, "computed": 91.14, "yr1_return": "-9.1%", "max_drawdown": "-49.1%", "correct": True},
    {"date": "2007-10", "event": "次贷危机前夕", "target": 75, "computed": 70.93, "yr1_return": "-37.0%", "max_drawdown": "-56.8%", "correct": True},
    {"date": "2011-04", "event": "欧债危机", "target": 48, "computed": 50.00, "yr1_return": "+2.1%", "max_drawdown": "-19.4%", "correct": False},
    {"date": "2015-08", "event": "中国股灾溢出", "target": 52, "computed": 29.54, "yr1_return": "+1.4%", "max_drawdown": "-14.2%", "correct": False},
    {"date": "2020-02", "event": "新冠崩盘前", "target": 55, "computed": 75.83, "yr1_return": "+18.4%", "max_drawdown": "-33.9%", "correct": True},
    {"date": "2021-12", "event": "后疫情泡沫", "target": 72, "computed": 75.86, "yr1_return": "-18.1%", "max_drawdown": "-25.4%", "correct": True},
]

def score_cape(v):
    if v < 15: return 0
    elif v < 20: return 20 + (v-15)/5 * 25
    elif v < 25: return 45 + (v-20)/5 * 20
    elif v < 30: return 65 + (v-25)/5 * 15
    elif v < 35: return 80 + (v-30)/5 * 15
    else: return 100

def score_aiae(v):
    if v < 0.20: return 0
    elif v < 0.30: return (v-0.20)/0.10 * 40
    elif v < 0.40: return 40 + (v-0.30)/0.10 * 30
    elif v < 0.50: return 70 + (v-0.40)/0.10 * 30
    else: return 100

def score_m7(v):
    if v < 10: return 0
    elif v < 15: return (v-10)/5 * 20
    elif v < 22: return 20 + (v-15)/7 * 40
    elif v < 30: return 60 + (v-22)/8 * 40
    else: return 100

def score_vix(v):
    if v < 12: return 100
    elif v < 15: return 80
    elif v < 19: return 60
    elif v < 24: return 30
    else: return 10

def score_yield_curve(v):
    if v < -80: return 100
    elif v < -40: return 90
    elif v < -10: return 80
    elif v < 20: return 65
    elif v < 80: return 40
    elif v < 150: return 15
    else: return 0

def score_pe_gap(v):
    if v < 10: return 10
    elif v < 15: return 50
    elif v < 25: return 85
    else: return 100

def score_trend(v):
    if v < -5: return 20
    elif v < 5: return 50
    elif v < 15: return 85
    else: return 100

def score_erp(v):
    if v < -0.06: return 100
    elif v < -0.02: return 85
    elif v < 0.02: return 50
    elif v < 0.05: return 20
    else: return 5

SCORING_FUNCS = {
    "cape": score_cape,
    "aiae": score_aiae,
    "m7_concentration": score_m7,
    "vix": score_vix,
    "yield_curve": score_yield_curve,
    "pe_gap": score_pe_gap,
    "trend": score_trend,
    "erp": score_erp
}

def compute_composite_score(indicators: dict) -> dict:
    total_score = 0
    breakdown = {}
    for key, weight in OPTIMIZED_WEIGHTS.items():
        val = indicators.get(key, 0)
        ind_score = SCORING_FUNCS[key](val)
        weighted = ind_score * weight
        total_score += weighted
        breakdown[key] = {
            "value": val,
            "score": round(ind_score, 2),
            "weighted": round(weighted, 2)
        }
    
    signal = "绿色"
    if total_score > 70: signal = "红色预警"
    elif total_score > 55: signal = "橙色预警"
    elif total_score > 40: signal = "黄色预警"
    
    return {
        "score": round(total_score, 1),
        "signal": signal,
        "breakdown": breakdown
    }
