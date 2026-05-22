import sys
import os
import math
from typing import Dict

# Mock the old step-function calculator since we don't have the original file
# Based on the user's snippet
def step_score_cape(v):
    if v > 35: return 90
    if v > 30: return 75
    if v > 25: return 50
    return 20

def step_score_vix(v):
    if v < 12: return 85
    if v < 15: return 60
    if v < 20: return 40
    return 20

def step_score_yield(v):
    if v < 0: return 90
    if v < 20: return 70
    if v < 50: return 50
    return 20

# Mock indicators for historical events (Simplified)
HISTORICAL_EVENTS = [
    {"name": "1929-09 (Pre-Crash)", "cape": 32.6, "vix": 10.0, "yield_curve": -50.0},
    {"name": "2000-03 (Dot-com Bubble)", "cape": 44.2, "vix": 13.5, "yield_curve": -20.0},
    {"name": "2007-10 (GFC Top)", "cape": 27.5, "vix": 14.0, "yield_curve": 10.0},
    {"name": "2020-02 (Covid Top)", "cape": 31.0, "vix": 14.5, "yield_curve": 15.0},
    {"name": "2021-11 (Recent Peak)", "cape": 39.5, "vix": 16.0, "yield_curve": 80.0},
    {"name": "2024-05 (Current-ish)", "cape": 34.0, "vix": 13.5, "yield_curve": -30.0},
]

# Simple Step Average
def compute_step_avg(data):
    s1 = step_score_cape(data["cape"])
    s2 = step_score_vix(data["vix"])
    s3 = step_score_yield(data["yield_curve"])
    return round((s1 + s2 + s3) / 3.0, 1)

from backend.app.services.warning_calculator_v2 import compute_score_sigmoid_18, MOCK_MOMENTUM_DATA

print("## Sigmoid vs Step Function Comparison\n")
print("| 时间 | Step分 | Sigmoid分 | Sigmoid+Momentum | 差异 |")
print("|------|--------|-----------|-----------------|------|")

for event in HISTORICAL_EVENTS:
    step_val = compute_step_avg(event)
    
    # We only have 3 indicators for mock events, compute_score_sigmoid_18 expects more
    # It will use neutral defaults for missing ones
    sig_result = compute_score_sigmoid_18(event)
    sig_val = sig_result["score"]
    
    # Sigmoid + Momentum (using mock momentum offsets for variety)
    sig_mom_result = compute_score_sigmoid_18(event, MOCK_MOMENTUM_DATA)
    sig_mom_val = sig_mom_result["score"]
    
    diff = round(sig_val - step_val, 1)
    print(f"| {event['name']} | {step_val} | {sig_val} | {sig_mom_val} | {diff} |")
