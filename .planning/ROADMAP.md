# ROADMAP.md — 美股期权大师 Dashboard

## Phase 1: Core Infrastructure [pending]
**目标:** 搭建项目骨架 + 数据接入层

Tasks:
- Docker Compose 环境 (FastAPI + Redis + TimescaleDB + Next.js)
- IBKR Gateway 连接模块 (ib_insync, sub-account)
- Longbridge API 客户端
- 基础数据模型 (期权链、Greeks、OI)
- WebSocket 推送基础设施
- Next.js 项目骨架 + 路由

## Phase 2: Options Chain Module [pending]
**目标:** 核心期权链概览模块

Tasks:
- 期权链数据获取 & 缓存 (Redis)
- Greeks 计算层 (Delta/Gamma/Theta/Vega)
- IV Rank / IV Percentile 计算 (TimescaleDB历史数据)
- GEX (Gamma Exposure) 计算
- Max Pain 计算
- 前端期权链表格 + OI Heatmap

## Phase 3: Market Data & Sentiment [pending]
**目标:** 宏观数据 + 情绪模块

Tasks:
- VIX/VVIX 数据接入 (CBOE)
- 美债收益率曲线 (FRED API)
- 财报日历集成
- Unusual Options Activity 扫描引擎
- Put/Call Ratio 计算
- 前端情绪 Dashboard

## Phase 4: Analytics & Visualization [pending]
**目标:** 快速计算 + 可视化工具

Tasks:
- Payoff Diagram 组件 (TradingView Charts)
- Spread Builder UI
- Greeks 聚合计算器
- 前端交互式组合构建器

## Phase 5: Weekly Picks & Backtesting [pending]
**目标:** 智能选股 + 每周精选

Tasks:
- 安全边际筛选算法
- 风险收益比排名引擎
- 简单历史回测框架
- 每周精选报告生成
