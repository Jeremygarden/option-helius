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

## Open Questions

- [ ] IBKR 账户类型确认 (Paper TWS / 正式 sub-account?)
- [ ] Longbridge API token 是否已有?
- [ ] 优先标的 watchlist (SPY/QQQ/IWM + 哪些个股?)
- [ ] 部署端口偏好
