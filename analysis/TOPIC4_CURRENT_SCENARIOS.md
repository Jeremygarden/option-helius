# Topic 4: Current Scenario Stress Test Analysis

This document outlines the current 5 pre-built stress test scenarios implemented in the system.

## Implementation Details
- **Service Path**: `backend/app/services/scenarios.py`
- **Methodology**: Full Black-Scholes re-pricing of positions based on shifted parameters.

## Current Scenarios

| Scenario | Trigger Condition | P&L Formula | Greeks Shift Method |
| :--- | :--- | :--- | :--- |
| **Flash Crash** | -15% Spot, +20% IV | $\sum (BS_{new} - BS_{old}) \times size \times 100$ | Relative Vol shift: $IV_{new} = IV_{old} \times 1.2$ |
| **Vol Spike** | 0% Spot, +50% IV | $\sum (BS_{new} - BS_{old}) \times size \times 100$ | Relative Vol shift: $IV_{new} = IV_{old} \times 1.5$ |
| **Gap Up** | +10% Spot, -5% IV | $\sum (BS_{new} - BS_{old}) \times size \times 100$ | Relative Vol shift: $IV_{new} = IV_{old} \times 0.95$ |
| **IV Crush** | 0% Spot, -40% IV | $\sum (BS_{new} - BS_{old}) \times size \times 100$ | Relative Vol shift: $IV_{new} = IV_{old} \times 0.6$ |
| **Rate Shock** | -2% Spot, +0.5% Rate | $\sum (BS_{new} - BS_{old}) \times size \times 100$ | Absolute Rate shift: $r_{new} = r_{old} + 0.005$ |

## Observation
- The current system uses **full re-pricing** (Black-Scholes), whereas the proposed expansion requires **Taylor series approximation** (Greeks-based breakdown).
- Current "Greeks shift" for IV is **relative** (percentage of current IV), while the new spec asks for **absolute** IV change (vol points) in the Taylor expansion engine.
