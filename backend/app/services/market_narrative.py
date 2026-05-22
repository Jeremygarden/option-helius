from typing import Dict, Any

class MarketNarrativeService:
    """
    Service to generate natural language summaries of market sentiment
    based on options chain data.
    """

    def generate_narrative(self, ticker: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes option data to return structured metrics and a Chinese summary.
        
        Input 'data' expects:
            - implied_move: float (e.g., 0.05 for 5%)
            - expiry: str
            - put_call_skew: float (relative IV difference)
            - total_gex: float
            - key_resistance: float
            - pcr: float (Put-Call Ratio)
            - volume_signal: str
        """
        implied_move = data.get("implied_move", 0) * 100
        expiry = data.get("expiry", "N/A")
        skew = data.get("put_call_skew", 0)
        gex = data.get("total_gex", 0)
        key_level = data.get("key_resistance", 0)
        pcr = data.get("pcr", 1.0)
        
        # 1. Skew Interpretation
        if skew > 0.02:
            skew_status = "看跌偏斜显著"
            put_cost = "显著偏贵"
        elif skew < -0.02:
            skew_status = "看涨情绪浓厚"
            put_cost = "较便宜"
        else:
            skew_status = "中性"
            put_cost = "定价平衡"

        # 2. GEX Interpretation
        if gex > 0:
            gex_status = "抑制"
            gex_desc = "正 GEX 环境下，做市商对冲行为往往会平抑波动。"
        else:
            gex_status = "放大"
            gex_desc = "负 GEX 环境下，市场波动可能因对冲压力而加剧。"

        # 3. Positioning / Smart Money
        if pcr < 0.7:
            positioning = "看涨情绪主导 (低 PCR)"
        elif pcr > 1.2:
            positioning = "避险或深度看空 (高 PCR)"
        else:
            positioning = "多空博弈均衡"

        # 4. Summary Construction
        summary = f"市场当前预期 {ticker} 在 {expiry} 前有约 {implied_move:.1f}% 的波动空间。{skew_status}反映了资金对回撤的保护意愿较{put_cost.replace('较', '')}。结合 GEX 表现，${key_level} 是关键的波动转折点。"

        narrative_cn = (
            f"根据 {ticker} 的最新期权数据：\n"
            f"- 市场预期波动: 到 {expiry} 预计波动幅度为 ±{implied_move:.1f}%\n"
            f"- 偏斜特征: {skew_status} (认沽期权相对认购期权{put_cost})\n"
            f"- 伽马风险 (GEX): 在 ${key_level} 附近可能{gex_status}波动\n"
            f"- 资金流向: 大单主要在押注 {positioning}\n"
            f"- 核心总结: {summary}"
        )

        return {
            "ticker": ticker,
            "metrics": {
                "implied_move_pct": implied_move,
                "skew_status": skew_status,
                "gex_effect": gex_status,
                "pcr_signal": positioning
            },
            "narrative_cn": narrative_cn
        }

# Example usage/singleton
market_narrative_service = MarketNarrativeService()
