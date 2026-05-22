# Realistic mock data for NVDA (IV Rank 78, positive GEX, slight put skew)
# This will be used to verify the StrategySelector returns Iron Condor + Bull Put Spread + CSP as top 3

NVDA_SIGNALS = {
    "ticker": "NVDA",
    "iv_rank": 78,
    "skew": 6.5,
    "net_gex": 1200000,
    "trend_pct": 12.5,
    "days_to_earnings": 25
}
