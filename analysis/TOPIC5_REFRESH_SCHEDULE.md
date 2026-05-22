# Macro Warning Indicator Refresh Schedule

This document outlines the tiered refresh system for the 8 macro warning indicators used in the Options Dashboard.

## Refresh Tiers

| Tier | Indicators | Frequency | Logic |
|------|------------|-----------|-------|
| **Daily** | VIX, Yield Curve, Trend, ERP | Mon-Fri 09:30 UTC | Real-time market data extraction. |
| **Weekly** | Composite Score | Mon 01:00 UTC | Full recompute of the aggregate risk score. |
| **Monthly** | CAPE, AIAE | 1st of Month 00:30 UTC | Fundamental data update (CAPE/AIAE). |
| **Quarterly** | M7 Concentration, PE Gap | Jan/Apr/Jul/Oct 1st | Earnings season cycle updates. |

## Partial Score Methodology

To provide a daily risk assessment despite some indicators being updated less frequently, a **Partial Composite Score** is calculated daily.

### Calculation Logic

1.  **Fresh Data**: Daily indicators (VIX, Yield Curve, Trend, ERP) are refreshed via API.
2.  **Cached Data**: Monthly and Quarterly indicators are pulled from the Redis cache.
3.  **Weighted Sum**:
    *   `Daily Indicators Total Weight`: 40% (10% + 15% + 10% + 5%)
    *   `Slow Indicators Total Weight`: 60% (20% + 15% + 15% + 10%)
4.  **Confidence Labeling**:
    *   **HIGH**: Full refresh just occurred (all indicators fresh).
    *   **MEDIUM**: Partial refresh (daily fresh, slow indicators cached but not expired).
    *   **LOW**: One or more slow indicators have exceeded their staleness threshold.

## Data Persistence (Redis)

- `indicator:{id}:value`: Latest raw value and timestamp.
- `indicator:{id}:score`: Normalized score (0-100) used for composite calculation.
- `composite:score:latest`: Most recent full composite score.
- `composite:score:partial`: Most recent partial composite score.
- `refresh:status`: Metadata about the last successful run for each tier.
