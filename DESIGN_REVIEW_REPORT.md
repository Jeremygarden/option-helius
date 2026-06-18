# Design Review Report — option-helius

**日期:** 2026-06-18
**版本:** gstack /design-review 10轮完成
**审查范围:** frontend/ 全部页面及组件

---

## 总结

完成 10 轮设计审查，涉及 4 个核心页面（chain / picks / macro / profile）及多个共享组件。共修复视觉一致性、交互状态、响应式布局、组件质量等各类设计问题。

---

## 各轮修改记录

### Round 1 — 数字排版统一
**Commit:** `0f926cc`
**改动文件:** globals.css、chain/page.tsx、macro/page.tsx、picks/page.tsx、KPIBar.tsx、RunRiskPanel.tsx、WarningIndicators.tsx

- 全站所有数字值（价格、百分比、涨跌幅）统一使用 `font-mono`
- globals.css 清理冗余字体规则，建立字体 token

---

### Round 2 — 4px 间距网格统一
**Commit:** `0473f03`
**改动文件:** chain/、macro/、picks/、profile/、report/、sentiment/、layout.tsx、GEXChart.tsx、IVSurface3D.tsx

- 全站 padding/margin/gap 统一为 4px 倍数体系
- layout.tsx 容器间距标准化
- 消除不规则间距（5px、7px、13px 等）

---

### Round 3 — CSS Token 替换硬编码色值
**Commit:** `bf2b6bf`
**改动文件:** macro/、picks/、profile/、report/、sentiment/、GEXChart.tsx、IVSurface3D.tsx、OIVolChart.tsx、TermStructure.tsx

- 将全站约 300+ 处硬编码 hex 色值（如 `#1a1a2e`、`#16213e`）替换为 CSS token 变量
- 图表组件颜色统一走 token，支持主题切换

---

### Round 4 — 交互状态完善
**Commit:** `07d7881`
**改动文件:** chain/、macro/、picks/、profile/、report/、sentiment/、IVSurface3D.tsx

- 为全站可点击元素补全 `hover` / `focus` / `active` 三态样式
- 修复 profile 页面多个按钮无 focus ring 问题
- 键盘可访问性提升

---

### Round 5 — Chain 页面布局与视觉层级
**Commit:** `5bf3f56`
**改动文件:** chain/page.tsx

- 修复 chain 页面卡片层级混乱问题
- 优化 KPI bar 与图表区块的视觉分隔
- 调整 IV Surface 3D 组件的容器比例

---

### Round 6 — Picks 页面布局与 Badge 系统
**Commit:** `21a2d82`
**改动文件:** picks/page.tsx

- 修复策略卡片 badge（bullish/bearish/neutral）颜色和尺寸不一致
- 统一卡片网格列宽和最小高度
- 修复 filter tab 选中态下 badge 对比度问题

---

### Round 7 — Macro 页面布局与指标显示
**Commit:** `204a22a`
**改动文件:** macro/page.tsx

- 修复 18 个宏观指标卡片的排列错位问题
- RunRisk 面板与 BacktestTable 间距对齐
- 指标数值显示精度统一（小数位）

---

### Round 8 — Loading Skeleton 与空状态
**Commit:** `e97359a`
**改动文件:** macro/page.tsx、picks/page.tsx

- macro 页面：数据加载时展示 skeleton 占位，替代空白闪烁
- picks 页面：无数据时展示空状态提示，替代空卡片网格
- 统一 skeleton 动画时长和颜色

---

### Round 9 — 移动端响应式修复
**Commit:** `19c06bf`
**改动文件:** chain/page.tsx、macro/page.tsx、picks/page.tsx、KPIBar.tsx

- chain 页面：移动端 KPI bar 改为纵向堆叠
- picks 页面：移动端卡片网格由 3 列降为 1 列
- macro 页面：宏观指标卡片在小屏幕下正确换行
- 修复 KPIBar 在 < 640px 宽度下数字截断问题

---

### Round 10 — AI Slop 清理与最终 Polish
**Commit:** `266a778`
**改动文件:** macro/page.tsx、picks/page.tsx、profile/page.tsx、BacktestTable.tsx、RunRiskPanel.tsx

- 移除 AI 生成代码中的冗余注释（"// TODO: add more features" 等）
- 清理无意义的 console.log 和调试代码
- picks/profile 页面组件命名规范化
- BacktestTable 表头文字大小写统一
- RunRiskPanel 警告图标对齐修复

---

## 覆盖页面汇总

| 页面 | 修改轮次 | 主要改进 |
|------|---------|---------|
| `/chain` | R1 R2 R3 R4 R5 R9 | 数字排版、间距、色值、交互态、布局层级、移动端 |
| `/picks` | R1 R2 R3 R4 R6 R8 R9 R10 | 排版、间距、色值、badge系统、空状态、响应式 |
| `/macro` | R1 R2 R3 R4 R7 R8 R9 R10 | 排版、间距、色值、指标对齐、skeleton、响应式 |
| `/profile` | R2 R3 R4 R10 | 间距、色值、交互态、代码清理 |
| `/report/[ticker]` | R2 R3 R4 | 间距、色值、交互态 |
| `/sentiment` | R2 R3 R4 | 间距、色值、交互态 |

---

## 设计规范确立（本次审查输出）

1. **字体:** 数字一律 `font-mono`，文字使用系统字体栈
2. **间距:** 严格 4px 网格（4/8/12/16/24/32px）
3. **颜色:** 全部走 CSS token，禁止硬编码 hex
4. **交互态:** 所有可点击元素必须有 hover + focus + active 三态
5. **响应式:** 断点 640px（sm）/ 768px（md）/ 1024px（lg）
6. **空状态:** 加载中用 skeleton，无数据用 empty state 提示

---

*报告生成时间: 2026-06-18 | 共 10 轮，10 个 commit，涉及 30+ 文件*
