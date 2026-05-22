"""
Market Regime Detector — Dynamic weight switching for warning model.

5 regimes, evaluated in priority order:
1. credit_stress  — HY OAS / MOVE blowing out
2. rate_shock     — yield curve inverted + ERP deteriorating
3. vol_spike      — VIX / SKEW spiking
4. bull_late      — valuations + positioning at extremes, liquidity still OK
5. normal         — default / recovery

Soft-blending: if confidence < 0.85, blend with NORMAL weights to avoid
sharp score jumps during regime transitions.
"""

from enum import Enum
from typing import Dict, Tuple, List, Optional


class MarketRegime(Enum):
    BULL_LATE      = "bull_late"
    RATE_SHOCK     = "rate_shock"
    CREDIT_STRESS  = "credit_stress"
    VOL_SPIKE      = "vol_spike"
    NORMAL         = "normal"
    MIXED          = "mixed"


# ── Detection rules ────────────────────────────────────────────────────────────
# Each rule: list of (indicator, operator, threshold) tuples.
# Regime triggers when >= min_conditions are satisfied.
REGIME_DETECTION_RULES: Dict[str, dict] = {
    "credit_stress": {
        "priority": 1,
        "min_conditions": 2,
        "description": "信用市场压力主导",
        "conditions": [
            ("hy_oas",        ">",  450),
            ("move",          ">",  110),
            ("dxy",           ">",  105),   # dollar surging = global risk-off
        ],
    },
    "rate_shock": {
        "priority": 2,
        "min_conditions": 2,
        "description": "利率冲击主导",
        "conditions": [
            ("yield_curve",   "<",  -30),   # inverted
            ("erp",           "<",  -0.02), # equity no longer beats bonds
            ("move",          ">",   90),
        ],
    },
    "vol_spike": {
        "priority": 3,
        "min_conditions": 2,
        "description": "波动率冲击主导",
        "conditions": [
            ("vix",           ">",  25),
            ("skew",          ">", 145),
            ("put_call_ratio",">",  1.3),
        ],
    },
    "bull_late": {
        "priority": 4,
        "min_conditions": 3,
        "description": "牛市末期过热",
        "conditions": [
            ("aiae",            ">",  0.45),
            ("naaim_exposure",  ">", 80.0),
            ("yield_curve",     ">",  0.0),  # curve still positive
            ("hy_oas",          "<", 400.0), # credit still OK
            ("vix",             "<",  20.0), # complacency
        ],
    },
}


# ── Per-regime indicator weights ───────────────────────────────────────────────
REGIME_WEIGHTS: Dict[MarketRegime, Dict[str, float]] = {

    MarketRegime.BULL_LATE: {
        # Valuation + positioning dominate; flow / liquidity less urgent
        "cape":              0.10,
        "aiae":              0.12,
        "m7_concentration":  0.10,
        "naaim_exposure":    0.10,
        "vix":               0.06,
        "yield_curve":       0.07,
        "pe_gap":            0.07,
        "erp":               0.06,
        "fear_greed":        0.06,
        "put_call_ratio":    0.04,
        "skew":              0.03,
        "move":              0.05,
        "hy_oas":            0.04,
        "dxy":               0.02,
        "gold_copper":       0.03,
        "sectors_200dma":    0.03,
        "rsp_spy":           0.02,
        "trend":             0.00,
    },

    MarketRegime.RATE_SHOCK: {
        # Rates + credit + ERP dominate
        "yield_curve":       0.18,
        "erp":               0.14,
        "move":              0.14,
        "hy_oas":            0.10,
        "cape":              0.05,
        "aiae":              0.05,
        "m7_concentration":  0.05,
        "vix":               0.05,
        "pe_gap":            0.05,
        "fear_greed":        0.04,
        "put_call_ratio":    0.03,
        "skew":              0.04,
        "dxy":               0.04,
        "gold_copper":       0.02,
        "sectors_200dma":    0.01,
        "rsp_spy":           0.01,
        "naaim_exposure":    0.00,
        "trend":             0.00,
    },

    MarketRegime.CREDIT_STRESS: {
        # Credit + dollar + safe-haven dominate
        "hy_oas":            0.20,
        "move":              0.16,
        "dxy":               0.10,
        "gold_copper":       0.08,
        "yield_curve":       0.08,
        "vix":               0.06,
        "skew":              0.06,
        "erp":               0.05,
        "fear_greed":        0.05,
        "put_call_ratio":    0.04,
        "sectors_200dma":    0.04,
        "aiae":              0.03,
        "naaim_exposure":    0.03,
        "cape":              0.01,
        "pe_gap":            0.01,
        "m7_concentration":  0.00,
        "rsp_spy":           0.00,
        "trend":             0.00,
    },

    MarketRegime.VOL_SPIKE: {
        # Volatility + options market + sentiment dominate
        "vix":               0.18,
        "skew":              0.12,
        "move":              0.10,
        "put_call_ratio":    0.10,
        "fear_greed":        0.10,
        "hy_oas":            0.08,
        "gold_copper":       0.06,
        "dxy":               0.05,
        "yield_curve":       0.05,
        "sectors_200dma":    0.04,
        "naaim_exposure":    0.04,
        "aiae":              0.03,
        "erp":               0.02,
        "cape":              0.01,
        "pe_gap":            0.01,
        "m7_concentration":  0.01,
        "rsp_spy":           0.00,
        "trend":             0.00,
    },

    MarketRegime.NORMAL: {
        # Statistically optimised ensemble weights (walk-forward v2, 2026-05-22)
        "move":              0.1200,
        "m7_concentration":  0.1200,
        "hy_oas":            0.0927,
        "gold_copper":       0.0880,
        "dxy":               0.0797,
        "naaim_exposure":    0.0752,
        "yield_curve":       0.0713,
        "pe_gap":            0.0563,
        "fear_greed":        0.0528,
        "erp":               0.0520,
        "sectors_200dma":    0.0520,
        "cape":              0.0200,
        "vix":               0.0200,
        "skew":              0.0200,
        "trend":             0.0200,
        "aiae":              0.0200,
        "put_call_ratio":    0.0200,
        "rsp_spy":           0.0200,
    },
}

# MIXED = simple average of all non-NORMAL regimes
def _compute_mixed_weights() -> Dict[str, float]:
    regimes = [MarketRegime.BULL_LATE, MarketRegime.RATE_SHOCK,
               MarketRegime.CREDIT_STRESS, MarketRegime.VOL_SPIKE]
    all_keys = set()
    for r in regimes:
        all_keys |= set(REGIME_WEIGHTS[r].keys())
    mixed = {}
    for k in all_keys:
        mixed[k] = sum(REGIME_WEIGHTS[r].get(k, 0.0) for r in regimes) / len(regimes)
    total = sum(mixed.values())
    return {k: v / total for k, v in mixed.items()}

REGIME_WEIGHTS[MarketRegime.MIXED] = _compute_mixed_weights()


# ── Core detection logic ───────────────────────────────────────────────────────
def _eval_condition(indicators: Dict[str, float], cond: tuple) -> Tuple[bool, str]:
    """Evaluate a single (indicator, operator, threshold) condition."""
    ind, op, thresh = cond
    val = indicators.get(ind)
    if val is None:
        return False, f"{ind}=N/A"
    if op == ">":
        ok = val > thresh
    elif op == "<":
        ok = val < thresh
    else:
        ok = False
    label = f"{ind}={val:.2g} {'>' if op=='>' else '<'} {thresh}"
    return ok, label


def detect_regime(
    indicators: Dict[str, float]
) -> Tuple[MarketRegime, float, List[str]]:
    """
    Returns (regime, confidence, evidence_list).

    confidence = triggered_conditions / total_conditions  (capped at 0.95)
    If no regime triggers, returns (NORMAL, 1.0, [])
    """
    candidates = []

    for name, rule in sorted(REGIME_DETECTION_RULES.items(),
                              key=lambda x: x[1]["priority"]):
        triggered, evidence = [], []
        for cond in rule["conditions"]:
            ok, label = _eval_condition(indicators, cond)
            if ok:
                triggered.append(label)
            evidence.append(label)

        n_triggered = len(triggered)
        n_total = len(rule["conditions"])
        if n_triggered >= rule["min_conditions"]:
            confidence = min(0.95, n_triggered / n_total)
            candidates.append((rule["priority"], name, confidence, triggered))

    if not candidates:
        return MarketRegime.NORMAL, 1.0, ["所有危机条件均未触发"]

    # Highest priority (lowest number) wins
    candidates.sort(key=lambda x: x[0])
    _, name, confidence, evidence = candidates[0]
    regime = MarketRegime(name)
    return regime, confidence, evidence


# ── Weight blending ────────────────────────────────────────────────────────────
def get_regime_weights(
    regime: MarketRegime,
    confidence: float,
    blend_with: MarketRegime = MarketRegime.NORMAL,
    blend_threshold: float = 0.85,
) -> Dict[str, float]:
    """
    If confidence >= blend_threshold: use regime weights directly.
    Otherwise: soft-blend regime weights with NORMAL weights.
    This prevents score jumping when hovering near a regime boundary.
    """
    w_regime = REGIME_WEIGHTS[regime]
    if confidence >= blend_threshold:
        return dict(w_regime)

    w_base = REGIME_WEIGHTS[blend_with]
    alpha = confidence  # higher confidence → more regime weight
    all_keys = set(w_regime) | set(w_base)
    blended = {k: w_regime.get(k, 0.0) * alpha + w_base.get(k, 0.0) * (1 - alpha)
               for k in all_keys}
    total = sum(blended.values())
    return {k: v / total for k, v in blended.items()}
