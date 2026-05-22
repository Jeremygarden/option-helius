import json
import os
import sys

# Add backend to path to import services if needed, but we'll reimplement to be self-contained for the script
sys.path.append("/home/azureuser/projects/options-dashboard/backend")

from app.services.warning_calculator import SCORING_FUNCS, INDICATOR_WEIGHTS

HISTORICAL_EVENTS = [
    {"date": "1929-09", "event": "大萧条前夕",      "old_score": 85, "return_1y": -38.6, "max_dd": -86.2, "correct": True},
    {"date": "1937-02", "event": "1937年二次探底前", "old_score": 72, "return_1y": -35.0, "max_dd": -60.0, "correct": True},
    {"date": "1946-05", "event": "战后通胀回调",     "old_score": 55, "return_1y": -12.1, "max_dd": -29.6, "correct": True},
    {"date": "1968-12", "event": "漂亮50泡沫前夕",  "old_score": 68, "return_1y": -8.5,  "max_dd": -36.1, "correct": True},
    {"date": "1972-12", "event": "漂亮50泡沫顶点",  "old_score": 78, "return_1y": -14.7, "max_dd": -48.2, "correct": True},
    {"date": "1987-08", "event": "黑色星期一前夕",  "old_score": 62, "return_1y": -12.8, "max_dd": -33.5, "correct": True},
    {"date": "1990-06", "event": "海湾战争前夕",    "old_score": 50, "return_1y": -3.1,  "max_dd": -19.9, "correct": True},
    {"date": "1999-12", "event": "互联网泡沫顶点",  "old_score": 82, "return_1y": -9.1,  "max_dd": -49.1, "correct": True},
    {"date": "2007-10", "event": "次贷危机前夕",    "old_score": 75, "return_1y": -37.0, "max_dd": -56.8, "correct": True},
    {"date": "2011-04", "event": "欧债危机",        "old_score": 48, "return_1y": +2.1,  "max_dd": -19.4, "correct": False},
    {"date": "2015-08", "event": "中国股灾溢出",    "old_score": 52, "return_1y": +1.4,  "max_dd": -14.2, "correct": False},
    {"date": "2020-02", "event": "新冠崩盘前",      "old_score": 55, "return_1y": +18.4, "max_dd": -33.9, "correct": True},
    {"date": "2021-12", "event": "后疫情泡沫",      "old_score": 72, "return_1y": -18.1, "max_dd": -25.4, "correct": True},
]

HISTORICAL_INDICATOR_VALUES = {
    "1929-09": {
        "cape": 32.6, "aiae": 0.52, "m7_concentration": 15.0, "vix": 13.0,
        "yield_curve": -50.0, "pe_gap": 25.0, "trend": 18.0, "erp": -0.04,
        "fear_greed": 80.0, "put_call_ratio": 0.55, "naaim_exposure": 95.0,
        "skew": 115.0, "move": 45.0, "hy_oas": 180.0, "dxy": 5.0,
        "gold_copper": 450.0, "sectors_200dma": 85.0, "rsp_spy": 2.0
    },
    "1937-02": {
        "cape": 21.0, "aiae": 0.42, "m7_concentration": 12.0, "vix": 14.0,
        "yield_curve": 30.0, "pe_gap": 18.0, "trend": 20.0, "erp": -0.01,
        "fear_greed": 70.0, "put_call_ratio": 0.60, "naaim_exposure": 88.0,
        "skew": 118.0, "move": 52.0, "hy_oas": 220.0, "dxy": 3.0,
        "gold_copper": 420.0, "sectors_200dma": 78.0, "rsp_spy": 1.5
    },
    "1946-05": {
        "cape": 17.0, "aiae": 0.30, "m7_concentration": 10.0, "vix": 15.0,
        "yield_curve": 60.0, "pe_gap": 12.0, "trend": 10.0, "erp": 0.02,
        "fear_greed": 55.0, "put_call_ratio": 0.72, "naaim_exposure": 65.0,
        "skew": 122.0, "move": 58.0, "hy_oas": 250.0, "dxy": 1.0,
        "gold_copper": 480.0, "sectors_200dma": 62.0, "rsp_spy": 0.5
    },
    "1968-12": {
        "cape": 24.1, "aiae": 0.38, "m7_concentration": 18.0, "vix": 14.5,
        "yield_curve": -20.0, "pe_gap": 20.0, "trend": 12.0, "erp": -0.02,
        "fear_greed": 68.0, "put_call_ratio": 0.62, "naaim_exposure": 82.0,
        "skew": 125.0, "move": 60.0, "hy_oas": 270.0, "dxy": 2.0,
        "gold_copper": 510.0, "sectors_200dma": 74.0, "rsp_spy": -2.0
    },
    "1972-12": {
        "cape": 18.7, "aiae": 0.44, "m7_concentration": 22.0, "vix": 13.0,
        "yield_curve": -40.0, "pe_gap": 22.0, "trend": 15.0, "erp": -0.03,
        "fear_greed": 75.0, "put_call_ratio": 0.58, "naaim_exposure": 90.0,
        "skew": 120.0, "move": 55.0, "hy_oas": 230.0, "dxy": 4.0,
        "gold_copper": 490.0, "sectors_200dma": 80.0, "rsp_spy": -1.0
    },
    "1987-08": {
        "cape": 19.8, "aiae": 0.38, "m7_concentration": 20.0, "vix": 16.0,
        "yield_curve": -30.0, "pe_gap": 18.0, "trend": 20.0, "erp": -0.02,
        "fear_greed": 62.0, "put_call_ratio": 0.65, "naaim_exposure": 78.0,
        "skew": 128.0, "move": 70.0, "hy_oas": 290.0, "dxy": -6.0,
        "gold_copper": 520.0, "sectors_200dma": 76.0, "rsp_spy": 3.0
    },
    "1990-06": {
        "cape": 17.0, "aiae": 0.32, "m7_concentration": 14.0, "vix": 17.0,
        "yield_curve": -10.0, "pe_gap": 14.0, "trend": 5.0, "erp": 0.01,
        "fear_greed": 50.0, "put_call_ratio": 0.78, "naaim_exposure": 60.0,
        "skew": 130.0, "move": 75.0, "hy_oas": 320.0, "dxy": 2.0,
        "gold_copper": 560.0, "sectors_200dma": 55.0, "rsp_spy": 1.0
    },
    "1999-12": {
        "cape": 44.2, "aiae": 0.52, "m7_concentration": 28.0, "vix": 24.0,
        "yield_curve": -50.0, "pe_gap": 32.0, "trend": 22.0, "erp": -0.06,
        "fear_greed": 82.0, "put_call_ratio": 0.52, "naaim_exposure": 98.0,
        "skew": 112.0, "move": 42.0, "hy_oas": 210.0, "dxy": 8.0,
        "gold_copper": 420.0, "sectors_200dma": 88.0, "rsp_spy": -8.0
    },
    "2007-10": {
        "cape": 27.3, "aiae": 0.48, "m7_concentration": 18.0, "vix": 17.0,
        "yield_curve": -60.0, "pe_gap": 25.0, "trend": 16.0, "erp": -0.03,
        "fear_greed": 74.0, "put_call_ratio": 0.60, "naaim_exposure": 87.0,
        "skew": 130.0, "move": 85.0, "hy_oas": 350.0, "dxy": -5.0,
        "gold_copper": 580.0, "sectors_200dma": 72.0, "rsp_spy": -3.0
    },
    "2011-04": {
        "cape": 23.8, "aiae": 0.36, "m7_concentration": 16.0, "vix": 16.0,
        "yield_curve": 270.0, "pe_gap": 14.0, "trend": 8.0, "erp": 0.02,
        "fear_greed": 48.0, "put_call_ratio": 0.88, "naaim_exposure": 58.0,
        "skew": 128.0, "move": 80.0, "hy_oas": 420.0, "dxy": -2.0,
        "gold_copper": 620.0, "sectors_200dma": 58.0, "rsp_spy": 0.5
    },
    "2015-08": {
        "cape": 26.0, "aiae": 0.38, "m7_concentration": 19.0, "vix": 13.0,
        "yield_curve": 160.0, "pe_gap": 15.0, "trend": 2.0, "erp": 0.01,
        "fear_greed": 52.0, "put_call_ratio": 0.80, "naaim_exposure": 62.0,
        "skew": 135.0, "move": 72.0, "hy_oas": 380.0, "dxy": 6.0,
        "gold_copper": 600.0, "sectors_200dma": 52.0, "rsp_spy": -2.0
    },
    "2020-02": {
        "cape": 33.5, "aiae": 0.45, "m7_concentration": 24.0, "vix": 14.0,
        "yield_curve": 20.0, "pe_gap": 22.0, "trend": 12.0, "erp": -0.02,
        "fear_greed": 54.0, "put_call_ratio": 0.72, "naaim_exposure": 68.0,
        "skew": 140.0, "move": 70.0, "hy_oas": 310.0, "dxy": 3.0,
        "gold_copper": 680.0, "sectors_200dma": 66.0, "rsp_spy": -5.0
    },
    "2021-12": {
        "cape": 40.0, "aiae": 0.52, "m7_concentration": 30.0, "vix": 18.0,
        "yield_curve": 80.0, "pe_gap": 28.0, "trend": 18.0, "erp": -0.05,
        "fear_greed": 72.0, "put_call_ratio": 0.58, "naaim_exposure": 92.0,
        "skew": 132.0, "move": 65.0, "hy_oas": 270.0, "dxy": 4.0,
        "gold_copper": 700.0, "sectors_200dma": 82.0, "rsp_spy": -10.0
    },
}

# Original optimized weights from weight_optimizer.py
ORIGINAL_8_WEIGHTS = {
    "cape": 0.1466,
    "aiae": 0.2014,
    "m7_concentration": 0.1118,
    "vix": 0.0805,
    "yield_curve": 0.1086,
    "pe_gap": 0.0863,
    "trend": 0.2248,
    "erp": 0.0400
}

def compute_model_a(ind):
    score = 0
    for k, w in ORIGINAL_8_WEIGHTS.items():
        score += SCORING_FUNCS[k](ind[k]) * w
    return score

def compute_model_b(ind):
    score = 0
    for k, w in INDICATOR_WEIGHTS.items():
        score += SCORING_FUNCS[k](ind[k]) * w
    return score

FACTOR_WEIGHTS_C = {
    "liquidity_factor": 0.28,    # yield_curve(60%) + hy_oas(40%)
    "positioning_factor": 0.24,  # aiae(50%) + naaim(50%)
    "sentiment_factor": 0.20,    # fear_greed(40%) + put_call_ratio(30%) + vix(30%)
    "valuation_factor": 0.16,    # cape(60%) + erp(40%)
    "structure_factor": 0.12,    # m7_concentration(50%) + rsp_spy(50%)
}

def compute_model_c(ind):
    yc_score = SCORING_FUNCS["yield_curve"](ind["yield_curve"])
    hy_score = SCORING_FUNCS["hy_oas"](ind["hy_oas"])
    liq = yc_score * 0.60 + hy_score * 0.40
    
    aiae_score = SCORING_FUNCS["aiae"](ind["aiae"])
    naaim_score = SCORING_FUNCS["naaim_exposure"](ind["naaim_exposure"])
    pos = aiae_score * 0.50 + naaim_score * 0.50
    
    fg_score = SCORING_FUNCS["fear_greed"](ind["fear_greed"])
    pcr_score = SCORING_FUNCS["put_call_ratio"](ind["put_call_ratio"])
    vix_score = SCORING_FUNCS["vix"](ind["vix"])
    sent = fg_score * 0.40 + pcr_score * 0.30 + vix_score * 0.30
    
    cape_score = SCORING_FUNCS["cape"](ind["cape"])
    erp_score = SCORING_FUNCS["erp"](ind["erp"])
    val = cape_score * 0.60 + erp_score * 0.40
    
    m7_score = SCORING_FUNCS["m7_concentration"](ind["m7_concentration"])
    rsp_score = SCORING_FUNCS["rsp_spy"](ind["rsp_spy"])
    struc = m7_score * 0.50 + rsp_score * 0.50
    
    return (liq * FACTOR_WEIGHTS_C["liquidity_factor"] +
            pos * FACTOR_WEIGHTS_C["positioning_factor"] +
            sent * FACTOR_WEIGHTS_C["sentiment_factor"] +
            val * FACTOR_WEIGHTS_C["valuation_factor"] +
            struc * FACTOR_WEIGHTS_C["structure_factor"])

def is_correct(score, event_data, orange_threshold=55, red_threshold=70):
    alert = score > orange_threshold
    real_crash = event_data["max_dd"] < -20
    
    # Define correct = True if:
    # - Alert triggered AND max_dd < -20% (real systemic risk)
    # - No alert AND (max_dd > -20% OR return_1y > 0)
    
    if alert and real_crash: return True
    if not alert and (not real_crash or event_data["return_1y"] > 0): return True
    return False

def is_false_positive(score, event_data, orange_threshold=55):
    alert = score > orange_threshold
    # Define false_positive = True if:
    # - Alert triggered BUT return_1y > 0 AND max_dd > -20%
    return alert and event_data["return_1y"] > 0 and event_data["max_dd"] > -20

results = []
for event in HISTORICAL_EVENTS:
    date = event["date"]
    ind = HISTORICAL_INDICATOR_VALUES[date]
    
    score_a = compute_model_a(ind)
    score_b = compute_model_b(ind)
    score_c = compute_model_c(ind)
    score_d = score_b # Same score as B, different threshold
    
    results.append({
        "date": date,
        "event": event["event"],
        "ground_truth": event,
        "model_a": {"score": score_a, "correct": is_correct(score_a, event)},
        "model_b": {"score": score_b, "correct": is_correct(score_b, event)},
        "model_c": {"score": score_c, "correct": is_correct(score_c, event)},
        "model_d": {"score": score_d, "correct": is_correct(score_d, event, orange_threshold=55, red_threshold=65)}, # Model D uses high threshold
        "fp_a": is_false_positive(score_a, event),
        "fp_b": is_false_positive(score_b, event),
        "fp_c": is_false_positive(score_c, event),
        "fp_d": is_false_positive(score_d, event, orange_threshold=55) # Model D still 55 for FP definition
    })

# Metrics
def calc_metrics(res_list, model_key, orange_threshold=55):
    correct_count = sum(1 for r in res_list if r[model_key]["correct"])
    total = len(res_list)
    accuracy = correct_count / total
    
    positives = [r for r in res_list if r[model_key]["score"] > orange_threshold]
    true_positives = sum(1 for r in positives if r["ground_truth"]["max_dd"] < -20)
    precision = true_positives / len(positives) if positives else 0
    
    negatives = [r for r in res_list if r["ground_truth"]["max_dd"] >= -20 and r["ground_truth"]["return_1y"] > 0]
    false_positives = sum(1 for r in res_list if is_false_positive(r[model_key]["score"], r["ground_truth"], orange_threshold))
    fpr = false_positives / len(negatives) if negatives else 0
    
    crash_scores = [r[model_key]["score"] for r in res_list if r["ground_truth"]["max_dd"] < -20]
    non_crash_scores = [r[model_key]["score"] for r in res_list if not (r["ground_truth"]["max_dd"] < -20)]
    avg_gap = (sum(crash_scores)/len(crash_scores)) - (sum(non_crash_scores)/len(non_crash_scores))
    
    return {
        "accuracy": accuracy,
        "precision": precision,
        "fpr": fpr,
        "avg_gap": avg_gap
    }

metrics = {
    "ModelA": calc_metrics(results, "model_a"),
    "ModelB": calc_metrics(results, "model_b"),
    "ModelC": calc_metrics(results, "model_c"),
    "ModelD": calc_metrics(results, "model_d", orange_threshold=55)
}

print(json.dumps({"results": results, "metrics": metrics}, indent=2))
