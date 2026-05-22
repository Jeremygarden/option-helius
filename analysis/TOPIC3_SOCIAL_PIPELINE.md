# TOPIC3_SOCIAL_PIPELINE: Social Sentiment Research Report

## 1. GitHub Copilot LLM 可行性评估

### 技术可行性 (OpenClaw Provider 路由)
OpenClaw 通过 `github-copilot` provider 提供对 Gemini 1.5 Flash 和 Claude 系列模型的访问。
- **推荐模型**: `github-copilot/gemini-3-flash-preview` (Gemini 1.5 Flash)。
- **优势**: Flash 模型具有极快的推理速度和较低的延迟，非常适合处理这种大批量、低复杂度的分类任务。
- **路由**: 系统根据任务类型自动选择模型，对于 `options-helius` 的后端服务，可以通过 OpenClaw 的 API 或子代理模式调用。

### Batch 处理方案
为了最大化效率并绕过频率限制，采用 **Batch Classification** 方案：
- **容量**: 每次调用 LLM 同时分析 10-20 条帖子。
- **输入**: 提供 `ticker` 和 JSON 格式的帖子列表。
- **输出**: 要求模型返回严格的 JSON 结构，包含每条帖子的情感评分以及整体摘要。

### 速率限制和缓存策略
- **限制**: GitHub Copilot 的 API 虽然没有明确的 Token 计费，但有每分钟请求数 (RPM) 的速率限制。
- **缓存**: 使用 Redis 缓存情感结果。
  - **Key**: `sentiment:{source}:{ticker}:{post_id}`
  - **TTL**: 24小时（对于帖子本身），1小时（对于聚合后的 ticker 情感）。
- **降级**: 若 LLM 响应超时或触发限流，系统自动回退至本地的 `VADER` 或 `FinBERT` 模型进行基础得分计算。

---

## 2. Reddit 数据获取方案对比

| 方案 | 复杂性 | 实时性 | 权重数据 | 结论 |
| :--- | :--- | :--- | :--- | :--- |
| **A: reddit-universal-scraper** | 中 (需自建) | 高 | 有 | 备选 |
| **B: PRAW (Official API)** | 低 | 极高 | 完整 | **推荐 (实时性强)** |
| **C: Pushshift / Arctic Shift** | 低 | 延迟 (数小时) | 部分 | 适合历史回测 |
| **D: Pullpush.io** | 低 | 高 | 较少 | 备选 |

**最终推荐**: **PRAW (Option B)**。
- **理由**: 官方 API 免费额度足以覆盖 100 req/min。获取 Score (Upvotes) 和 Num_Comments 最准确，有利于权重计算。
- **实现**: `agent-reach` 技能中也提供了基于 `json` 接口的抓取方案，作为无 API Key 时的快速降级方案。

---

## 3. X/Twitter 数据获取方案对比

| 方案 | 稳定性 | 成本 | 实现难度 | 结论 |
| :--- | :--- | :--- | :--- | :--- |
| **A: snscrape** | 不稳定 | 免费 | 低 | 不建议 (2025年以后基本失效) |
| **B: Tweepy (API v2)** | 极高 | 高 (免费额度极低) | 低 | 排除 |
| **C: Nitter** | 中 | 免费 | 中 | 备选 |
| **D: agent-reach skill** | 高 | 免费 | 极低 | **首选** |
| **E: Browser Automation** | 极高 | 免费 | 高 | 兜底方案 |

**最终推荐**: **agent-reach skill (Option D)**。
- **理由**: OpenClaw 内置的 `agent-reach` 提供了 `bird` 指令，能够直接搜索推文和用户时间线。
- **Agent Reach 可用性**: 已确认 `~/.openclaw/skills/agent-reach/` 存在 `twitter.py` 通道，支持 `bird search` 和 `bird user-tweets`。

---

## 4. 滑动窗口权重算法说明

算法核心在于 **Engagement-Weighted Recency Decay** (互动加权的时间衰减)。

### 权重公式
$$Weight = e^{-\frac{Age}{HalfLife}} \times (0.5 + 0.5 \times \frac{\log(1 + Engagement)}{\log(1 + MaxEng)})$$

- **时间衰减**: 设半衰期为 72 小时。48小时前的帖子权重会显著下降。
- **互动加权**: $\text{Engagement} = \text{Score} + \text{Comments} \times 2$。使用对数缩放防止“爆款”贴过度主导情绪，归一化至 0-1 区间。

---

## 5. KOL 列表设计原则

- **Tiered Weighting**: 不同层级的 KOL 享有不同的权重系数。
  - **Tier 1 (Macro)**: 权重 1.5。如 Nick Timiraos，代表政策风向。
  - **Tier 2 (Options)**: 权重 2.0。如 SpotGamma，代表资金流向。
  - **Tier 3 (Equity)**: 权重 1.2。代表市场广度。
- **Focus Areas**: 针对 Ticker 动态匹配最相关的 KOL（如分析 NVDA 时优先看 Tier 3）。

---

## 6. 数据流架构图

```text
[Reddit API/Scraper] ----\
                          >---> [Raw Post Queue] ---> [Sentiment Pipeline Service]
[X/Twitter Bird CLI] ----/              |                       |
                                        |             [GitHub Copilot LLM]
                                        |                       |
[Weights Engine] <----------------------/                       |
      |                                                         |
      V                                                         V
[Weighted Score Calculation] <----------------------- [Batch Sentiment Results]
      |
      +------> [Redis Cache (TTL 1h)]
      |
      +------> [API Endpoint / Dashboard]
```

---

## 7. Phase 实现计划

1. **Phase 1**: 集成 `agent-reach` 和 `PRAW` 获取原始数据。
2. **Phase 2**: 实现 `sentiment_pipeline.py` 中的 LLM Batch 处理逻辑。
3. **Phase 3**: 编写权重聚合引擎并接入 Redis 缓存。
4. **Phase 4**: 导出 API 供前端仪表盘显示 Ticker 的实时社交情绪指标。
