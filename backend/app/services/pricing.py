import numpy as np
from scipy.stats import norm
from dataclasses import dataclass
from typing import Optional

@dataclass
class BSMResult:
    price: float
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float
    iv_implied: float
    fair_value_assessment: str  # "CHEAP", "FAIR", "EXPENSIVE"

def black_scholes(S, K, T, r, sigma, option_type="call") -> BSMResult:
    """
    S: spot price
    K: strike price  
    T: time to expiry (years)
    r: risk-free rate
    sigma: implied volatility
    """
    if T <= 0:
        price = max(0, S - K) if option_type == "call" else max(0, K - S)
        return BSMResult(price, 1.0 if price > 0 else 0.0, 0, 0, 0, 0, sigma, "FAIR")

    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    
    if option_type == "call":
        price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        delta = norm.cdf(d1)
        theta = -(S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) - r * K * np.exp(-r * T) * norm.cdf(d2)
        rho = K * T * np.exp(-r * T) * norm.cdf(d2)
    else:
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        delta = -norm.cdf(-d1)
        theta = -(S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) + r * K * np.exp(-r * T) * norm.cdf(-d2)
        rho = -K * T * np.exp(-r * T) * norm.cdf(-d2)
        
    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    vega = S * norm.pdf(d1) * np.sqrt(T)
    
    return BSMResult(
        price=float(price),
        delta=float(delta),
        gamma=float(gamma),
        theta=float(theta) / 365,
        vega=float(vega) / 100,
        rho=float(rho) / 100,
        iv_implied=float(sigma),
        fair_value_assessment="FAIR"
    )

def calculate_fair_value_assessment(market_price: float, bsm_price: float, threshold=0.05) -> str:
    if bsm_price <= 0:
        return "FAIR"
    diff_pct = (market_price - bsm_price) / bsm_price
    if diff_pct > threshold: return "EXPENSIVE"
    if diff_pct < -threshold: return "CHEAP"
    return "FAIR"
