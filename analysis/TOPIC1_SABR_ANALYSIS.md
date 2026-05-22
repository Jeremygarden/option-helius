# TOPIC1: SABR 模型可行性分析 (IBKR 数据方案)

## 1. SABR 数据需求清单
SABR (Stochastic Alpha Beta Rho) 模型旨在通过四个参数 ($\alpha, \beta, \rho, \nu$) 拟合隐含波动率微笑/偏斜 (IV Smile/Skew)。

*   **核心需求**: 同一到期日 (Single Expiry) 下，不同行权价 (Multiple Strikes) 的隐含波动率或期权价格。
*   **采样点**: 为了稳定校准，每个到期日至少需要 5 个关键点：
    *   深度虚值认沽 (Deep OTM Puts)
    *   虚值认沽 (OTM Puts)
    *   平值 (ATM)
    *   虚值认购 (OTM Calls)
    *   深度虚值认购 (Deep OTM Calls)
*   **辅助数据**: 标的价格 (Spot Price)、无风险利率 (Rate)、到期时间 (Time to Maturity)。

## 2. IBKR 数据可用性评估
通过对 IBKR TWS API 的调研，结论如下：

| 数据项 | API 路径 | 可用性 | 评估 |
| :--- | :--- | :--- | :--- |
| **期权链结构** | `reqSecDefOptParams` | ✅ 高 | 可实时获取所有行权价和到期日。 |
| **实时行权价 IV** | `reqMktData` (Tick 24) | ✅ 高 | IBKR 实时计算并推送每个合约的 IV。 |
| **希腊字母 (Greeks)** | `reqMktData` (Tick 27) | ✅ 高 | 直接提供 Delta, Gamma, Theta, Vega。 |
| **历史波动率** | `reqHistoricalData` | ✅ 中 | 可获取历史 IV，但主要用于统计回顾。 |

**关键约束**:
1.  **并发限制**: 基础账户通常限制同时订阅 100 条市场数据线。若要拟合 5 个到期日的波动率曲线，每个到期日取 10 个行权价，总计占用 50 条线，对单品种压力不大，但多品种监控时需频繁切换订阅。
2.  **频率限制**: API 消息发送频率限制为 50 messages/sec。

## 3. API 调用方案 (如果采用 SABR)
若实现 SABR，技术流程如下：
1.  调用 `reqContractDetails` 获取目标标的的所有期权合约定义。
2.  根据标的价格，筛选出每个到期日 ATM 附近的 5-10 个核心行权价。
3.  对筛选出的合约批量调用 `reqMktData`，订阅 `Generic Tick 24`。
4.  在 `tickOptionComputation` 回调中持续更新波动率曲线数据点。
5.  使用 `scipy.optimize` 进行最小二乘法拟合，校准 SABR 参数。

## 4. 复杂度 vs 收益分析
*   **复杂度 (高)**: 
    *   需要管理大量合约的生命周期订阅。
    *   SABR 拟合对起始值敏感，且需处理无套利约束 (Arbitrage-free constraints)。
    *   多品种实时拟合对后端计算与数据状态同步要求较高。
*   **收益 (中/高)**: 
    *   提供比 BSM 更好的微笑拟合，能更准确地捕捉极端行情下的隐含波动率变化。
    *   更精确的 Delta/Gamma 对冲参考。

## 5. 最终建议：方案 1+3 (BSM + Skew + IV Percentile)
**结论**: 现阶段**暂不采用 SABR**，推荐优先实施 **方案 1 (BSM + Skew)** 和 **方案 3 (IV Percentile)**。

*   **理由**: 
    1.  **数据成本**: 方案 1 仅需 3-5 个关键行权价点即可粗略估算 Skew，对 IBKR 订阅线消耗低。
    2.  **开发周期**: 方案 1+3 无需复杂的非线性优化逻辑，系统响应更快，更易于实现“市场在押什么”的直观描述。
    3.  **实用性**: 对于 ETF 轮动和宏观择时，Skew 的方向性和 IV 的历史分位比精确的波动率曲面拟合更具决策价值。
*   **后续计划**: 将 SABR 列为 Phase 3 的高级功能，用于提供更专业的期权定价参考。

## 6. "市场在押什么" 自然语言模板

### English Version
```text
Based on current options data for {ticker}:
- Market implied move: ±{implied_move}% by {expiry}
- Skew direction: {skew_status} (Puts {put_cost} relative to Calls)
- GEX implication: {gex_status} volatility around ${key_level}
- Smart money positioning: {positioning}
- Bottom line: {summary}
```

### 中文版 (推荐显示)
```text
根据 {ticker} 的最新期权数据：
- 市场预期波动: 到 {expiry} 预计波动幅度为 ±{implied_move}%
- 偏斜特征: {skew_status} (认沽期权相对认购期权{put_cost})
- 伽马风险 (GEX): 在 ${key_level} 附近可能{gex_status}波动
- 资金流向: 大单主要在押注{positioning}
- 核心总结: {summary}
```

## 7. 实现路线图
*   **Phase 1 (Current)**: 实现基础 BSM 计算、ATM IV 提取、简易 Skew 计算、自然语言生成器。
*   **Phase 2**: 接入 IV Percentile (历史百分位) 统计，完善 GEX (Gamma Exposure) 全面计算。
*   **Phase 3**: 引入 SABR 或 SVI 模型进行全曲面拟合，支持专业的波动率套利分析。
