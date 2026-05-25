import yfinance as yf
import numpy as np
from dataclasses import dataclass
from typing import Optional


@dataclass
class DirectionSignal:
    score: float          # -100 to +100
    label: str            # "Bullish" / "Bearish" / "Neutral"
    ma_signal: float      # component score
    momentum_5d: float    # component score
    rsi_14: float         # raw RSI value
    support_level: float  # nearest support price
    resistance_level: float  # nearest resistance price
    near_support: bool    # within 3% of support
    near_resistance: bool # within 3% of resistance
    price: float          # current price
    signals_detail: list  # human-readable signal descriptions


@dataclass
class IVEnvironment:
    iv_rank: float        # 0-100, current IV vs 1Y range
    iv_percentile: float  # 0-100
    current_iv: float     # current ATM IV
    regime: str           # "低IV" / "中等IV" / "高IV"
    days_to_earnings: Optional[int]  # None if >45 days or unknown


@dataclass
class StrategyFilter:
    applicable: list       # List of strategy names that pass
    eliminated: dict       # {strategy_name: reason}
    recommendation: str    # "trade" or "观望"
    watch_reason: Optional[str]  # Reason if recommendation is 观望


def get_direction(ticker: str) -> DirectionSignal:
    """
    Compute market direction score from real price data.

    Components:
    - 30% MA alignment: price vs 20MA vs 50MA
    - 25% 5-day momentum: (price - price_5d_ago) / price_5d_ago
    - 20% RSI(14): >60 bullish, <40 bearish, 40-60 neutral
    - 25% Position relative to 52-week high/low
    """
    t = yf.Ticker(ticker)
    hist = t.history(period="6mo")

    if hist.empty or len(hist) < 50:
        return DirectionSignal(
            score=0, label="Neutral", ma_signal=0, momentum_5d=0,
            rsi_14=50, support_level=0, resistance_level=0,
            near_support=False, near_resistance=False, price=0,
            signals_detail=["Insufficient data"]
        )

    close = hist['Close'].values
    current_price = close[-1]

    # 1. MA alignment (30%)
    ma20 = np.mean(close[-20:])
    ma50 = np.mean(close[-50:])

    if current_price > ma20 > ma50:
        ma_score = 100
    elif current_price < ma20 < ma50:
        ma_score = -100
    elif current_price > ma20:
        ma_score = 40
    elif current_price < ma20:
        ma_score = -40
    else:
        ma_score = 0

    # 2. 5-day momentum (25%)
    if len(close) >= 6:
        mom_5d = (close[-1] - close[-6]) / close[-6]
        mom_score = np.clip(mom_5d * 2000, -100, 100)
    else:
        mom_5d = 0
        mom_score = 0

    # 3. RSI(14) (20%)
    deltas = np.diff(close[-15:])
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    avg_gain = np.mean(gains) if len(gains) > 0 else 0
    avg_loss = np.mean(losses) if len(losses) > 0 else 0.001
    rs = avg_gain / max(avg_loss, 0.001)
    rsi = 100 - (100 / (1 + rs))

    if rsi > 70:
        rsi_score = 60
    elif rsi > 60:
        rsi_score = 80
    elif rsi > 50:
        rsi_score = 30
    elif rsi > 40:
        rsi_score = -30
    elif rsi > 30:
        rsi_score = -80
    else:
        rsi_score = -60

    # 4. Position vs 52-week high/low (25%)
    high_52w = np.max(close[-252:]) if len(close) >= 252 else np.max(close)
    low_52w = np.min(close[-252:]) if len(close) >= 252 else np.min(close)
    range_52w = high_52w - low_52w if high_52w != low_52w else 1
    position_pct = (current_price - low_52w) / range_52w
    position_score = (position_pct - 0.5) * 100

    # Support/resistance (recent 20-day low/high)
    support = np.min(close[-20:])
    resistance = np.max(close[-20:])
    near_support = (current_price - support) / current_price < 0.03
    near_resistance = (resistance - current_price) / current_price < 0.03

    # Composite
    total_score = (
        0.30 * ma_score +
        0.25 * mom_score +
        0.20 * rsi_score +
        0.25 * position_score
    )
    total_score = float(np.clip(total_score, -100, 100))

    if total_score > 30:
        label = "Bullish"
    elif total_score < -30:
        label = "Bearish"
    else:
        label = "Neutral"

    signals_detail = []
    if ma_score > 50:
        signals_detail.append(f"均线多头排列 (价格>{ma20:.1f}>{ma50:.1f})")
    elif ma_score < -50:
        signals_detail.append(f"均线空头排列 (价格<{ma20:.1f}<{ma50:.1f})")
    if mom_5d > 0.02:
        signals_detail.append(f"5日强势上涨 +{mom_5d*100:.1f}%")
    elif mom_5d < -0.02:
        signals_detail.append(f"5日弱势下跌 {mom_5d*100:.1f}%")
    if rsi > 65:
        signals_detail.append(f"RSI偏强 ({rsi:.0f})")
    elif rsi < 35:
        signals_detail.append(f"RSI偏弱 ({rsi:.0f})")
    if near_resistance:
        signals_detail.append("接近压力位")
    if near_support:
        signals_detail.append("接近支撑位")

    return DirectionSignal(
        score=round(float(total_score), 1),
        label=label,
        ma_signal=round(float(ma_score), 1),
        momentum_5d=round(float(mom_5d * 100), 2),
        rsi_14=round(float(rsi), 1),
        support_level=round(float(support), 2),
        resistance_level=round(float(resistance), 2),
        near_support=bool(near_support),
        near_resistance=bool(near_resistance),
        price=round(float(current_price), 2),
        signals_detail=signals_detail
    )


def get_iv_environment(ticker: str) -> IVEnvironment:
    """
    Compute IV environment using yfinance options data.
    IV Rank = (current_IV - 1Y_low_IV) / (1Y_high_IV - 1Y_low_IV)
    """
    from datetime import datetime

    t = yf.Ticker(ticker)

    try:
        expiries = t.options
    except Exception:
        return IVEnvironment(iv_rank=50, iv_percentile=50, current_iv=0.30, regime="中等IV", days_to_earnings=None)

    if not expiries:
        return IVEnvironment(iv_rank=50, iv_percentile=50, current_iv=0.30, regime="中等IV", days_to_earnings=None)

    nearest_expiry = expiries[0]

    try:
        chain = t.option_chain(nearest_expiry)
    except Exception:
        return IVEnvironment(iv_rank=50, iv_percentile=50, current_iv=0.30, regime="中等IV", days_to_earnings=None)

    hist = t.history(period="5d")
    if hist.empty:
        current_price = 100
    else:
        current_price = float(hist['Close'].iloc[-1])

    # Find ATM call IV
    calls = chain.calls
    if calls.empty:
        current_iv = 0.30
    else:
        calls_sorted = calls.iloc[(calls['strike'] - current_price).abs().argsort()]
        atm_call = calls_sorted.iloc[0]
        current_iv = atm_call.get('impliedVolatility', 0.30)
        if current_iv is None or current_iv == 0:
            current_iv = 0.30

    # IV Rank proxy using rolling HV
    hist_1y = t.history(period="1y")
    if len(hist_1y) > 30:
        returns = np.log(hist_1y['Close'] / hist_1y['Close'].shift(1)).dropna()
        rolling_hv = returns.rolling(20).std() * np.sqrt(252)
        rolling_hv = rolling_hv.dropna()
        if len(rolling_hv) > 0:
            hv_min = float(rolling_hv.min())
            hv_max = float(rolling_hv.max())
            hv_range = hv_max - hv_min if hv_max != hv_min else 0.01
            iv_rank = ((current_iv - hv_min) / hv_range) * 100
            iv_rank = float(np.clip(iv_rank, 0, 100))
        else:
            iv_rank = 50.0
    else:
        iv_rank = 50.0

    if iv_rank < 25:
        regime = "低IV"
    elif iv_rank < 60:
        regime = "中等IV"
    else:
        regime = "高IV"

    # Earnings detection
    days_to_earnings = None
    try:
        cal = t.calendar
        if cal is not None and not cal.empty:
            if 'Earnings Date' in cal.index:
                earnings_dates = cal.loc['Earnings Date']
                if hasattr(earnings_dates, '__iter__'):
                    for ed in earnings_dates:
                        if hasattr(ed, 'date'):
                            days = (ed.date() - datetime.now().date()).days
                            if 0 <= days <= 45:
                                days_to_earnings = days
                                break
    except Exception:
        pass

    return IVEnvironment(
        iv_rank=round(iv_rank, 1),
        iv_percentile=round(iv_rank, 1),
        current_iv=round(float(current_iv), 4),
        regime=regime,
        days_to_earnings=days_to_earnings
    )


def filter_strategies(direction: DirectionSignal, iv_env: IVEnvironment) -> StrategyFilter:
    """
    Layer 1: Intelligently filter which strategies are appropriate for current environment.
    """
    ALL_STRATEGIES = [
        "sell_put", "covered_call", "bull_call_spread",
        "bear_put_spread", "iron_condor", "strangle"
    ]

    eliminated = {}

    # Rule: Near resistance
    if direction.near_resistance:
        eliminated["bull_call_spread"] = "价格接近压力位，上方空间有限"

    # Rule: Near support
    if direction.near_support:
        eliminated["bear_put_spread"] = "价格接近支撑位，下方做空盈亏比差"
        if direction.score > -60:
            eliminated["sell_put"] = "接近支撑但方向不明确，接刀风险"

    # Rule: Low IV environment
    if iv_env.iv_rank < 25:
        for s in ["sell_put", "covered_call", "iron_condor", "strangle"]:
            if s not in eliminated:
                eliminated[s] = f"IV Rank仅{iv_env.iv_rank:.0f}%，卖方权利金太低不划算"

    # Rule: Bullish direction
    if direction.score > 30:
        if "bear_put_spread" not in eliminated:
            eliminated["bear_put_spread"] = f"方向偏多(score:{direction.score:.0f})，不适合做空"
        if "covered_call" not in eliminated and direction.score > 50:
            eliminated["covered_call"] = "强势上涨中卖call容易被行权，限制收益"

    # Rule: Bearish direction
    if direction.score < -30:
        if "bull_call_spread" not in eliminated:
            eliminated["bull_call_spread"] = f"方向偏空(score:{direction.score:.0f})，不适合做多"
        if "sell_put" not in eliminated:
            eliminated["sell_put"] = "下跌趋势中卖put接飞刀"

    # Rule: Neutral direction
    if -30 <= direction.score <= 30:
        if direction.score > 0:
            if "bear_put_spread" not in eliminated:
                eliminated["bear_put_spread"] = "方向不明确，做空信号不足"
        else:
            if "bull_call_spread" not in eliminated:
                eliminated["bull_call_spread"] = "方向不明确，做多信号不足"

    # Rule: Earnings within potential DTE
    if iv_env.days_to_earnings is not None and iv_env.days_to_earnings <= 14:
        for s in ["sell_put", "covered_call", "iron_condor", "strangle"]:
            if s not in eliminated:
                eliminated[s] = f"距财报仅{iv_env.days_to_earnings}天，卖方策略跳空风险大"

    # Compute applicable
    applicable = [s for s in ALL_STRATEGIES if s not in eliminated]

    # 观望 check
    watch_reason = None
    if len(applicable) == 0:
        recommendation = "观望"
        watch_reason = "当前环境所有策略风险收益比均不佳"
    elif -20 <= direction.score <= 20 and iv_env.iv_rank < 30:
        recommendation = "观望"
        watch_reason = f"方向不明确(score:{direction.score:.0f}) + IV偏低(rank:{iv_env.iv_rank:.0f}%)，无明确机会"
        applicable = []
    else:
        recommendation = "trade"

    return StrategyFilter(
        applicable=applicable,
        eliminated=eliminated,
        recommendation=recommendation,
        watch_reason=watch_reason
    )
