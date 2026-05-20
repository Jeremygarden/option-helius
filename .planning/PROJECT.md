# 美股期权大师 Dashboard — PROJECT.md

## Vision

构建一个专业的美股期权分析平台，通过多维度数据整合，帮助交易者识别安全边际最大、收益最好的期权策略。

## Stack

| Layer | Technology |
|-------|-----------|
| 后端框架 | Python 3.12 + FastAPI |
| 实时缓存 | Redis 7 |
| 时序数据库 | TimescaleDB (PostgreSQL 16 extension) |
| 前端框架 | Next.js 14 (App Router) |
| 图表库 | TradingView Lightweight Charts |
| IBKR连接 | ib_insync |
| 消息推送 | WebSocket (FastAPI native) |
| 部署 | Docker Compose |
| 包管理 | uv (Python), pnpm (Node) |

## Data Sources

### Primary
- **IBKR Gateway** — 实时期权链数据 (sub-account, 不影响主账户)
- **Longbridge API** — 历史IV数据、补充行情

### Secondary
- **CBOE** — VIX/VVIX、期权流量数据
- **FRED API** — 宏观经济指标
- **Yahoo Finance** — 财报日历、快速行情

## Constraints

- IBKR Gateway 以 sub-account 模式运行，不干扰主账户登录
- 期权链刷新频率：1-5 分钟（非 tick 级）
- 部署在 Azure VM (Linux)
- 代码全英文，注释/文档中英双语

## Five Modules

1. **消息 & 情绪** — Unusual activity, Put/Call ratio, Whale alerts
2. **宏观数据** — VIX/VVIX, 利率曲线, 财报日历, Fed Watch
3. **期权链概览** — Greeks, OI heatmap, IV Rank/Percentile, GEX, Max Pain
4. **快速计算 & 可视化** — Payoff diagram, Spread builder
5. **每周精选** — 安全边际筛选, 风险收益比排名
