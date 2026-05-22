import numpy as np
from scipy.optimize import minimize
import json

# Historical Data Matrix
# Columns: cape, aiae, m7, vix, yield_curve, pe_gap, trend, erp
data_points = [
    {"date": "1929-09", "event": "大萧条前夕", "target": 85, "values": [32.6, 0.47, 22, 35, -45, 15, 18, -0.05]},
    {"date": "1937-02", "event": "1937二次探底前", "target": 72, "values": [17.4, 0.28, 18, 28, 60, 8, 8, 0.03]},
    {"date": "1946-05", "event": "战后通胀回调", "target": 55, "values": [15.2, 0.23, 14, 18, -20, 10, 5, 0.04]},
    {"date": "1968-12", "event": "漂亮50泡沫前夕", "target": 68, "values": [21.6, 0.37, 18, 20, 10, 22, 12, 0.01]},
    {"date": "1972-12", "event": "漂亮50泡沫顶点", "target": 78, "values": [18.9, 0.40, 20, 15, 15, 25, 10, 0.02]},
    {"date": "1987-08", "event": "黑色星期一前夕", "target": 62, "values": [20.1, 0.35, 16, 22, -15, 18, 22, -0.01]},
    {"date": "1990-06", "event": "海湾战争前夕", "target": 50, "values": [14.8, 0.27, 13, 25, -55, 12, -5, 0.04]},
    {"date": "1999-12", "event": "互联网泡沫顶点", "target": 82, "values": [44.2, 0.52, 29, 25, -50, 35, 25, -0.08]},
    {"date": "2007-10", "event": "次贷危机前夕", "target": 75, "values": [27.3, 0.42, 19, 19, -5, 20, 8, -0.02]},
    {"date": "2011-04", "event": "欧债危机", "target": 48, "values": [22.5, 0.35, 17, 17, 255, 15, 12, 0.05]},
    {"date": "2015-08", "event": "中国股灾溢出", "target": 52, "values": [24.8, 0.38, 18, 28, 155, 18, -8, 0.03]},
    {"date": "2020-02", "event": "新冠崩盘前", "target": 55, "values": [30.7, 0.44, 22, 18, 15, 22, 12, 0.01]},
    {"date": "2021-12", "event": "后疫情泡沫", "target": 72, "values": [40.1, 0.50, 28, 18, 85, 28, 15, -0.01]},
    {"date": "2026-now", "event": "Current", "target": 67, "values": [37.0, 0.482, 32.8, 18.1, 54, 25.3, 8, -0.081]}
]

# Scoring Functions
def score_cape(v):
    # Aggressive
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

scoring_funcs = [score_cape, score_aiae, score_m7, score_vix, score_yield_curve, score_pe_gap, score_trend, score_erp]

# Prepare Score Matrix
scores_matrix = []
targets = []
for p in data_points:
    row_scores = [scoring_funcs[i](p["values"][i]) for i in range(len(scoring_funcs))]
    scores_matrix.append(row_scores)
    targets.append(p["target"])

scores_matrix = np.array(scores_matrix)
targets = np.array(targets)

def objective(weights):
    computed = np.dot(scores_matrix, weights)
    return np.mean((computed - targets)**2)

# Constraints and Bounds
constraints = ({'type': 'eq', 'fun': lambda w: np.sum(w) - 1})
bounds = [(0.01, 0.40) for _ in range(8)]

# Initial Guesses
starts = [
    [0.20, 0.15, 0.15, 0.10, 0.15, 0.10, 0.10, 0.05],
    [0.125] * 8,
    [0.3, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
    [0.1, 0.3, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
]

best_res = None
for start in starts:
    res = minimize(objective, start, method='SLSQP', bounds=bounds, constraints=constraints)
    if best_res is None or res.fun < best_res.fun:
        best_res = res

res = best_res

if res.success:
    opt_weights = res.x
    print("Optimized Weights:")
    headers = ["CAPE", "AIAE", "M7", "VIX", "YieldCurve", "PEGAP", "TREND", "ERP"]
    for h, w in zip(headers, opt_weights):
        print(f"{h}: {w:.4f}")
    
    print("\nVerification Table:")
    print(f"{'Date':<10} | {'Event':<15} | {'Target':<6} | {'Computed':<8} | {'Error':<6}")
    computed_scores = np.dot(scores_matrix, opt_weights)
    for i, p in enumerate(data_points):
        print(f"{p['date']:<10} | {p['event']:<15} | {p['target']:<6} | {computed_scores[i]:<8.2f} | {computed_scores[i]-p['target']:<6.2f}")
    
    rmse = np.sqrt(res.fun)
    print(f"\nOverall RMSE: {rmse:.4f}")
    
    weight_json = {k.lower(): round(float(v), 4) for k, v in zip(headers, opt_weights)}
    if "yieldcurve" in weight_json:
        weight_json["yield_curve"] = weight_json.pop("yieldcurve")
    if "pegap" in weight_json:
        weight_json["pe_gap"] = weight_json.pop("pegap")
    if "m7" in weight_json:
        weight_json["m7_concentration"] = weight_json.pop("m7")
        
    print("\nFinal Weight JSON:")
    print(json.dumps(weight_json, indent=2))
else:
    print("Optimization failed:", res.message)
