# Phase 2 Plan — Dual Subagent Deep UI Overhaul

## 触发条件
当前 ralph 8轮跑完后执行

## 执行方案
拉起 2 个 subagent，各自独立跑 ralph，各跑 15 轮：

### Subagent A — Chain 页面专项
- 目标文件：`app/chain/page.tsx`, `components/chain/*`
- 参考图：chain 截图（IV Surface, expiry tabs, KPIBar, chart grid）
- Ralph 15 轮，每轮 commit+push

### Subagent B — Picks 页面专项  
- 目标文件：`app/picks/page.tsx`, `components/picks/*`
- 参考图：picks 截图（策略卡片 grid, scanner summary, 左边框高亮, Greeks grid）
- Ralph 15 轮，每轮 commit+push

## 注意事项
- 两个 subagent 需要避免同时写同一个文件（globals.css / layout.tsx 只在8轮期间改）
- 参考图需要保存到项目目录后传给 subagent
- 每个 subagent 用独立的 prompt file 和独立的 ralph state 目录
- 用 `--no-commit` 让 ralph 自己不 commit，在 prompt 里要求 agent 每轮手动 commit+push

## 参考图保存位置
- `/home/azureuser/projects/options-dashboard/ref-chain.png`
- `/home/azureuser/projects/options-dashboard/ref-picks.png`
