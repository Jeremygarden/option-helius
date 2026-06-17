# Picks 页面全量 UI 重构 — Phase 2

## 参考图
`/home/azureuser/projects/options-dashboard/ref-picks.png`
仔细阅读这张图，理解目标样式后严格按照它实现。

## 参考图关键设计特征（picks 页面）
- 顶部：大标题"期权精选"左对齐，右侧"重新扫描"蓝色按钮
- 上半区域（点击卡片后展示）：策略详情面板
  - 标题：合约代码 monospace 大字，策略类型 badge（CALL/PUT/SPREAD 绿/红/紫色填充）
  - 关键指标：Breakeven / Max Profit / Max Loss / Probability 横排 4 盒子
  - 下方：Greeks 网格（Delta, Gamma, Theta, Vega, IV, 到期时间），每个带标签和值
  - 最下：交易建议文字区
- 下半区域：精选策略卡片 grid
  - 4列 grid（desktop），卡片较小紧凑
  - 每卡片：排名徽章#1/#2 左上角，策略类型 badge 右上角
  - 卡片主体：合约代码（mono），到期日，关键参数（Strike/Exp/Type）
  - 底部：2x2 stats grid（Delta, IV, OI, Premium）
  - 选中卡片：左边框 4px 绿色高亮 + 轻微蓝色背景
  - 未选中：深色卡片，hover 时边框变亮

## Skill
读取 `~/.openclaw/skills/frontend-design/SKILL.md` 并遵照执行

## 项目路径
`/home/azureuser/projects/options-dashboard/frontend`

## 必须保留的功能
- 所有 API 调用和数据逻辑不得修改
- 只改样式、布局、className、CSS

## 每轮专注一个区域，完整做完，commit+push，输出 COMPLETE

检查 git log 看已完成哪些，从下一个未完成的开始：

### Round 1 — globals.css 基础 token（如未完成）
确认以下 CSS 变量存在于 `app/globals.css`，如缺失则补全：
```css
:root {
  --bg-base: #0d1117;
  --bg-surface: #161b22;
  --bg-elevated: #1c2128;
  --border-default: #30363d;
  --border-muted: #21262d;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;
  --accent-blue: #58a6ff;
  --accent-green: #3fb950;
  --accent-red: #f85149;
  --accent-yellow: #d29922;
  --font-mono: 'JetBrains Mono', monospace;
  --font-sans: 'Geist', system-ui, sans-serif;
}
```

### Round 2 — StrategyCard 组件完整重写
文件：`components/picks/StrategyCard.tsx`
按照参考图精确实现：
```tsx
// 卡片外层
<div className={cn(
  "bg-[#161b22] border border-[#30363d] rounded-lg p-3 cursor-pointer transition-all",
  "hover:border-[#58a6ff]/50",
  isSelected && "border-l-4 border-l-[#3fb950] bg-[#1c2128]"
)}>
  {/* 顶部行：rank badge + strategy badge */}
  <div className="flex items-center justify-between mb-2">
    <span className="text-[10px] font-mono bg-[#1c2128] text-[#8b949e] px-1.5 py-0.5 rounded">
      #{rank}
    </span>
    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", strategyColor)}>
      {strategyType}
    </span>
  </div>
  {/* 合约代码 */}
  <div className="font-mono text-sm font-bold text-[#e6edf3] mb-1">{contractCode}</div>
  {/* 到期日 */}
  <div className="text-[11px] text-[#8b949e] mb-3">{expiry} · {daysToExp}DTE</div>
  {/* 2x2 stats grid */}
  <div className="grid grid-cols-2 gap-1.5">
    {stats.map(s => (
      <div key={s.label} className="bg-[#0d1117] rounded px-2 py-1.5">
        <div className="text-[10px] text-[#6e7681] uppercase tracking-wide">{s.label}</div>
        <div className="text-xs font-mono font-medium text-[#e6edf3] mt-0.5">{s.value}</div>
      </div>
    ))}
  </div>
</div>
```
Strategy badge 颜色：CALL=`bg-[#1a472a] text-[#3fb950]`, PUT=`bg-[#3d1a1a] text-[#f85149]`, SPREAD=`bg-[#2d1b4e] text-[#a371f7]`

### Round 3 — 策略详情面板（点击卡片后上方展示）
文件：`app/picks/page.tsx`
实现 selectedStrategy 详情区域：
- 外层：`bg-[#161b22] border border-[#30363d] rounded-lg p-5 mb-4`
- 标题行：合约代码 `text-xl font-mono font-bold` + 策略 badge
- 关键指标横排（4盒子）：
  ```tsx
  <div className="grid grid-cols-4 gap-3 mt-4">
    {/* Breakeven / Max Profit / Max Loss / Prob */}
    <div className="bg-[#1c2128] rounded-lg p-3 text-center">
      <div className="text-[11px] text-[#8b949e] uppercase tracking-wide mb-1">Breakeven</div>
      <div className="text-lg font-mono font-bold text-[#e6edf3]">$XXX</div>
    </div>
  </div>
  ```
- Greeks 网格（6格）：`grid grid-cols-3 md:grid-cols-6 gap-2 mt-3`，同样 bg-[#1c2128] 圆角盒子
- 建议文字：`text-sm text-[#8b949e] mt-4 leading-relaxed p-3 bg-[#0d1117] rounded-lg border-l-2 border-[#58a6ff]`

### Round 4 — Picks 页面主布局
文件：`app/picks/page.tsx`
- 顶部标题区：`flex items-center justify-between mb-4`
  - 左：`<h1 className="text-xl font-bold text-[#e6edf3]">期权精选 <span className="text-[#8b949e] text-sm font-normal">Picks</span></h1>`
  - 右：重新扫描按钮 `bg-[#1158c7] hover:bg-[#1f6feb] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2`
- Scanner summary 区域：`bg-[#161b22] border border-[#30363d] rounded-lg p-4 mb-4`
  - 标题小灰字 + 扫描结果 bullet list（`text-sm text-[#8b949e]`）
- 选中详情面板（有选中时显示，Round 3 实现）
- 精选卡片 grid：`grid grid-cols-2 md:grid-cols-4 gap-3`

### Round 5 — 扫描器 summary 卡片
文件：`app/picks/page.tsx`
- 在卡片 grid 上方：展示本次扫描摘要
  ```tsx
  <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 mb-4">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
      <span className="text-xs text-[#8b949e] uppercase tracking-wider font-medium">扫描结果</span>
    </div>
    <div className="grid grid-cols-3 gap-4 text-center">
      <div><div className="text-2xl font-mono font-bold text-[#58a6ff]">{count}</div><div className="text-xs text-[#8b949e]">策略筛出</div></div>
      <div><div className="text-2xl font-mono font-bold text-[#3fb950]">{bullish}</div><div className="text-xs text-[#8b949e]">看涨</div></div>
      <div><div className="text-2xl font-mono font-bold text-[#f85149]">{bearish}</div><div className="text-xs text-[#8b949e]">看跌</div></div>
    </div>
  </div>
  ```

### Round 6 — 策略类型过滤 Tab
文件：`app/picks/page.tsx`
在卡片 grid 上方加过滤 tabs：
- `全部 / CALL / PUT / SPREAD / 高IV / 低IV`
- 样式同 Chain 页面 expiry tabs：pill 形状，active = 蓝色填充
- 过滤逻辑：client-side filter，保留原有数据获取逻辑

### Round 7 — 卡片选中交互
文件：`app/picks/page.tsx`
- `useState<number | null>(null)` 追踪选中 index
- 点击卡片 → selectedIndex = i → 顶部显示详情面板
- 未选中时详情面板收起（不显示）
- 选中卡片有 `border-l-4 border-l-[#3fb950]` 左边框高亮
- 加 `transition-all duration-200` 给卡片

### Round 8 — Loading 和空状态
文件：`app/picks/page.tsx`, `components/picks/StrategyCard.tsx`
- 扫描中：全局 overlay 或顶部 loading bar `h-0.5 bg-[#58a6ff] animate-pulse w-full`
- 卡片 loading skeleton：4个骨架卡片 `animate-pulse bg-[#1c2128] rounded-lg h-[200px]`
- 无结果：`flex flex-col items-center justify-center py-16 text-[#6e7681]` + 图标 + "暂无策略，点击重新扫描"

### Round 9 — 按钮和 badge 系统统一
文件：全局（picks + chain 页面）
- 主要操作按钮：`bg-[#1158c7] hover:bg-[#1f6feb] active:scale-[0.98] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all`
- 次要按钮/ghost：`border border-[#30363d] text-[#8b949e] hover:border-[#58a6ff] hover:text-[#e6edf3] px-3 py-1.5 rounded-lg text-sm transition-all`
- 所有 badge/tag：`text-[10px] font-medium px-2 py-0.5 rounded-full` + 颜色

### Round 10 — 数字格式统一
文件：picks 页面所有组件
- 所有价格/百分比/Greek 值：加 `font-mono` class
- 正值（涨）：`text-[#3fb950]`
- 负值（跌）：`text-[#f85149]`
- 中性/小数：`text-[#e6edf3]`
- 百分比统一两位小数：`(23.45%)`

### Round 11 — Picks 页面 Header 区域
文件：`app/picks/page.tsx`
- 增加 last scan time 显示：`text-xs text-[#6e7681]` "上次扫描: 2min ago"
- 增加扫描标的显示：`NVDA · TSLA · AAPL · SPY · QQQ` 横排小 pill
- 整体 header 高度和 chain 页面保持一致

### Round 12-15 — 细节打磨
Round 12: 审计所有颜色，统一使用 CSS var token，去掉 hardcoded hex
Round 13: hover/active/focus 状态 — 确保所有可交互元素有明显状态变化
Round 14: 字间距/行高节奏 — `leading-none` 给大数字，`leading-relaxed` 给说明文字，`tracking-wider` 给标签
Round 15: 最终验证 — 访问 http://localhost:3000/picks，检查实际渲染，修复视觉 bug

## Git 规则
每轮完成后：`git add -A && git commit -m "style(picks-roundN): description" && git push origin main`
Working dir: `/home/azureuser/projects/options-dashboard`

## 完成信号
每轮做完并 push 后输出：COMPLETE
