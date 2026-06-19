from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from ..mock.picks import get_mock_picks
from ..core.validation import normalize_ticker, parse_ticker_list
WATCHLIST = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "META", "MSFT"]
DEFAULT_TICKERS = ["NVDA", "SPY", "AAPL", "TSLA", "QQQ"]

TECHNICAL_SNAPSHOT: Dict[str, Dict[str, Any]] = {
    "SPY": {"price": 542.1, "bias": "range bullish", "support": 536, "resistance": 548, "ivRank": 41},
    "QQQ": {"price": 468.4, "bias": "momentum bullish", "support": 461, "resistance": 476, "ivRank": 38},
    "NVDA": {"price": 124.7, "bias": "high beta pullback", "support": 118, "resistance": 132, "ivRank": 62},
    "TSLA": {"price": 181.3, "bias": "volatile range", "support": 170, "resistance": 196, "ivRank": 74},
    "AAPL": {"price": 211.8, "bias": "defensive bullish", "support": 205, "resistance": 218, "ivRank": 33},
    "META": {"price": 498.6, "bias": "trend bullish", "support": 482, "resistance": 515, "ivRank": 45},
    "MSFT": {"price": 426.9, "bias": "quality range", "support": 418, "resistance": 438, "ivRank": 36},
}


def _week_range() -> Dict[str, str]:
    today = date.today()
    start = today - timedelta(days=today.weekday())
    return {"start": start.isoformat(), "end": (start + timedelta(days=6)).isoformat()}


def _complete_mock_cards() -> List[Dict[str, Any]]:
    return [
        {
            "id": "NVDA-sell-put-118", "tag": "核心", "ticker": "NVDA", "strategyType": "sell_put", "strategyName": "Cash-Secured Put", "score": 9, "direction": "up",
            "legs": [{"action": "Sell", "quantity": 1, "strike": 118, "optionType": "P", "expiry": "2026-01-16"}],
            "entry": "NVDA 回踩 120-122 后企稳，卖出 118P，限价 ≥ 4.80；若 IV Rank 仍 > 55 优先成交。", "scenarioTip": "适合愿意在支撑位接货 NVDA 的账户；不要在财报前 10 天新增。",
            "target": "权利金衰减 55%-70% 或 NVDA 上破 132 后止盈。", "stop": "正股有效跌破 116 或期权价格扩大至入场价 2.1x。", "maxRisk": "$11,320 / contract（现金担保，未计滑点）", "expectedReturn": "4.2%-5.1% 权利金，约 22%-28% 年化", "holdingPeriod": "28-42 天",
            "signalText": "IV Rank 62、Put skew 偏贵、118 附近历史成交密集，卖方溢价/安全垫组合最佳。", "riskText": "半导体板块单日跳空、财报/监管新闻会让 Delta 快速上升。", "capitalText": "现金占用约 $11.3k；组合建议 ≤ 8% 净值。",
            "scoreDimensions": {"ivRank": 9, "otm": 8, "riskReward": 9, "liquidity": 9}, "greeks": {"delta": -0.23, "gamma": 0.018, "theta": 0.11, "vega": 0.24, "iv": 0.47}, "capitalRequired": 11320, "returnLow": 4.2, "returnHigh": 5.1,
        },
        {
            "id": "SPY-call-spread-542-552", "tag": "保守", "ticker": "SPY", "strategyType": "call_spread", "strategyName": "Bull Call Spread", "score": 8, "direction": "up",
            "legs": [{"action": "Buy", "quantity": 1, "strike": 542, "optionType": "C", "expiry": "2026-01-16"}, {"action": "Sell", "quantity": 1, "strike": 552, "optionType": "C", "expiry": "2026-01-16"}],
            "entry": "SPY 站上 548 且 30分钟收盘不跌回 VWAP；净借方 ≤ 4.10。", "scenarioTip": "突破确认后再进，避免横盘时 Theta 侵蚀。", "target": "价差达到最大价值 65% 或 SPY 触及 555。", "stop": "SPY 跌回 536 支撑下方，或价差亏损 45%。", "maxRisk": "$410 / spread", "expectedReturn": "目标回报 $240-$330，风险回报约 0.6-0.8x", "holdingPeriod": "14-30 天",
            "signalText": "正 GEX 下沿抬高，趋势温和向上；买方用价差控制 Vega 暴露。", "riskText": "宏观数据导致假突破；低 IV 环境下单腿追涨性价比一般。", "capitalText": "每组占用约 $410；可分批 2-3 组。", "scoreDimensions": {"ivRank": 7, "otm": 8, "riskReward": 8, "liquidity": 10}, "greeks": {"delta": 0.31, "gamma": 0.011, "theta": -0.05, "vega": 0.12, "iv": 0.18}, "capitalRequired": 410, "returnLow": 58, "returnHigh": 80,
        },
        {
            "id": "TSLA-iron-condor-165-205", "tag": "激进", "ticker": "TSLA", "strategyType": "iron_condor", "strategyName": "Iron Condor", "score": 8, "direction": "flat",
            "legs": [{"action": "Sell", "quantity": 1, "strike": 165, "optionType": "P", "expiry": "2026-01-16"}, {"action": "Buy", "quantity": 1, "strike": 155, "optionType": "P", "expiry": "2026-01-16"}, {"action": "Sell", "quantity": 1, "strike": 205, "optionType": "C", "expiry": "2026-01-16"}, {"action": "Buy", "quantity": 1, "strike": 215, "optionType": "C", "expiry": "2026-01-16"}],
            "entry": "TSLA IV Rank > 70 且现价维持 172-194 区间；收取权利金 ≥ 3.20。", "scenarioTip": "只在事件后 IV 仍高但价格回到区间中部时开仓。", "target": "权利金回吐至 1.45 以下或剩余 21 DTE 时收仓。", "stop": "任一短腿 Delta > 0.35，或组合亏损达到收取权利金 1.8x。", "maxRisk": "$680 / condor", "expectedReturn": "权利金 $300-$340，约 44%-50% 风险回报", "holdingPeriod": "21-35 天",
            "signalText": "高 IV、宽幅震荡、正股远离两侧短腿；时间价值收割窗口打开。", "riskText": "TSLA 新闻跳空风险极高，不适合满仓或裸卖替代。", "capitalText": "每组保证金约 $680；单标的风险 ≤ 3% 净值。", "scoreDimensions": {"ivRank": 10, "otm": 7, "riskReward": 8, "liquidity": 8}, "greeks": {"delta": -0.04, "gamma": -0.006, "theta": 0.18, "vega": -0.31, "iv": 0.61}, "capitalRequired": 680, "returnLow": 44, "returnHigh": 50,
        },
        {
            "id": "AAPL-sell-put-205", "tag": "保守", "ticker": "AAPL", "strategyType": "sell_put", "strategyName": "Cash-Secured Put", "score": 8, "direction": "up",
            "legs": [{"action": "Sell", "quantity": 1, "strike": 205, "optionType": "P", "expiry": "2026-01-16"}], "entry": "AAPL 不跌破 205 支撑，卖 205P，限价 ≥ 2.25；价差需 < 4%。", "scenarioTip": "偏防守型权利金策略，适合降低组合波动。", "target": "收取权利金 60% 后止盈。", "stop": "AAPL 跌破 202 且放量，或期权亏损 90%。", "maxRisk": "$20,275 / contract（现金担保）", "expectedReturn": "1.0%-1.2% 权利金，约 10%-13% 年化", "holdingPeriod": "30-45 天", "signalText": "低波动大盘股，支撑清晰；Put 溢价虽然不高但胜率稳定。", "riskText": "消费电子需求下修会压缩估值，收益空间有限。", "capitalText": "现金占用约 $20.3k；可用 put spread 降低占用。", "scoreDimensions": {"ivRank": 6, "otm": 9, "riskReward": 7, "liquidity": 10}, "greeks": {"delta": -0.19, "gamma": 0.014, "theta": 0.05, "vega": 0.16, "iv": 0.24}, "capitalRequired": 20275, "returnLow": 1.0, "returnHigh": 1.2,
        },
        {
            "id": "META-call-spread-500-525", "tag": "核心", "ticker": "META", "strategyType": "call_spread", "strategyName": "Bull Call Spread", "score": 9, "direction": "up",
            "legs": [{"action": "Buy", "quantity": 1, "strike": 500, "optionType": "C", "expiry": "2026-01-16"}, {"action": "Sell", "quantity": 1, "strike": 525, "optionType": "C", "expiry": "2026-01-16"}], "entry": "META 放量突破 515 或回踩 498 后收复；净借方 ≤ 9.20。", "scenarioTip": "趋势股用价差替代裸买 Call，降低 IV 回落风险。", "target": "价差价值达到 16-18 或 META 触及 530。", "stop": "跌破 482 周线支撑，或组合亏损 45%。", "maxRisk": "$920 / spread", "expectedReturn": "目标回报 $680-$880，约 74%-96%", "holdingPeriod": "21-45 天", "signalText": "趋势强、上方阻力明确，价差宽度给足凸性同时控制成本。", "riskText": "广告/AI资本开支新闻可能触发估值重定价。", "capitalText": "每组占用约 $920；突破失败不加仓。", "scoreDimensions": {"ivRank": 7, "otm": 8, "riskReward": 9, "liquidity": 9}, "greeks": {"delta": 0.37, "gamma": 0.009, "theta": -0.08, "vega": 0.18, "iv": 0.31}, "capitalRequired": 920, "returnLow": 74, "returnHigh": 96,
        },
    ]


def _from_scored_contract(ticker: str, contract: Dict[str, Any], source_strategy: str) -> Dict[str, Any]:
    strategy_type = "iron_condor" if source_strategy == "iron_condor" else "call_spread" if "spread" in source_strategy else "sell_put"
    score = max(1, min(10, round(float(contract.get("score") or 0) / 10)))
    strike = contract.get("strike") or 0
    expiry = contract.get("expiry") or "2026-01-16"
    premium = float(contract.get("bid") or contract.get("mid") or 0)
    max_loss = contract.get("max_loss") or 0
    annualized = contract.get("annualized_return") or 0
    safety = contract.get("safety_cushion") or 0
    leg2 = contract.get("leg2_strike") or 0

    if strategy_type == "iron_condor":
        legs = [{"action": "Sell", "quantity": 1, "strike": strike, "optionType": "P", "expiry": expiry}, {"action": "Sell", "quantity": 1, "strike": leg2, "optionType": "C", "expiry": expiry}]
    elif strategy_type == "call_spread":
        opt = str(contract.get("option_type") or "CALL")[:1]
        legs = [{"action": "Buy", "quantity": 1, "strike": strike, "optionType": opt, "expiry": expiry}, {"action": "Sell", "quantity": 1, "strike": leg2, "optionType": str(contract.get("leg2_type") or opt)[:1], "expiry": expiry}]
    else:
        legs = [{"action": "Sell", "quantity": 1, "strike": strike, "optionType": "P", "expiry": expiry}]

    return {
        "id": f"{ticker}-{source_strategy}-{contract.get('symbol', strike)}", "tag": "核心" if score >= 9 else "保守" if strategy_type == "sell_put" else "激进" if strategy_type == "iron_condor" else "核心", "ticker": ticker,
        "strategyType": strategy_type, "strategyName": contract.get("strategy_cn") or source_strategy.replace("_", " ").title(), "score": score, "direction": "flat" if strategy_type == "iron_condor" else "up", "legs": legs,
        "entry": f"实时期权链评分入选，参考权利金 {premium:.2f}，安全垫 {safety}%；使用限价单成交。", "scenarioTip": "由 strategy_scorer 生成；成交前复核事件日历和 bid/ask。",
        "target": f"达到最大利润 50%-70% 止盈；估算最大利润 ${contract.get('max_profit') or 0}。", "stop": f"触及 breakeven {contract.get('breakeven') or '-'} 或亏损达到计划阈值。", "maxRisk": f"${max_loss:,.0f}" if max_loss else "按组合保证金计算", "expectedReturn": f"年化 {annualized}%" if annualized else "按成交价估算", "holdingPeriod": "7-45 天",
        "signalText": "真实期权链评分：" + " / ".join(f"{k} {v}" for k, v in (contract.get("score_breakdown") or {}).items()), "riskText": "；".join(contract.get("risk_notes") or []) or "流动性、跳空和波动率回落风险。", "capitalText": f"OI {contract.get('oi', 0):,} / Volume {contract.get('volume', 0):,}；按券商保证金为准。",
        "scoreDimensions": {"ivRank": max(4, min(10, round(float(contract.get("iv") or 0.3) * 15))), "otm": max(4, min(10, round(float(safety or 6) / 1.4))), "riskReward": score, "liquidity": max(4, min(10, round((float(contract.get("volume") or 0) / 1000) + 5)))},
        "greeks": {"delta": contract.get("delta") or 0, "gamma": contract.get("gamma") or 0.01, "theta": contract.get("theta") or (0.06 if strategy_type != "call_spread" else -0.05), "vega": contract.get("vega") or 0.18, "iv": contract.get("iv") or 0.3}, "capitalRequired": max_loss or 1000, "returnLow": annualized or 8, "returnHigh": (annualized or 8) * 1.25,
    }


def _live_picks(tickers: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    try:
        from ..services.strategy_scorer import scan_ticker
    except Exception:
        return []

    cards: List[Dict[str, Any]] = []
    for ticker in (tickers or DEFAULT_TICKERS):
        try:
            result = scan_ticker(ticker)
            for strategy_name, contracts in (result.get("candidates") or {}).items():
                for contract in contracts[:2]:
                    cards.append(_from_scored_contract(ticker, contract, strategy_name))
        except Exception:
            continue
    return sorted(cards, key=lambda x: x.get("score", 0), reverse=True)[:8]


def _legacy_to_card(item: Dict[str, Any], idx: int) -> Dict[str, Any]:
    cards = _complete_mock_cards()
    if idx < len(cards):
        card = {**cards[idx]}
        card["ticker"] = str(item.get("ticker", card["ticker"])).upper()
        card["score"] = max(1, min(10, int(item.get("score", card["score"]) or card["score"])))
        return card
    return cards[idx % len(cards)]


def get_picks_response(tickers: Optional[List[str]] = None) -> Dict[str, Any]:
    picks = _live_picks(tickers)
    data_source = "live-strategy-scorer" if picks else "fallback-mock"
    if not picks:
        try:
            legacy = get_mock_picks()
            picks = [_legacy_to_card(item, idx) for idx, item in enumerate(legacy)]
        except Exception:
            picks = _complete_mock_cards()
        if len(picks) < 5:
            picks = _complete_mock_cards()

    high_score_count = sum(1 for pick in picks if int(pick.get("score") or 0) >= 8)
    lows = [float(p.get("returnLow") or 0) for p in picks]
    highs = [float(p.get("returnHigh") or 0) for p in picks]
    return {
        "week": _week_range(),
        "dataSource": data_source,
        "summary": {"totalStrategies": len(picks), "highScoreCount": high_score_count, "expectedReturnRange": {"low": round(min(lows), 1) if lows else 0, "high": round(max(highs), 1) if highs else 0}},
        "scanner": [{"ticker": t, **TECHNICAL_SNAPSHOT[t]} for t in WATCHLIST],
        "picks": picks,
    }



def parse_tickers(tickers: Optional[str]) -> Optional[List[str]]:
    """Normalize a comma-separated ticker query param for service calls."""

    return parse_ticker_list(tickers)


async def get_cached_picks_response(tickers: Optional[str] = None) -> Dict[str, Any]:
    """Return picks response with cache fallback isolated from router code."""

    ticker_list = parse_tickers(tickers)
    try:
        from ..core.cache import get_cached, set_cached

        cache_key = f"picks:response:{','.join(ticker_list) if ticker_list else 'default'}"
        cached = await get_cached(cache_key)
        if cached is not None:
            return cached
        result = get_picks_response(ticker_list)
        await set_cached(cache_key, result, 300)
        return result
    except Exception:
        return get_picks_response(ticker_list)


def scan_single_ticker_result(ticker: str) -> Dict[str, Any]:
    """Run live strategy scan for one ticker, falling back to picks payload on error."""

    normalized = normalize_ticker(ticker)
    try:
        from ..services.strategy_scorer import scan_ticker

        return scan_ticker(normalized)
    except Exception as exc:
        return {"ticker": normalized, "error": str(exc), "fallback": get_picks_response([normalized])}
