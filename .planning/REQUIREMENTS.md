# REQUIREMENTS.md — 美股期权大师 Dashboard

## REQ-001: IBKR Gateway 连接 (sub-account)
接入 IBKR Gateway API，以独立 sub-account 模式运行，获取实时期权链数据（Greeks、OI、IV、成交量），不影响主账户登录操作。

## REQ-002: Longbridge API 集成
接入 Longbridge Open API，获取美股期权历史数据、K线数据和实时行情作为补充/备份数据源。

## REQ-003: 期权链概览模块
展示目标标的的完整期权链，包含：
- Delta / Gamma / Theta / Vega (Greeks)
- Open Interest (OI) heatmap by strike
- Implied Volatility (IV)
- IV Rank 和 IV Percentile (基于过去252交易日)
- Gamma Exposure (GEX) 分布图
- Max Pain 计算

## REQ-004: 消息 & 情绪模块
- Unusual Options Activity 扫描（大单、异常OI变化）
- Put/Call Ratio 趋势（全市场 + 个股）
- Whale Alert（单笔溢价 > $10k 的异常订单）

## REQ-005: 宏观数据模块
- VIX / VVIX 实时价格及趋势
- 美债收益率曲线（2Y/5Y/10Y/30Y）
- 财报日历（含期权隐含波动率预期）
- Fed Watch（利率期货隐含概率）

## REQ-006: 期权快速计算 & 可视化
- Payoff Diagram（盈亏图，支持多腿组合）
- Spread Builder（垂直价差、铁鹰、蝶式等）
- Greeks 实时聚合（组合层面的净 Delta/Gamma）

## REQ-007: 每周精选期权组合
- 卡片式UI，每张卡片对应一个期权策略
- 字段：入场条件、目标预期、止损位、最大风险、预期回报、持有周期
- 底部：异动依据、风险点、资金占用
- 策略评分 1-10（安全边际分）
- 支持策略标签：核心/激进/保守
- 基于安全边际筛选（高IV Rank + OTM + 收益比）

## REQ-008: 实时数据推送
- WebSocket 推送期权链变化
- 1-5 分钟刷新周期
- 前端实时更新无需手动刷新

## REQ-009: 多标的支持
- 支持自定义 watchlist
- 快速切换标的
- 支持 SPY/QQQ/IWM 等主流 ETF + 个股
