# IBKR 整合方案：Option-Helius + IB Gateway Docker

## 1. ib-gateway-docker 现状分析

### 核心能力与架构
- **项目结构**：采用 Docker 容器化部署 IB Gateway，通过 `ib-async` (ib_insync 的活跃维护分支) 提供异步 Python 客户端。
- **关键模块**：
    - `ibkr_client.py`: 生产级连接管理，支持自动指数退避重连、错误代码过滤、健康检查状态上报。
    - `option_chain.py`: **核心优势模块**。解决了 IB API 的核心痛点：
        - **订阅配额管理**：自动实现 ATM (At-The-Money) 动态窗口过滤，确保不超过每账户 100 个 ticker 的限制。
        - **Greeks 计算引擎**：自动先订阅 Underlying（标的资产）确保 IB 服务器计算 Model Greeks。
    - **部署模式**：提供 `docker-compose.paper.yml` 和 `live.yml`，支持 Paper/Live 模式切换。
    - **2FA 处理**：集成 noVNC (6080 端口)，允许用户在浏览器中完成登录和 2FA 验证。

---

## 2. option-helius 数据层现状

### 当前瓶颈
- **数据源**：主要依赖 `yfinance`，数据存在 15 分钟延迟，期权链 Open Interest (OI) 和 Greeks 更新缓慢，且频繁请求易被 API 限制。
- **架构**：数据逻辑目前集中在 `app/services/market_data.py`。虽然代码中实现了 `_calculate_max_pain` 和 `_bsm_gamma` 等逻辑，但缺乏实时流式数据支持。
- **核心需求点**：
    - **实时期权链**：高频更新的 Bid/Ask、Delta、IV。
    - **GEX (Gamma Exposure)**：需要准确的实时 Greeks 和 OI 数据进行加权计算。
    - **IV Surface**：需要全量或 ATM 附近多到期日的 IV 数据。

---

## 3. 整合架构方案

### 推荐架构 (Sidecar 模式)
```text
[ User Browser ] <--> [ Option-Helius Backend (FastAPI) ]
                                |
                                | (TCP/IB-Async)
                                v
                      [ IB Gateway Docker (Container) ] <--> [ IBKR Servers ]
                                ^
                                | (VNC/HTTP)
                      [ Admin Browser (for 2FA) ]
```

### 核心设计决策
1. **部署方式**：将 `ib-gateway-docker` 作为 sidecar 服务并入 `options-dashboard` 的 `docker-compose.yml`。
2. **通讯协议**：Backend 直接通过 `ib-async` TCP 连接 Gateway 端口（4002/4001）。无需额外的 HTTP 代理层，以保证最低延迟。
3. **数据路由**：在 `app/services/` 下创建 `ibkr_provider.py`，作为 `market_data.py` 的首选数据源。

### 接入优先级
1. **Phase 1 (实时报价)**：标的资产 + ATM 期权实时价格。
2. **Phase 2 (实时 Greeks/IV)**：利用 IBKR 计算的 Model Greeks 替换 Backend 的 BSM 估算逻辑。
3. **Phase 3 (GEX/OI)**：结合 IBKR 实时数据重新计算全局 Gamma 敞口。

---

## 4. 具体实施步骤

### 阶段一：基础设施集成 (预计 0.5 天)
1. 将 `ib-gateway-docker` 整个目录移动/软链至 `options-dashboard/infra/ibkr`。
2. 修改项目根目录 `docker-compose.yml`，添加 `ibgateway` 服务。
3. 在 `backend/pyproject.toml` 中添加 `ib-async` 依赖。

### 阶段二：Provider 层开发 (预计 1-2 天)
1. 移植 `ibkr_client.py` 到 `backend/app/services/ibkr/client.py`。
2. 移植 `option_chain.py` 到 `backend/app/services/ibkr/fetcher.py`。
3. 在 `backend/app/core/config.py` 中添加 IBKR 配置变量 (HOST, PORT, CLIENT_ID)。

### 阶段三：逻辑注入 (预计 1 天)
1. 修改 `app/services/market_data.py`，在 `async_get_options_chain` 中优先调用 IBKR Fetcher。
2. **Fallback 机制**：如果 IBKR 未连接或数据权限报错，自动降级到 `yfinance`。

---

## 5. 风险与注意事项

- **账户限制**：IBKR 免费版 API 订阅通常只允许 100 个 ticker。必须严格控制 `strike_radius`（建议默认 5-8 档）。
- **市场数据包**：Paper Trading 必须要求对应的 Live 账户订阅了 OPRA (Options) 数据包，否则会返回空 Greeks。
- **登录状态管理**：IBKR 每天会有一次强制断线维护（通常在凌晨）。`ibkr_client.py` 的自动重连机制至关重要。
- **2FA 挑战**：如果部署在云端，必须通过 SSH Tunnel 或反向代理访问 6080 端口完成初始登录。

---
方案生成时间：2026-06-17
调研员：IBKR Integration Subagent
