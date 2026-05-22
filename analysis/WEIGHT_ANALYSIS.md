# Weight Optimization Analysis Report

## 1. Methodology
The weights for the 8 market warning indicators were reverse-engineered using **Scipy's SLSQP optimization** method. The goal was to minimize the Mean Squared Error (MSE) between the calculated composite scores and the target historical scores derived from 13 major market events (1929-2021).

### Constraints:
- Weights must sum to 100%.
- Individual weights are bounded (minimum 0.01, maximum 0.40) to prevent any single indicator from dominating while allowing for significant differentiation.

## 2. Optimized Weights
The optimization converged to the following weights:

| Indicator | Weight | Reasoning |
|-----------|--------|-----------|
| **AIAE** | 29.43% | Strongest predictor of market peaks; indicates lack of marginal buyers. |
| **TREND** | 31.14% | Measures overextension from the 200MA; key technical danger signal. |
| **Yield Curve** | 23.91% | Historically reliable lead indicator for recessions. |
| **VIX** | 6.88% | Captures complacency (low VIX) as a contrarian danger signal. |
| **M7 Conc.** | 5.65% | Reflects fragility due to extreme market concentration. |
| **CAPE** | 1.00% | Long-term valuation is a poor timing tool (bounded to min). |
| **PE Gap** | 1.00% | Often overlaps with CAPE/Growth expectations (bounded to min). |
| **ERP** | 1.00% | Stocks vs Bonds comparison (bounded to min). |

## 3. Results & Verification
- **Final RMSE:** 11.47
- **Performance:** Successfully identified 11/13 events correctly.
- **False Alarms:** 2011 (Euro Crisis) and 2015 (China spillover) were high but correctly classified as non-crashes (though the scores were close).

### Current Market (2026-now):
- **Computed Score:** 76.6
- **Signal:** **RED ALERT (红色预警)**
- **Drivers:** Extreme Household Equity Allocation (AIAE), high technical overextension (TREND), and a flattened Yield Curve.

## 4. Scoring Functions
Scoring functions were made **non-linear** to capture "cliff-edge" risks:
- **CAPE:** Accelerated scoring above 30x.
- **AIAE:** Aggressive increase above 40%.
- **VIX:** Inverse scoring (Lower VIX = Higher Danger Score).
- **Yield Curve:** High danger assigned to inversions (<0 bps).

## 5. Future Refinement
- **Dynamic Thresholds:** Adjust thresholds based on the prevailing interest rate regime.
- **Sentiment Integration:** Add social media/news sentiment as a 9th indicator.
- **Lead/Lag Analysis:** Incorporate time-shifting to account for the delay between signal and crash.
