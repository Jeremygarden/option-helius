# STATE.md — Session Memory

**Current Phase:** Phase 1 - Core Infrastructure
**Status:** Ready to start

## Session Log

### 2026-05-20
- Project initialized with GSD workflow
- PROJECT.md, REQUIREMENTS.md, ROADMAP.md created
- 5 phases defined, 9 core requirements captured
- Next: /gsd-discuss-phase 1 → /gsd-plan-phase 1

## Decisions Made

- **Runtime:** Docker Compose on Azure VM
- **IBKR mode:** sub-account via ib_insync (port 4002 paper / 4001 live)
- **Data refresh:** 1-5 min (not tick-level)
- **Language:** Code in English, docs bilingual

## Decisions Confirmed (2026-05-20)

- ✅ 先用 Mock Data 搭框架，中期再接真实数据源
- ✅ 新闻: Benzinga / Seeking Alpha / Yahoo Finance (免费API)
- ✅ 社区爬取: r/stocks, r/wallstreetbets, r/thetagang, r/optionswheel
  - 工具: reddit-universal-scraper (ksanjeev284)
  - X上KOL/分析师帖子爬取
- ✅ 3D IV历史数据: IBKR可提供，Phase 2接入，暂用mock
- ✅ 数据源全部确认可用
