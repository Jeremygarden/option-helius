# Chain 页面全量 UI 重构 — Phase 2

## 参考图
`/home/azureuser/projects/options-dashboard/ref-chain.png`
仔细阅读这张图，理解目标样式后严格按照它实现。

## 参考图关键设计特征（chain 页面）
- 顶部：大标题"期权链"左对齐，右侧搜索框+操作按钮
- Expiry Tab 栏：横向 pill tabs，"7D/14D/21D..." DTE 标签，active = 蓝色填充
- KPI 横排：5个指标盒子，标签小灰字在上，大号 monospace 数值在下，带颜色（涨绿跌红）
- 主区域 2列布局：左 IV Surface 3D 图，右 Term Structure 图（各占50%宽）
- 下方全宽：OI/Volume 柱状图，GEX chart
- 所有图表在深色卡片容器里（bg-surface, border, rounded-lg, 内边距）
- 图表卡片有标题行：左侧标题文字，右侧可能有时间段选择 tab 或按钮

## Skill
读取 `~/.openclaw/skills/frontend-design/SKILL.md` 并遵照执行

## 项目路径
`/home/azureuser/projects/options-dashboard/frontend`

## 必须保留的功能
- 所有 API 调用和数据逻辑不得修改
- 所有 import 和组件逻辑不得删除
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

### Round 2 — KPIBar 重写
文件：`components/chain/KPIBar.tsx`
目标：5个横排指标盒子
- 整体：`flex items-stretch bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden`
- 每个盒子：`flex flex-col gap-1 px-5 py-3 border-r border-[#30363d] last:border-r-0 min-w-[140px]`
- 标签：`text-[11px] uppercase tracking-wider text-[#8b949e] font-medium`
- 值：`text-[22px] font-bold font-mono leading-none` + 动态颜色 class（绿/红/蓝）
- 变化量：`text-xs font-mono` + 颜色

### Round 3 — Expiry Tab 栏重写
文件：`app/chain/page.tsx` 中的 expiry tabs 部分
- 外层：`flex gap-1.5 overflow-x-auto py-2 px-1 scrollbar-hide`
- 每个 tab：`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors`
- Active：`bg-[#1158c7] text-white`
- Inactive：`bg-[#1c2128] text-[#8b949e] border border-[#30363d] hover:border-[#58a6ff] hover:text-[#e6edf3]`
- Tab 内容："21DTE" 格式，或"May-16"日期格式

### Round 4 — 图表容器卡片系统
文件：`app/chain/page.tsx` + `components/chain/*.tsx`
创建或内联一个 ChartCard wrapper：
```tsx
// 每个图表包在这个结构里：
<div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
  <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
    <div>
      <h3 className="text-sm font-semibold text-[#e6edf3]">图表标题</h3>
      <p className="text-xs text-[#8b949e] mt-0.5">副标题说明</p>
    </div>
    {/* 可选：右侧时间段 tab */}
  </div>
  <div className="p-4">
    {/* 图表组件 */}
  </div>
</div>
```
应用到所有4个图表：IVSurface3D, TermStructure, OIVolChart, GEXChart

### Round 5 — Chain 页面主布局
文件：`app/chain/page.tsx`
- 顶部标题区：`flex items-center justify-between mb-4` / 左侧"期权链 Chain"大标题 / 右侧操作区
- KPIBar 紧接标题下方，全宽
- Expiry tabs 在 KPIBar 下方
- 主图区：`grid grid-cols-2 gap-4 mb-4` → IVSurface3D (左) + TermStructure (右)
- 下方：`grid grid-cols-1 gap-4` → OIVolChart 全宽 → GEXChart 全宽
- 整体：`flex flex-col gap-4 p-0`（外层 padding 在 layout 里）

### Round 6 — IV Surface 组件优化
文件：`components/chain/IVSurface3D.tsx`
- Plotly 图表：背景透明 `paper_bgcolor: 'transparent', plot_bgcolor: 'transparent'`
- 字体颜色：`font: { color: '#8b949e' }`
- 坐标轴颜色：`gridcolor: '#30363d'`, `zerolinecolor: '#30363d'`
- 色阶：使用 Viridis 或 RdYlGn 配色
- 确保容器高度合适：`height: 320` 或 `style={{ height: '320px' }}`

### Round 7 — OIVol + GEX 图表优化
文件：`components/chain/OIVolChart.tsx`, `components/chain/GEXChart.tsx`
- Recharts 配色：
  - Call OI/Vol: `#58a6ff`（蓝）
  - Put OI/Vol: `#f85149`（红）
  - GEX positive: `#3fb950`（绿）
  - GEX negative: `#f85149`（红）
- CartesianGrid: `stroke="#30363d" strokeDasharray="3 3"`
- Axes: `tick={{ fill: '#8b949e', fontSize: 11 }}`, `stroke="#30363d"`
- Tooltip: 深色背景 `contentStyle={{ backgroundColor: '#1c2128', border: '1px solid #30363d', borderRadius: '6px' }}`
- ReferenceLine for 0: `stroke="#30363d"`

### Round 8 — Term Structure 优化
文件：`components/chain/TermStructure.tsx`
- 折线图，多条线代表不同 strike
- 配色：从 `#58a6ff` 到 `#a371f7` 的渐变色系列
- 同上 CartesianGrid/Axes/Tooltip 风格
- 图例：`wrapperStyle={{ fontSize: '11px', color: '#8b949e' }}`

### Round 9 — Chain 页面 Ticker 搜索交互
文件：`app/chain/page.tsx`
- 搜索框：独立组件，`bg-[#1c2128] border border-[#30363d] rounded-lg pl-9 pr-4 py-2 text-sm`
- 搜索 icon 左侧定位
- 聚焦时：`focus:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]`
- 热门标的快捷按钮：`SPY NVDA TSLA AAPL QQQ` 横排 pill 按钮，点击填充搜索框

### Round 10 — Loading skeleton + 空状态
文件：`app/chain/page.tsx` + 各图表组件
- 数据加载中时，图表位置显示骨架屏：
  ```tsx
  <div className="animate-pulse bg-[#1c2128] rounded h-[320px] w-full" />
  ```
- 无数据时：居中显示图标 + "暂无数据" 文字，`text-[#6e7681] text-sm`
- KPIBar loading：每个盒子里的值替换为 `<div className="h-6 w-20 bg-[#1c2128] rounded animate-pulse" />`

### Round 11 — 响应式适配
文件：`app/chain/page.tsx`
- `md:grid-cols-2` → 移动端单列
- Expiry tabs 在小屏保持横滑可用
- KPIBar 在小屏：`grid grid-cols-2 md:grid-cols-5`，每盒子保持可读

### Round 12-15 — 细节打磨（每轮一个方面）
Round 12: 所有数字值加 `font-mono` class，百分比显示统一格式
Round 13: 颜色一致性审计 — 确保全页面只用 CSS token，不留 hardcoded hex（除 token 定义处）
Round 14: 边距/间距节奏 — 统一 `gap-4`/`p-4`/`rounded-lg`，去除所有不一致间距
Round 15: 最终截图验证 — 访问 http://localhost:3000/chain，检查实际渲染，修复任何视觉 bug

## Git 规则
每轮完成后：`git add -A && git commit -m "style(chain-roundN): description" && git push origin main`
Working dir: `/home/azureuser/projects/options-dashboard`

## 完成信号
每轮做完并 push 后输出：COMPLETE
