from typing import List, Dict, Any, Optional
import math

class StrategySelector:
    """
    Senior Options Strategy Selection Engine.
    Logic: 安全垫厚 + 利润最大化 (Safe Margin + Profit Maximization).
    """

    STRATEGY_POOL = [
        {"id": "CSP", "name": "Cash-Secured Put", "name_cn": "现金担保Put", "side": "sell"},
        {"id": "CC", "name": "Covered Call", "name_cn": "备兑Call", "side": "sell"},
        {"id": "Bull_Put_Spread", "name": "Bull Put Spread", "name_cn": "牛市Put价差", "side": "sell"},
        {"id": "IC", "name": "Iron Condor", "name_cn": "铁鹰价差", "side": "sell"},
        {"id": "Iron_Butterfly", "name": "Iron Butterfly", "name_cn": "铁蝶价差", "side": "sell"},
        {"id": "Jade_Lizard", "name": "Jade Lizard", "name_cn": "翡翠蜥蜴", "side": "sell"},
        {"id": "Strangle_Sell", "name": "Strangle Sell", "name_cn": "卖出宽跨式", "side": "sell", "risk": "HIGH"},
        {"id": "LEAP_Call", "name": "LEAP Call", "name_cn": "长期看涨期权", "side": "buy"},
        {"id": "Long_Straddle", "name": "Long Straddle", "name_cn": "买入跨式", "side": "buy"},
        {"id": "Long_Strangle", "name": "Long Strangle", "name_cn": "买入宽跨式", "side": "buy"},
        {"id": "Debit_Call_Spread", "name": "Debit Call Spread", "name_cn": "牛市Call价差", "side": "buy"},
        {"id": "Calendar_Spread", "name": "Calendar Spread", "name_cn": "日历价差", "side": "neutral"},
        {"id": "Diagonal_Spread", "name": "Diagonal Spread", "name_cn": "对角价差", "side": "neutral"},
    ]

    def select_strategies(self, 
                          ticker: str,
                          iv_rank: float, 
                          skew: float, 
                          net_gex: float, 
                          trend_pct: float, 
                          days_to_earnings: int) -> List[Dict[str, Any]]:
        
        candidates = []
        
        # 1. Primary Signal: IV Rank
        if iv_rank > 70:
            primary = ["CSP", "IC", "Iron_Butterfly", "Bull_Put_Spread", "Jade_Lizard"]
            secondary = ["CC", "Strangle_Sell"]
        elif iv_rank > 40:
            primary = ["Bull_Put_Spread", "IC", "Calendar_Spread", "CSP"]
            secondary = ["Debit_Call_Spread", "LEAP_Call"]
        else:
            primary = ["LEAP_Call", "Long_Straddle", "Long_Strangle", "Debit_Call_Spread"]
            secondary = ["Calendar_Spread", "Diagonal_Spread"]

        # Combined candidate pool
        pool_ids = list(set(primary + secondary))
        
        results = []
        for strat_id in pool_ids:
            score_data = self.score_strategy(strat_id, iv_rank, skew, net_gex, trend_pct, days_to_earnings)
            
            # Fetch base info
            base_info = next(s for s in self.STRATEGY_POOL if s["id"] == strat_id)
            
            res = {
                "strategy": base_info["name"],
                "strategy_cn": base_info["name_cn"],
                "score": score_data["score"],
                "reasons": score_data["reasons"],
                "signal_badge": self.get_signal_label(score_data["score"]),
                "why_now": self.generate_why_now(strat_id, iv_rank, skew, net_gex, score_data["score"]),
                "suggested_structure": self.get_mock_structure(strat_id, ticker),
                "max_profit": 480, # Mock
                "max_loss": 520,   # Mock
                "prob_profit": 0.72, # Mock
                "annualized_return": 38.5, # Mock
                "safety_margin": "strikes at 1.5x implied move",
                "risks": score_data["reasons"] + (["单边突破风险"] if base_info["side"] == "sell" else ["权利金归零风险"]),
                "gex_note": self.generate_gex_note(net_gex),
                "skew_note": self.generate_skew_note(skew),
            }
            results.append(res)

        # Sort by score
        results.sort(key=lambda x: x["score"], reverse=True)
        
        # Add rank and highlight
        for i, res in enumerate(results):
            res["rank"] = i + 1
            res["highlight"] = i < 3
            
        return results

    def score_strategy(self, strategy: str, iv_rank: float, skew: float, gex: float, trend_pct: float, days_to_earnings: int) -> Dict[str, Any]:
        score = 0
        reasons = []

        # Component 1: IV environment fit (40 points)
        iv_fit = self.compute_iv_fit(strategy, iv_rank)
        score += iv_fit * 0.40

        # Component 2: Skew alignment (20 points)
        skew_fit = self.compute_skew_fit(strategy, skew)
        score += skew_fit * 0.20

        # Component 3: GEX environment (15 points)
        gex_fit = self.compute_gex_fit(strategy, gex)
        score += gex_fit * 0.15

        # Component 4: Safety margin (15 points)
        safety = self.compute_safety_margin(strategy, iv_rank, days_to_earnings)
        score += safety * 0.15

        # Component 5: Trend alignment (10 points)
        trend_fit = self.compute_trend_fit(strategy, trend_pct)
        score += trend_fit * 0.10

        # Penalties
        if days_to_earnings < 14:
            score *= 0.5
            reasons.append(f"⚠️ 财报风险：距离财报仅 {days_to_earnings} 天，IV 风险极高")
        
        if strategy == "Strangle_Sell" and iv_rank < 60:
            score = min(score, 30)
            reasons.append("⚠️ 裸卖风险：IV Rank 未达极端高位，不建议做空波动率")

        return {"score": int(score), "reasons": reasons}

    def compute_iv_fit(self, strategy: str, iv_rank: float) -> float:
        sell_side = ["CSP", "CC", "Bull_Put_Spread", "IC", "Iron_Butterfly", "Jade_Lizard", "Strangle_Sell"]
        buy_side = ["LEAP_Call", "Long_Straddle", "Long_Strangle", "Debit_Call_Spread"]
        neutral = ["Calendar_Spread", "Diagonal_Spread"]

        if iv_rank > 70:
            if strategy in sell_side: return 100
            if strategy in neutral: return 60
            return 20
        elif iv_rank > 40:
            if strategy in sell_side: return 80
            if strategy in neutral: return 100
            if strategy in buy_side: return 50
            return 40
        else:
            if strategy in buy_side: return 100
            if strategy in neutral: return 70
            return 10

    def compute_skew_fit(self, strategy: str, skew: float) -> float:
        if skew > 5: # Put Expensive
            boost = ["CSP", "Bull_Put_Spread", "IC"]
            if strategy in boost: return 100
            if "Straddle" in strategy or "Strangle" in strategy: return 40
            return 60
        elif skew < -3: # Call Expensive
            boost = ["Jade_Lizard", "LEAP_Call", "Debit_Call_Spread"]
            if strategy in boost: return 100
            if strategy == "CC": return 30 # Call too expensive to sell? Actually CC sells calls. 
                                          # Logic in prompt says penalize CC if skew < -3 (Calls expensive = market expects upside).
            return 60
        return 80 # Neutral skew fits most

    def compute_gex_fit(self, strategy: str, gex: float) -> float:
        if gex < 0: # Vol Amplified
            if strategy in ["Long_Straddle", "Long_Strangle", "Debit_Call_Spread"]: return 100
            if strategy in ["IC", "Iron_Butterfly"]: return 40 # Dangerous to sell in neg GEX
            return 70
        else: # Vol Dampened
            if strategy in ["IC", "Iron_Butterfly", "Calendar_Spread"]: return 100
            return 70

    def compute_safety_margin(self, strategy: str, iv_rank: float, days_to_earnings: int) -> float:
        # Simplistic safety score
        if days_to_earnings < 7: return 10
        if iv_rank > 80: return 90
        return 70

    def compute_trend_fit(self, strategy: str, trend_pct: float) -> float:
        if trend_pct > 10: # Extended
            if strategy in ["Bull_Put_Spread", "Debit_Call_Spread"]: return 60
            if strategy in ["IC", "Jade_Lizard"]: return 100
            return 80
        elif trend_pct < -5: # Downtrend
            if strategy in ["CSP", "CC"]: return 40
            if strategy in ["Debit_Call_Spread", "Bull_Put_Spread"]: return 100
            return 70
        return 90

    def get_signal_label(self, score: int) -> str:
        if score > 85: return "🔥 强烈推荐"
        if score > 70: return "✅ 建议关注"
        if score > 50: return "⚖️ 中性持有"
        return "⚠️ 谨慎避开"

    def generate_why_now(self, strategy: str, iv_rank: float, skew: float, net_gex: float, score: int) -> str:
        # Dynamic why now strings in Chinese
        base = f"IV Rank {iv_rank:.0f} "
        if iv_rank > 70:
            iv_part = "处于极高位，空波动率收益丰厚。"
        elif iv_rank < 30:
            iv_part = "处于低位，权利金便宜，适合买入。"
        else:
            iv_part = "处于中性区间。"

        gex_part = "正GEX环境压制波动，有利于收割时间价值。" if net_gex > 0 else "负GEX环境波动放大，需注意安全边际。"
        
        return f"{base}{iv_part} {gex_part}"

    def generate_gex_note(self, net_gex: float) -> str:
        if net_gex < 0:
            return "负GEX环境：市场波动被放大，卖方需要更宽的安全边际（Delta < 0.20）"
        return "正GEX环境：做市商压制波动，适合Iron Condor和日历价差"

    def generate_skew_note(self, skew: float) -> str:
        if skew > 5:
            return "Put skew偏高，卖Put溢价更丰厚"
        if skew < -3:
            return "Call skew偏高，看涨预期强烈或对冲需求大"
        return "Skew水平中性，期权定价相对均衡"

    def get_mock_structure(self, strategy: str, ticker: str) -> Dict[str, Any]:
        # Placeholder for complex strike selection logic
        return {
            "sell_call": {"strike": 580, "expiry": "2025-08-16", "delta": 0.15},
            "buy_call": {"strike": 590, "expiry": "2025-08-16", "delta": 0.08},
            "sell_put": {"strike": 520, "expiry": "2025-08-16", "delta": -0.15},
            "buy_put": {"strike": 510, "expiry": "2025-08-16", "delta": -0.08},
        }
