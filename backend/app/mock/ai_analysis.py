def get_ai_analysis(ticker: str, strategy: str, strike: float, expiry: str):
    responses = {
        "Sell Put": {
            "validity": "✅ 策略合理性: 当前IV Rank 78，卖出期权有优势",
            "risks": "⚠️ 风险点: 财报前3天持仓，IV可能继续上升",
            "market_exp": "📊 市场预期: 隐含波动率暗示±$45移动 (±5.1%)",
            "key_levels": "🎯 关键价位: $820 (Put Wall), $900 (Gamma Wall), $875 (Max Pain)",
            "hedging": "🛡 建议对冲: 买入 $800P 作为灾难保险，成本约$2.50",
            "conclusion": "💡 结论: 合理，但建议等财报后再入场以避免Vega风险"
        },
        "Buy Call": {
            "validity": "✅ 策略合理性: 股价突破阻力位，动量强劲",
            "risks": "⚠️ 风险点: IV处于高位，Theta损耗较快",
            "market_exp": "📊 市场预期: 上涨空间看至 $950",
            "key_levels": "🎯 关键价位: $880 (Pivot), $920 (Target)",
            "hedging": "🛡 建议对冲: 考虑牛市价差 (Bull Call Spread) 降低成本",
            "conclusion": "💡 结论: 看好短期爆发，但建议控制仓位"
        },
        "Iron Condor": {
            "validity": "✅ 策略合理性: 预计进入盘整期，IV偏高适合做空波动率",
            "risks": "⚠️ 风险点: 两端均有触碰风险，需严守止损",
            "market_exp": "📊 市场预期: 震荡区间 $850 - $920",
            "key_levels": "🎯 关键价位: $840 (Lower Wing), $930 (Upper Wing)",
            "hedging": "🛡 建议对冲: 动态调整Delta至中性",
            "conclusion": "💡 结论: 适合在波动率回归均值时获利"
        }
    }
    return responses.get(strategy, responses["Sell Put"])
