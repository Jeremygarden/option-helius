"""
Strategy scoring engine — scores option contracts/combos for each applicable strategy.
Returns top 3 per strategy.

Uses yfinance option chain data + BSM delta calculation.
"""
import numpy as np
from scipy.stats import norm
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
import yfinance as yf


@dataclass
class ScoredContract:
    rank: int
    strategy: str
    strategy_cn: str
    score: float              # 0-100
    score_breakdown: dict     # Component scores
    symbol: str
    expiry: str
    strike: float
    option_type: str          # "CALL" / "PUT"
    bid: float
    ask: float
    mid: float
    spread_pct: float
    volume: int
    oi: int
    iv: float
    delta: float
    annualized_return: Optional[float] = None
    safety_cushion: Optional[float] = None
    max_profit: Optional[float] = None
    max_loss: Optional[float] = None
    breakeven: Optional[float] = None
    prob_profit: Optional[float] = None
    leg2_strike: Optional[float] = None
    leg2_bid: Optional[float] = None
    leg2_ask: Optional[float] = None
    leg2_type: Optional[str] = None
    leg2_symbol: Optional[str] = None
    risk_notes: List[str] = field(default_factory=list)


def bsm_delta(S: float, K: float, T: float, r: float, sigma: float, option_type: str) -> float:
    """Calculate BSM delta. T in years."""
    if T <= 0 or sigma <= 0:
        return 0.0
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    if option_type.upper() == "CALL":
        return float(norm.cdf(d1))
    else:
        return float(norm.cdf(d1) - 1)


def get_option_chain(ticker: str) -> Tuple[float, list]:
    """Fetch option chain from yfinance. Returns (current_price, list_of_chain_dicts)."""
    t = yf.Ticker(ticker)
    hist = t.history(period="5d")
    if hist.empty:
        return 0, []

    current_price = float(hist['Close'].iloc[-1])

    try:
        expiries = t.options
    except Exception:
        return current_price, []

    chains = []
    today = datetime.now().date()

    for exp_str in expiries[:6]:
        exp_date = datetime.strptime(exp_str, "%Y-%m-%d").date()
        dte = (exp_date - today).days

        if dte < 7 or dte > 45:
            continue

        try:
            chain = t.option_chain(exp_str)
            chains.append({
                "expiry": exp_str,
                "dte": dte,
                "calls": chain.calls,
                "puts": chain.puts
            })
        except Exception:
            continue

    return current_price, chains


def prefilter_contracts(df, current_price: float, min_volume: int = 50, min_oi: int = 300, max_spread_pct: float = 8.0):
    """Apply quality filters to option chain dataframe."""
    if df.empty:
        return df

    filtered = df.copy()

    if 'volume' in filtered.columns:
        filtered = filtered[filtered['volume'] >= min_volume]

    if 'openInterest' in filtered.columns:
        filtered = filtered[filtered['openInterest'] >= min_oi]

    if 'bid' in filtered.columns and 'ask' in filtered.columns:
        filtered = filtered[filtered['bid'] > 0]
        if not filtered.empty:
            mid = (filtered['bid'] + filtered['ask']) / 2
            spread_pct = (filtered['ask'] - filtered['bid']) / mid * 100
            filtered = filtered[spread_pct <= max_spread_pct]

    return filtered


def score_sell_put(current_price: float, chains: list, r: float = 0.05) -> List[ScoredContract]:
    """Sell Put scoring."""
    candidates = []

    for chain_data in chains:
        puts = prefilter_contracts(chain_data['puts'], current_price)
        if puts.empty:
            continue

        dte = chain_data['dte']
        T = dte / 365.0
        expiry = chain_data['expiry']

        otm_puts = puts[puts['strike'] < current_price * 0.99]

        for _, row in otm_puts.iterrows():
            strike = row['strike']
            bid = row.get('bid', 0)
            ask = row.get('ask', 0)
            mid = (bid + ask) / 2
            iv = row.get('impliedVolatility', 0.30) or 0.30
            vol = int(row.get('volume', 0) or 0)
            oi = int(row.get('openInterest', 0) or 0)

            if bid <= 0 or mid <= 0:
                continue

            delta = abs(bsm_delta(current_price, strike, T, r, iv, "PUT"))
            if delta < 0.08 or delta > 0.40:
                continue

            annualized = (bid / strike) * (365 / dte) * 100
            safety_cushion = (current_price - strike) / current_price * 100
            spread_pct = (ask - bid) / mid * 100
            premium_eff = bid / current_price * 100

            ann_score = float(np.clip(annualized / 50 * 100, 0, 100))
            cushion_score = float(np.clip(safety_cushion / 15 * 100, 0, 100))
            delta_spread_score = float(np.clip((1 - delta/0.35) * 60 + (1 - spread_pct/8) * 40, 0, 100))
            premium_score = float(np.clip(premium_eff / 2 * 100, 0, 100))
            time_score = float(np.clip((45 - dte) / 38 * 100, 0, 100))

            total = (
                0.40 * ann_score +
                0.25 * cushion_score +
                0.15 * delta_spread_score +
                0.10 * premium_score +
                0.10 * time_score
            )

            if safety_cushion < 5:
                total -= 20
            if iv > 0.80:
                total -= 10

            total = max(0, min(100, total))

            risk_notes = []
            if safety_cushion < 8:
                risk_notes.append(f"安全垫偏薄({safety_cushion:.1f}%)")
            if delta > 0.30:
                risk_notes.append(f"Delta偏高({delta:.2f})，被行权概率较大")

            candidates.append(ScoredContract(
                rank=0, strategy="sell_put", strategy_cn="卖出看跌",
                score=round(total, 1),
                score_breakdown={
                    "年化收益": round(ann_score, 1), "安全垫": round(cushion_score, 1),
                    "Delta+滑点": round(delta_spread_score, 1),
                    "权利金效率": round(premium_score, 1), "时间价值": round(time_score, 1),
                },
                symbol=row.get('contractSymbol', f"{expiry}P{strike}"),
                expiry=expiry, strike=strike, option_type="PUT",
                bid=bid, ask=ask, mid=round(mid, 2), spread_pct=round(spread_pct, 2),
                volume=vol, oi=oi, iv=round(iv, 4), delta=round(-delta, 3),
                annualized_return=round(annualized, 1),
                safety_cushion=round(safety_cushion, 2),
                max_profit=round(bid * 100, 2),
                max_loss=round((strike - bid) * 100, 2),
                breakeven=round(strike - bid, 2),
                risk_notes=risk_notes,
            ))

    candidates.sort(key=lambda x: x.score, reverse=True)
    for i, c in enumerate(candidates[:3]):
        c.rank = i + 1
    return candidates[:3]


def score_covered_call(current_price: float, chains: list, r: float = 0.05) -> List[ScoredContract]:
    """Covered Call scoring."""
    candidates = []

    for chain_data in chains:
        calls = prefilter_contracts(chain_data['calls'], current_price)
        if calls.empty:
            continue

        dte = chain_data['dte']
        T = dte / 365.0
        expiry = chain_data['expiry']

        otm_calls = calls[calls['strike'] > current_price * 1.01]

        for _, row in otm_calls.iterrows():
            strike = row['strike']
            bid = row.get('bid', 0)
            ask = row.get('ask', 0)
            mid = (bid + ask) / 2
            iv = row.get('impliedVolatility', 0.30) or 0.30
            vol = int(row.get('volume', 0) or 0)
            oi = int(row.get('openInterest', 0) or 0)

            if bid <= 0 or mid <= 0:
                continue

            delta = bsm_delta(current_price, strike, T, r, iv, "CALL")
            if delta < 0.10 or delta > 0.40:
                continue

            annualized = (bid / strike) * (365 / dte) * 100
            safety_cushion = (strike - current_price) / current_price * 100
            spread_pct = (ask - bid) / mid * 100
            premium_eff = bid / current_price * 100

            ann_score = float(np.clip(annualized / 40 * 100, 0, 100))
            cushion_score = float(np.clip(safety_cushion / 12 * 100, 0, 100))
            delta_spread_score = float(np.clip((1 - delta/0.40) * 60 + (1 - spread_pct/8) * 40, 0, 100))
            premium_score = float(np.clip(premium_eff / 1.5 * 100, 0, 100))
            time_score = float(np.clip((45 - dte) / 38 * 100, 0, 100))

            total = (
                0.40 * ann_score + 0.25 * cushion_score +
                0.15 * delta_spread_score + 0.10 * premium_score + 0.10 * time_score
            )

            if safety_cushion < 3:
                total -= 25
            total = max(0, min(100, total))

            risk_notes = []
            if safety_cushion < 5:
                risk_notes.append(f"距行权价仅{safety_cushion:.1f}%，被行权概率高")

            candidates.append(ScoredContract(
                rank=0, strategy="covered_call", strategy_cn="备兑卖Call",
                score=round(total, 1),
                score_breakdown={
                    "年化收益": round(ann_score, 1), "安全垫": round(cushion_score, 1),
                    "Delta+滑点": round(delta_spread_score, 1),
                    "权利金效率": round(premium_score, 1), "时间价值": round(time_score, 1),
                },
                symbol=row.get('contractSymbol', f"{expiry}C{strike}"),
                expiry=expiry, strike=strike, option_type="CALL",
                bid=bid, ask=ask, mid=round(mid, 2), spread_pct=round(spread_pct, 2),
                volume=vol, oi=oi, iv=round(iv, 4), delta=round(delta, 3),
                annualized_return=round(annualized, 1),
                safety_cushion=round(safety_cushion, 2),
                max_profit=round(bid * 100, 2),
                max_loss=None,
                breakeven=round(current_price - bid, 2),
                risk_notes=risk_notes,
            ))

    candidates.sort(key=lambda x: x.score, reverse=True)
    for i, c in enumerate(candidates[:3]):
        c.rank = i + 1
    return candidates[:3]


def score_bull_call_spread(current_price: float, chains: list, r: float = 0.05) -> List[ScoredContract]:
    """Bull Call Spread scoring."""
    candidates = []
    direction_score_normalized = 70

    for chain_data in chains:
        calls = prefilter_contracts(chain_data['calls'], current_price, min_volume=30, min_oi=200)
        if calls.empty or len(calls) < 3:
            continue

        dte = chain_data['dte']
        T = dte / 365.0
        expiry = chain_data['expiry']

        for _, buy_row in calls.iterrows():
            buy_strike = buy_row['strike']
            buy_ask = buy_row.get('ask', 0)
            buy_iv = buy_row.get('impliedVolatility', 0.30) or 0.30
            if buy_ask <= 0:
                continue

            buy_delta = bsm_delta(current_price, buy_strike, T, r, buy_iv, "CALL")
            if buy_delta < 0.35 or buy_delta > 0.60:
                continue

            sell_candidates = calls[calls['strike'] > buy_strike]
            for _, sell_row in sell_candidates.iterrows():
                sell_strike = sell_row['strike']
                sell_bid = sell_row.get('bid', 0)
                sell_iv = sell_row.get('impliedVolatility', 0.30) or 0.30
                if sell_bid <= 0:
                    continue

                sell_delta = bsm_delta(current_price, sell_strike, T, r, sell_iv, "CALL")
                if sell_delta < 0.10 or sell_delta > 0.35:
                    continue

                spread_width = sell_strike - buy_strike
                if spread_width <= 0:
                    continue
                net_debit = buy_ask - sell_bid
                if net_debit <= 0:
                    continue

                max_profit = spread_width - net_debit
                risk_reward = max_profit / net_debit
                bep = buy_strike + net_debit
                bep_margin = (bep - current_price) / current_price * 100
                debit_ratio = net_debit / spread_width * 100

                rr_score = float(np.clip(risk_reward / 3 * 100, 0, 100))
                bep_score = float(np.clip((8 - bep_margin) / 8 * 100, 0, 100))
                debit_score = float(np.clip((60 - debit_ratio) / 40 * 100, 0, 100))
                liq_score = float(np.clip(
                    min(int(buy_row.get('volume', 0) or 0), int(sell_row.get('volume', 0) or 0)) / 500 * 100, 0, 100
                ))

                total = (
                    0.35 * rr_score + 0.25 * direction_score_normalized +
                    0.20 * bep_score + 0.10 * debit_score + 0.10 * liq_score
                )
                if bep_margin > 8:
                    total -= 15
                total = max(0, min(100, total))
                if total < 30:
                    continue

                candidates.append(ScoredContract(
                    rank=0, strategy="bull_call_spread", strategy_cn="牛市Call价差",
                    score=round(total, 1),
                    score_breakdown={
                        "盈亏比": round(rr_score, 1), "方向置信": round(direction_score_normalized, 1),
                        "BEP边距": round(bep_score, 1), "成本效率": round(debit_score, 1),
                        "流动性": round(liq_score, 1),
                    },
                    symbol=buy_row.get('contractSymbol', f"{expiry}C{buy_strike}"),
                    expiry=expiry, strike=buy_strike, option_type="CALL",
                    bid=buy_row.get('bid', 0), ask=buy_ask,
                    mid=round((buy_row.get('bid', 0) + buy_ask) / 2, 2),
                    spread_pct=round(net_debit / spread_width * 100, 2),
                    volume=int(buy_row.get('volume', 0) or 0),
                    oi=int(buy_row.get('openInterest', 0) or 0),
                    iv=round(buy_iv, 4), delta=round(buy_delta, 3),
                    annualized_return=round(risk_reward * (365/dte) * 100, 1),
                    safety_cushion=round(bep_margin, 2),
                    max_profit=round(max_profit * 100, 2),
                    max_loss=round(net_debit * 100, 2),
                    breakeven=round(bep, 2),
                    leg2_strike=sell_strike, leg2_bid=sell_bid,
                    leg2_ask=sell_row.get('ask', 0), leg2_type="CALL",
                    leg2_symbol=sell_row.get('contractSymbol', f"{expiry}C{sell_strike}"),
                    risk_notes=[f"盈亏比 {risk_reward:.1f}:1", f"BEP距现价 {bep_margin:.1f}%"],
                ))

    candidates.sort(key=lambda x: x.score, reverse=True)
    for i, c in enumerate(candidates[:3]):
        c.rank = i + 1
    return candidates[:3]


def score_bear_put_spread(current_price: float, chains: list, r: float = 0.05) -> List[ScoredContract]:
    """Bear Put Spread scoring."""
    candidates = []
    direction_score_comp = 70

    for chain_data in chains:
        puts = prefilter_contracts(chain_data['puts'], current_price, min_volume=30, min_oi=200)
        if puts.empty or len(puts) < 3:
            continue

        dte = chain_data['dte']
        T = dte / 365.0
        expiry = chain_data['expiry']

        for _, buy_row in puts.iterrows():
            buy_strike = buy_row['strike']
            buy_ask = buy_row.get('ask', 0)
            buy_iv = buy_row.get('impliedVolatility', 0.30) or 0.30
            if buy_ask <= 0:
                continue

            buy_delta = abs(bsm_delta(current_price, buy_strike, T, r, buy_iv, "PUT"))
            if buy_delta < 0.35 or buy_delta > 0.60:
                continue

            sell_candidates = puts[puts['strike'] < buy_strike]
            for _, sell_row in sell_candidates.iterrows():
                sell_strike = sell_row['strike']
                sell_bid = sell_row.get('bid', 0)
                sell_iv = sell_row.get('impliedVolatility', 0.30) or 0.30
                if sell_bid <= 0:
                    continue

                sell_delta = abs(bsm_delta(current_price, sell_strike, T, r, sell_iv, "PUT"))
                if sell_delta < 0.10 or sell_delta > 0.35:
                    continue

                spread_width = buy_strike - sell_strike
                if spread_width <= 0:
                    continue
                net_debit = buy_ask - sell_bid
                if net_debit <= 0:
                    continue

                max_profit = spread_width - net_debit
                risk_reward = max_profit / net_debit
                bep = buy_strike - net_debit
                bep_margin = (current_price - bep) / current_price * 100
                debit_ratio = net_debit / spread_width * 100

                rr_score = float(np.clip(risk_reward / 3 * 100, 0, 100))
                bep_score = float(np.clip((8 - bep_margin) / 8 * 100, 0, 100))
                debit_score = float(np.clip((60 - debit_ratio) / 40 * 100, 0, 100))
                liq_score = float(np.clip(
                    min(int(buy_row.get('volume', 0) or 0), int(sell_row.get('volume', 0) or 0)) / 500 * 100, 0, 100
                ))

                total = (
                    0.35 * rr_score + 0.25 * direction_score_comp +
                    0.20 * bep_score + 0.10 * debit_score + 0.10 * liq_score
                )
                if bep_margin > 8:
                    total -= 15
                total = max(0, min(100, total))
                if total < 30:
                    continue

                candidates.append(ScoredContract(
                    rank=0, strategy="bear_put_spread", strategy_cn="熊市Put价差",
                    score=round(total, 1),
                    score_breakdown={
                        "盈亏比": round(rr_score, 1), "方向置信": round(direction_score_comp, 1),
                        "BEP边距": round(bep_score, 1), "成本效率": round(debit_score, 1),
                        "流动性": round(liq_score, 1),
                    },
                    symbol=buy_row.get('contractSymbol', f"{expiry}P{buy_strike}"),
                    expiry=expiry, strike=buy_strike, option_type="PUT",
                    bid=buy_row.get('bid', 0), ask=buy_ask,
                    mid=round((buy_row.get('bid', 0) + buy_ask) / 2, 2),
                    spread_pct=round(net_debit / spread_width * 100, 2),
                    volume=int(buy_row.get('volume', 0) or 0),
                    oi=int(buy_row.get('openInterest', 0) or 0),
                    iv=round(buy_iv, 4), delta=round(-buy_delta, 3),
                    annualized_return=round(risk_reward * (365/dte) * 100, 1),
                    safety_cushion=round(bep_margin, 2),
                    max_profit=round(max_profit * 100, 2),
                    max_loss=round(net_debit * 100, 2),
                    breakeven=round(bep, 2),
                    leg2_strike=sell_strike, leg2_bid=sell_bid,
                    leg2_ask=sell_row.get('ask', 0), leg2_type="PUT",
                    leg2_symbol=sell_row.get('contractSymbol', f"{expiry}P{sell_strike}"),
                    risk_notes=[f"盈亏比 {risk_reward:.1f}:1", f"BEP距现价 {bep_margin:.1f}%"],
                ))

    candidates.sort(key=lambda x: x.score, reverse=True)
    for i, c in enumerate(candidates[:3]):
        c.rank = i + 1
    return candidates[:3]


def score_iron_condor(current_price: float, chains: list, iv_rank: float = 50, r: float = 0.05) -> List[ScoredContract]:
    """Iron Condor scoring."""
    candidates = []

    for chain_data in chains:
        calls = prefilter_contracts(chain_data['calls'], current_price, min_volume=20, min_oi=150)
        puts = prefilter_contracts(chain_data['puts'], current_price, min_volume=20, min_oi=150)
        if calls.empty or puts.empty:
            continue

        dte = chain_data['dte']
        T = dte / 365.0
        expiry = chain_data['expiry']

        short_puts = []
        for _, row in puts.iterrows():
            if row['strike'] >= current_price:
                continue
            iv = row.get('impliedVolatility', 0.3) or 0.3
            delta = abs(bsm_delta(current_price, row['strike'], T, r, iv, "PUT"))
            if 0.12 <= delta <= 0.28:
                short_puts.append((row, delta))

        short_calls = []
        for _, row in calls.iterrows():
            if row['strike'] <= current_price:
                continue
            iv = row.get('impliedVolatility', 0.3) or 0.3
            delta = bsm_delta(current_price, row['strike'], T, r, iv, "CALL")
            if 0.12 <= delta <= 0.28:
                short_calls.append((row, delta))

        for sp_row, sp_delta in short_puts[:3]:
            for sc_row, sc_delta in short_calls[:3]:
                sp_strike = sp_row['strike']
                sc_strike = sc_row['strike']
                sp_bid = sp_row.get('bid', 0)
                sc_bid = sc_row.get('bid', 0)
                if sp_bid <= 0 or sc_bid <= 0:
                    continue

                wing_width = max(5, round((sc_strike - sp_strike) * 0.15))
                net_credit = sp_bid + sc_bid
                long_wing_cost = net_credit * 0.25
                actual_credit = net_credit - long_wing_cost
                max_risk = wing_width - actual_credit
                if max_risk <= 0:
                    continue

                premium_risk_ratio = actual_credit / max_risk * 100
                put_distance = (current_price - sp_strike) / current_price * 100
                call_distance = (sc_strike - current_price) / current_price * 100
                min_distance = min(put_distance, call_distance)
                win_prob = (1 - sp_delta) * (1 - sc_delta) * 100

                pr_score = float(np.clip(premium_risk_ratio / 40 * 100, 0, 100))
                dist_score = float(np.clip(min_distance / 12 * 100, 0, 100))
                iv_score = float(np.clip(iv_rank / 80 * 100, 0, 100))
                prob_score = float(np.clip((win_prob - 50) / 35 * 100, 0, 100))
                dte_score = 100.0 if 21 <= dte <= 35 else float(np.clip((1 - abs(dte - 28) / 20) * 100, 0, 100))

                total = (
                    0.30 * pr_score + 0.25 * dist_score +
                    0.20 * iv_score + 0.15 * prob_score + 0.10 * dte_score
                )
                if min_distance < 6:
                    total -= 20
                if iv_rank < 30:
                    total -= 15
                total = max(0, min(100, total))
                if total < 25:
                    continue

                candidates.append(ScoredContract(
                    rank=0, strategy="iron_condor", strategy_cn="铁鹰策略",
                    score=round(total, 1),
                    score_breakdown={
                        "收益/风险": round(pr_score, 1), "安全距离": round(dist_score, 1),
                        "IV环境": round(iv_score, 1), "胜率": round(prob_score, 1),
                        "时间": round(dte_score, 1),
                    },
                    symbol=f"IC {sp_strike}/{sc_strike}",
                    expiry=expiry, strike=sp_strike, option_type="IC",
                    bid=round(actual_credit, 2), ask=0, mid=round(actual_credit, 2),
                    spread_pct=round(premium_risk_ratio, 2),
                    volume=min(int(sp_row.get('volume', 0) or 0), int(sc_row.get('volume', 0) or 0)),
                    oi=min(int(sp_row.get('openInterest', 0) or 0), int(sc_row.get('openInterest', 0) or 0)),
                    iv=round(((sp_row.get('impliedVolatility', 0.3) or 0.3) + (sc_row.get('impliedVolatility', 0.3) or 0.3)) / 2, 4),
                    delta=round(sc_delta - sp_delta, 3),
                    annualized_return=round(actual_credit / max_risk * (365/dte) * 100, 1),
                    safety_cushion=round(min_distance, 2),
                    max_profit=round(actual_credit * 100, 2),
                    max_loss=round(max_risk * 100, 2),
                    breakeven=round(sp_strike - actual_credit, 2),
                    prob_profit=round(win_prob, 1),
                    leg2_strike=sc_strike, leg2_type="CALL",
                    risk_notes=[
                        f"Put翼距{put_distance:.1f}%  Call翼距{call_distance:.1f}%",
                        f"估算胜率{win_prob:.0f}%"
                    ],
                ))

    candidates.sort(key=lambda x: x.score, reverse=True)
    for i, c in enumerate(candidates[:3]):
        c.rank = i + 1
    return candidates[:3]


def score_strangle(current_price: float, chains: list, iv_rank: float = 50, r: float = 0.05) -> List[ScoredContract]:
    """Short Strangle scoring."""
    candidates = []

    for chain_data in chains:
        calls = prefilter_contracts(chain_data['calls'], current_price, min_volume=30, min_oi=200)
        puts = prefilter_contracts(chain_data['puts'], current_price, min_volume=30, min_oi=200)
        if calls.empty or puts.empty:
            continue

        dte = chain_data['dte']
        T = dte / 365.0
        expiry = chain_data['expiry']

        sp_list = []
        for _, row in puts.iterrows():
            if row['strike'] >= current_price:
                continue
            iv = row.get('impliedVolatility', 0.3) or 0.3
            delta = abs(bsm_delta(current_price, row['strike'], T, r, iv, "PUT"))
            if 0.12 <= delta <= 0.30:
                sp_list.append((row, delta))

        sc_list = []
        for _, row in calls.iterrows():
            if row['strike'] <= current_price:
                continue
            iv = row.get('impliedVolatility', 0.3) or 0.3
            delta = bsm_delta(current_price, row['strike'], T, r, iv, "CALL")
            if 0.12 <= delta <= 0.30:
                sc_list.append((row, delta))

        for sp_row, sp_delta in sp_list[:4]:
            for sc_row, sc_delta in sc_list[:4]:
                sp_strike = sp_row['strike']
                sc_strike = sc_row['strike']
                sp_bid = sp_row.get('bid', 0)
                sc_bid = sc_row.get('bid', 0)
                if sp_bid <= 0 or sc_bid <= 0:
                    continue

                net_credit = sp_bid + sc_bid
                put_distance = (current_price - sp_strike) / current_price * 100
                call_distance = (sc_strike - current_price) / current_price * 100
                min_distance = min(put_distance, call_distance)
                delta_balance = 1 - abs(sp_delta - sc_delta) / max(sp_delta, sc_delta)
                ann_return = net_credit / current_price * (365/dte) * 100

                ann_score = float(np.clip(ann_return / 60 * 100, 0, 100))
                dist_score = float(np.clip(min_distance / 10 * 100, 0, 100))
                iv_score_val = float(np.clip(iv_rank / 80 * 100, 0, 100))
                balance_score = delta_balance * 100
                liq_score = float(np.clip(
                    min(int(sp_row.get('volume', 0) or 0), int(sc_row.get('volume', 0) or 0)) / 500 * 100, 0, 100
                ))

                total = (
                    0.30 * ann_score + 0.25 * dist_score +
                    0.20 * iv_score_val + 0.15 * balance_score + 0.10 * liq_score
                )
                if max(sp_delta, sc_delta) > 0.35:
                    total -= 20
                if min_distance < 5:
                    total -= 15
                if iv_rank < 30:
                    total -= 15
                total = max(0, min(100, total))
                if total < 25:
                    continue

                candidates.append(ScoredContract(
                    rank=0, strategy="strangle", strategy_cn="宽跨式",
                    score=round(total, 1),
                    score_breakdown={
                        "年化收益": round(ann_score, 1), "安全距离": round(dist_score, 1),
                        "IV环境": round(iv_score_val, 1), "Delta均衡": round(balance_score, 1),
                        "流动性": round(liq_score, 1),
                    },
                    symbol=f"STR {sp_strike}P/{sc_strike}C",
                    expiry=expiry, strike=sp_strike, option_type="STRANGLE",
                    bid=round(net_credit, 2), ask=0, mid=round(net_credit, 2), spread_pct=0,
                    volume=min(int(sp_row.get('volume', 0) or 0), int(sc_row.get('volume', 0) or 0)),
                    oi=min(int(sp_row.get('openInterest', 0) or 0), int(sc_row.get('openInterest', 0) or 0)),
                    iv=round(((sp_row.get('impliedVolatility', 0.3) or 0.3) + (sc_row.get('impliedVolatility', 0.3) or 0.3)) / 2, 4),
                    delta=round(sc_delta - sp_delta, 3),
                    annualized_return=round(ann_return, 1),
                    safety_cushion=round(min_distance, 2),
                    max_profit=round(net_credit * 100, 2),
                    max_loss=None,
                    breakeven=round(sp_strike - net_credit, 2),
                    leg2_strike=sc_strike, leg2_type="CALL",
                    risk_notes=[
                        f"Put翼距{put_distance:.1f}%  Call翼距{call_distance:.1f}%",
                        f"⚠️ 裸卖组合，理论亏损无限"
                    ],
                ))

    candidates.sort(key=lambda x: x.score, reverse=True)
    for i, c in enumerate(candidates[:3]):
        c.rank = i + 1
    return candidates[:3]


# ════════════════════════════════════════════════════════════
# MAIN ORCHESTRATOR
# ════════════════════════════════════════════════════════════

def scan_ticker(ticker: str) -> dict:
    """Full scan pipeline."""
    from .options_scanner import get_direction, get_iv_environment, filter_strategies

    direction = get_direction(ticker)
    iv_env = get_iv_environment(ticker)
    strategy_filter = filter_strategies(direction, iv_env)

    result = {
        "ticker": ticker,
        "price": direction.price,
        "direction": {
            "score": direction.score,
            "label": direction.label,
            "momentum_5d": direction.momentum_5d,
            "rsi_14": direction.rsi_14,
            "support": direction.support_level,
            "resistance": direction.resistance_level,
            "near_support": direction.near_support,
            "near_resistance": direction.near_resistance,
            "signals": direction.signals_detail,
        },
        "iv_environment": {
            "rank": iv_env.iv_rank,
            "current_iv": iv_env.current_iv,
            "regime": iv_env.regime,
            "days_to_earnings": iv_env.days_to_earnings,
        },
        "strategy_filter": {
            "applicable": strategy_filter.applicable,
            "eliminated": strategy_filter.eliminated,
            "recommendation": strategy_filter.recommendation,
            "watch_reason": strategy_filter.watch_reason,
        },
        "candidates": {},
    }

    if strategy_filter.recommendation == "观望":
        return result

    current_price, chains = get_option_chain(ticker)
    if not chains:
        result["strategy_filter"]["recommendation"] = "观望"
        result["strategy_filter"]["watch_reason"] = "无法获取期权链数据"
        return result

    scorer_map = {
        "sell_put": lambda: score_sell_put(current_price, chains),
        "covered_call": lambda: score_covered_call(current_price, chains),
        "bull_call_spread": lambda: score_bull_call_spread(current_price, chains),
        "bear_put_spread": lambda: score_bear_put_spread(current_price, chains),
        "iron_condor": lambda: score_iron_condor(current_price, chains, iv_env.iv_rank),
        "strangle": lambda: score_strangle(current_price, chains, iv_env.iv_rank),
    }

    for strategy_name in strategy_filter.applicable:
        if strategy_name in scorer_map:
            scored = scorer_map[strategy_name]()
            if scored:
                result["candidates"][strategy_name] = [
                    {
                        "rank": s.rank, "score": s.score,
                        "score_breakdown": s.score_breakdown,
                        "symbol": s.symbol, "expiry": s.expiry,
                        "strike": s.strike, "option_type": s.option_type,
                        "bid": s.bid, "ask": s.ask, "mid": s.mid,
                        "spread_pct": s.spread_pct,
                        "volume": s.volume, "oi": s.oi,
                        "iv": s.iv, "delta": s.delta,
                        "annualized_return": s.annualized_return,
                        "safety_cushion": s.safety_cushion,
                        "max_profit": s.max_profit,
                        "max_loss": s.max_loss,
                        "breakeven": s.breakeven,
                        "prob_profit": s.prob_profit,
                        "leg2_strike": s.leg2_strike,
                        "leg2_type": s.leg2_type,
                        "leg2_symbol": s.leg2_symbol,
                        "risk_notes": s.risk_notes,
                        "strategy_cn": s.strategy_cn,
                    }
                    for s in scored
                ]

    return result
