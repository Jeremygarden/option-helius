"use client";
import React, { useState, useEffect, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────
interface RunRiskData {
  score: number;            // 62.4
  signal: string;           // "橙色预警"
  signal_level: number;     // 1=green, 2=yellow, 3=orange, 4=red
  regime: string;           // "bull_late"
  regime_label: string;     // "牛市末期"
  regime_confidence: number; // 0.75
  regime_evidence: string[]; // ["AIAE=51% > 45%", ...]
  dynamic_score: number;    // 64.2
  regime_impact: number;    // +1.8
  top_risks: string[];      // ["居民配置极高", "机构接近满仓", "M7集中度历史极值"]
  action_checklist: ActionItem[];
  trip_wires: TripWire[];
  indicators: IndicatorCard[];
}

interface ActionItem {
  text: string;
  type: "do" | "watch" | "avoid";  // ✅ do, ⚠️ watch, ❌ avoid
}

interface TripWire {
  condition: string;        // "HY OAS > 380bps"
  description: string;      // "信用市场压力"
  current_value: string;    // "278bps"
  triggered: boolean;
}

interface IndicatorCard {
  id: string;
  name_zh: string;          // "债市波动率"
  name_en: string;          // "MOVE"
  value: number;
  value_display: string;    // "76.8" or "278bps" or "31%"
  danger_score: number;     // 0-100
  weight: number;           // 0.12
  weighted_contribution: number; // danger_score * weight
  category: string;         // "流动性" | "情绪" | "估值" | "跨资产" | "广度" | "波动率"
  trend: "up" | "down" | "flat";
  trend_value: string;      // "+3.2% 3M"
  status_label: string;     // "低危" | "正常" | "偏高" | "极高"
  status_level: 1 | 2 | 3 | 4; // green/yellow/orange/red
  description: string;      // brief Chinese description of what it measures
}

interface SentinelIndicator {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  value: number;
  display: string;
  threshold: number;
  threshold_display: string;
  threshold_direction: "above" | "below";
  lead_time: string;
  description: string;
  triggered: boolean;
  distance: string;
  proximity_pct: number;
}

// ── Color helpers ──────────────────────────────────────────────
const SIGNAL_COLORS = {
  1: { bg: "bg-green-900/30", border: "border-green-500", text: "text-[var(--accent-green)]", dot: "bg-green-400" },
  2: { bg: "bg-yellow-900/30", border: "border-yellow-500", text: "text-yellow-400", dot: "bg-yellow-400" },
  3: { bg: "bg-orange-900/30", border: "border-orange-500", text: "text-orange-400", dot: "bg-orange-400" },
  4: { bg: "bg-red-900/30", border: "border-red-500", text: "text-[var(--accent-red)]", dot: "bg-red-400" },
};

// ── Mock Data ──────────────────────────────────────────────────
const MOCK_DATA: RunRiskData = {
  score: 62.4,
  signal: "橙色预警",
  signal_level: 3,
  regime: "bull_late",
  regime_label: "牛市末期",
  regime_confidence: 0.75,
  regime_evidence: ["AIAE=51% > 45%", "NAAIM=93.8% > 80%", "VIX=14.5 < 20", "HY OAS=278 < 400"],
  dynamic_score: 64.2,
  regime_impact: 1.8,
  top_risks: ["居民股票配置达历史极值 (51%)", "机构仓位接近满仓 (93.8%)", "M7集中度创历史新高 (31%)"],
  action_checklist: [
    { text: "维持现有仓位，不追高加仓", type: "do" },
    { text: "配置 5% 虚值 Put 对冲（SPX，3-6个月期）", type: "do" },
    { text: "设置核心持仓止损位", type: "do" },
    { text: "重点监控 HY OAS 走势", type: "watch" },
    { text: "重点监控 MOVE 债市波动率", type: "watch" },
    { text: "暂停新增高Beta多头仓位", type: "avoid" },
    { text: "暂停加杠杆操作", type: "avoid" },
  ],
  trip_wires: [
    { condition: "HY OAS > 380bps", description: "信用市场开始定价压力", current_value: "278bps", triggered: false },
    { condition: "MOVE > 110", description: "债市波动率进入警戒区", current_value: "76.8", triggered: false },
    { condition: "综合危险分 > 65", description: "综合评分突破红色阈值", current_value: "62.4", triggered: false },
    { condition: "VIX 快速升破 25", description: "市场恐慌情绪急剧升温", current_value: "14.5", triggered: false },
  ],
  indicators: [
    // 权重最高的先排
    { id: "move", name_zh: "债市波动率", name_en: "MOVE", value: 76.8, value_display: "76.8", danger_score: 25, weight: 0.12, weighted_contribution: 3.0, category: "流动性", trend: "down", trend_value: "-5.2 3M", status_label: "正常", status_level: 1, description: "美国国债期权隐含波动率，越高=债市压力越大" },
    { id: "m7_concentration", name_zh: "M7集中度", name_en: "M7 Weight", value: 31, value_display: "31%", danger_score: 100, weight: 0.12, weighted_contribution: 12.0, category: "市场结构", trend: "up", trend_value: "+1.5% 3M", status_label: "极高", status_level: 4, description: "标普500中M7科技巨头权重占比，越高=集中度风险越大" },
    { id: "hy_oas", name_zh: "高收益利差", name_en: "HY OAS", value: 278, value_display: "278bps", danger_score: 35, weight: 0.093, weighted_contribution: 3.3, category: "流动性", trend: "down", trend_value: "-17bps 3M", status_label: "正常", status_level: 1, description: "高收益债vs国债利差，飙升=信用危机先行信号" },
    { id: "gold_copper", name_zh: "金铜比", name_en: "Gold/Copper", value: 762, value_display: "762", danger_score: 65, weight: 0.088, weighted_contribution: 5.7, category: "跨资产", trend: "up", trend_value: "+5.8% 3M", status_label: "偏高", status_level: 3, description: "黄金/铜价比值，高=避险>增长，表明市场偏悲观" },
    { id: "dxy", name_zh: "美元指数", name_en: "DXY 3M%", value: 98.5, value_display: "98.5", danger_score: 35, weight: 0.08, weighted_contribution: 2.8, category: "跨资产", trend: "up", trend_value: "+2.1% 3M", status_label: "中等", status_level: 2, description: "美元强弱，急速走强=全球风险资产去杠杆信号" },
    { id: "naaim_exposure", name_zh: "机构仓位", name_en: "NAAIM", value: 93.79, value_display: "93.8%", danger_score: 85, weight: 0.075, weighted_contribution: 6.4, category: "情绪", trend: "up", trend_value: "+11.8 3M", status_label: "极高", status_level: 4, description: "NAAIM主动管理基金股票仓位，极高=上涨空间有限" },
    { id: "yield_curve", name_zh: "收益率曲线", name_en: "10Y-2Y", value: 15, value_display: "+15bps", danger_score: 65, weight: 0.071, weighted_contribution: 4.6, category: "流动性", trend: "down", trend_value: "-10bps 3M", status_label: "偏高", status_level: 3, description: "10年-2年美债利差，倒挂(-) =衰退先行指标" },
    { id: "pe_gap", name_zh: "PE偏差", name_en: "PE Gap", value: 22, value_display: "22%", danger_score: 85, weight: 0.056, weighted_contribution: 4.8, category: "估值", trend: "up", trend_value: "+2% 3M", status_label: "偏高", status_level: 3, description: "TTM市盈率 vs 远期市盈率偏差，高=市场对未来盈利过度乐观" },
    { id: "fear_greed", name_zh: "恐贪指数", name_en: "Fear & Greed", value: 66.94, value_display: "66.9", danger_score: 65, weight: 0.053, weighted_contribution: 3.4, category: "情绪", trend: "up", trend_value: "+8.9 3M", status_label: "偏高", status_level: 3, description: "CNN恐贪指数 0=极恐 100=极贪，>75=过度贪婪预警" },
    { id: "erp", name_zh: "股权风险溢价", name_en: "ERP", value: -0.01, value_display: "-1.0%", danger_score: 50, weight: 0.052, weighted_contribution: 2.6, category: "估值", trend: "down", trend_value: "-0.5% 3M", status_label: "中等", status_level: 2, description: "股票收益率-国债收益率，负值=股票已不如债券吸引人" },
    { id: "sectors_200dma", name_zh: "行业200MA", name_en: "Sectors 200DMA", value: 81.82, value_display: "81.8%", danger_score: 70, weight: 0.052, weighted_contribution: 3.6, category: "广度", trend: "up", trend_value: "+7.8% 3M", status_label: "偏高", status_level: 3, description: "11个行业ETF中高于200日均线的比例，>80%=过热区" },
    { id: "cape", name_zh: "席勒PE", name_en: "CAPE", value: 37.0, value_display: "37.0x", danger_score: 90, weight: 0.02, weighted_contribution: 1.8, category: "估值", trend: "up", trend_value: "+1.5x 3M", status_label: "极高", status_level: 4, description: "周期调整市盈率，历史均值~17，当前极度高估" },
    { id: "vix", name_zh: "波动率指数", name_en: "VIX", value: 14.5, value_display: "14.5", danger_score: 80, weight: 0.02, weighted_contribution: 1.6, category: "波动率", trend: "down", trend_value: "-1.7 3M", status_label: "低位危险", status_level: 3, description: "市场恐惧指数（反向），VIX低=市场自满=危险" },
    { id: "skew", name_zh: "偏度指数", name_en: "SKEW", value: 138.74, value_display: "138.7", danger_score: 60, weight: 0.02, weighted_contribution: 1.2, category: "波动率", trend: "up", trend_value: "+6.7 3M", status_label: "偏高", status_level: 3, description: "CBOE偏度指数，高=市场在买尾部保护，隐含左尾风险" },
    { id: "aiae", name_zh: "居民股票配置", name_en: "AIAE", value: 0.51, value_display: "51%", danger_score: 100, weight: 0.02, weighted_contribution: 2.0, category: "情绪", trend: "up", trend_value: "+2% 3M", status_label: "极高", status_level: 4, description: "美国居民金融资产中股票占比，历史极值=满仓=顶部特征" },
    { id: "put_call_ratio", name_zh: "认沽认购比", name_en: "P/C Ratio", value: 1.19, value_display: "1.19", danger_score: 40, weight: 0.02, weighted_contribution: 0.8, category: "情绪", trend: "up", trend_value: "+0.24 3M", status_label: "中等", status_level: 2, description: "Put/Call比率（反向），高=市场悲观=潜在反弹信号" },
    { id: "rsp_spy", name_zh: "等权vs标普差", name_en: "RSP/SPY", value: -9.48, value_display: "-9.5%", danger_score: 70, weight: 0.02, weighted_contribution: 1.4, category: "广度", trend: "down", trend_value: "-2.5% 3M", status_label: "偏高", status_level: 3, description: "等权重vs市值加权标普差，负值大=市场极度集中在少数大盘股" },
    { id: "trend", name_zh: "趋势偏离", name_en: "Trend vs 200MA", value: 12, value_display: "+12%", danger_score: 85, weight: 0.02, weighted_contribution: 1.7, category: "广度", trend: "up", trend_value: "+1.5% 3M", status_label: "偏高", status_level: 3, description: "标普500相对200日均线偏离度，过高=超买区" },
  ]
};

// ── Semicircle Gauge ───────────────────────────────────────────
function SemiCircleGauge({ score, level }: { score: number; level: number }) {
  const colors = ["var(--accent-blue)", "var(--accent-blue)", "var(--accent-blue)", "var(--accent-blue)"];
  const color = colors[level - 1];
  const angle = (score / 100) * 180 - 90; // -90 to +90 degrees
  const r = 70;
  const cx = 90, cy = 90;
  
  // Arc segments for gauge background
  const segments = [
    { start: -90, end: -18, color: "var(--accent-blue)" },   // 0-40 green
    { start: -18, end: 18, color: "var(--accent-blue)" },    // 40-55 yellow  
    { start: 18, end: 54, color: "var(--accent-blue)" },     // 55-65 orange
    { start: 54, end: 90, color: "var(--accent-blue)" },     // 65-100 red
  ];
  
  function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  
  function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const s = polarToCartesian(cx, cy, r, startAngle + 90);
    const e = polarToCartesian(cx, cy, r, endAngle + 90);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  // Needle
  const needleAngle = angle;
  const needleEnd = polarToCartesian(cx, cy, r - 8, needleAngle + 90);
  const needleBase1 = polarToCartesian(cx, cy, 8, needleAngle + 90 + 90);
  const needleBase2 = polarToCartesian(cx, cy, 8, needleAngle + 90 - 90);

  return (
    <svg viewBox="0 0 180 100" className="w-full max-w-[220px] font-mono">
      {/* Background segments */}
      {segments.map((seg, i) => (
        <path key={i} d={arcPath(cx, cy, r, seg.start, seg.end)}
          stroke={seg.color} strokeWidth="14" fill="none" strokeLinecap="butt" />
      ))}
      {/* Active arc up to current score */}
      <path d={arcPath(cx, cy, r, -90, angle)}
        stroke={color} strokeWidth="14" fill="none" strokeLinecap="butt" opacity="0.9" />
      {/* Needle */}
      <polygon
        points={`${needleEnd.x},${needleEnd.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
        fill={color} opacity="0.9" />
      <circle cx={cx} cy={cy} r="6" fill={color} />
      {/* Labels */}
      <text x="18" y="95" fill="var(--accent-blue)" fontSize="9">0</text>
      <text x="82" y="22" fill="var(--accent-blue)" fontSize="9">50</text>
      <text x="150" y="95" fill="var(--accent-blue)" fontSize="9">100</text>
    </svg>
  );
}

// ── Indicator Card ─────────────────────────────────────────────
function IndicatorCard({ ind }: { ind: IndicatorCard }) {
  const colors = SIGNAL_COLORS[ind.status_level];
  const trendIcon = ind.trend === "up" ? "↑" : ind.trend === "down" ? "↓" : "→";
  const trendColor = ind.trend === "up" ? "text-[var(--accent-red)]" : ind.trend === "down" ? "text-[var(--accent-green)]" : "text-gray-400";
  
  return (
    <div className={`flex-shrink-0 w-36 rounded-lg border ${colors.border} ${colors.bg} p-4 flex flex-col gap-4.5`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 font-mono">{ind.category}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors.text} bg-[var(--bg-base)]/30`}>
          {ind.status_label}
        </span>
      </div>
      {/* Name */}
      <div>
        <div className="text-xs text-gray-400 font-mono">{ind.name_zh}</div>
        <div className="text-[10px] text-gray-600 font-mono">{ind.name_en}</div>
      </div>
      {/* Value */}
      <div className={`text-xl font-bold font-mono ${colors.text}`}>
        {ind.value_display}
        <span className={`text-xs ml-1 ${trendColor}`}>{trendIcon}</span>
      </div>
      {/* Trend */}
      <div className={`text-[10px] ${trendColor}`}>{ind.trend_value}</div>
      {/* Danger score bar */}
      <div className="mt-1">
        <div className="flex justify-between text-[9px] text-gray-600 mb-0.5">
          <span>危险分</span>
          <span className={colors.text}>{ind.danger_score}</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500`}
            style={{ width: `${ind.danger_score}%`, backgroundColor: ind.danger_score > 70 ? "var(--accent-blue)" : ind.danger_score > 50 ? "var(--accent-blue)" : ind.danger_score > 30 ? "var(--accent-blue)" : "var(--accent-blue)" }}
          />
        </div>
      </div>
      {/* Weight contribution */}
      <div className="text-[9px] text-gray-600">
        权重 {(ind.weight * 100).toFixed(1)}% · 贡献 {ind.weighted_contribution.toFixed(1)}分
      </div>
    </div>
  );
}

// Category filter + scrollable cards
function CategoryFilteredCards({ indicators }: { indicators: IndicatorCard[] }) {
  const [activeCategory, setActiveCategory] = useState("全部");
  const categories = ["全部", "流动性", "市场结构", "情绪", "估值", "跨资产", "广度", "波动率"];
  
  const filtered = useMemo(
    () => activeCategory === "全部" ? indicators : indicators.filter(ind => ind.category === activeCategory),
    [indicators, activeCategory]
  );

  const statusCounts = useMemo(() => ({
    level4: indicators.filter(i => i.status_level === 4).length,
    level3: indicators.filter(i => i.status_level === 3).length,
    level2: indicators.filter(i => i.status_level === 2).length,
    level1: indicators.filter(i => i.status_level === 1).length,
  }), [indicators]);

  return (
    <div>
      {/* Category tabs */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide mb-3">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs border transition-all
              ${activeCategory === cat
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Scrollable cards */}
      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
        {filtered.map(ind => (
          <IndicatorCard key={ind.id} ind={ind} />
        ))}
      </div>
      
      {/* Summary stats bar */}
      <div className="mt-3 grid grid-cols-4 gap-4">
        {[
          { label: "🔴 极高危", count: statusCounts.level4, color: "text-[var(--accent-red)]" },
          { label: "🟠 偏高", count: statusCounts.level3, color: "text-orange-400" },
          { label: "🟡 中等", count: statusCounts.level2, color: "text-yellow-400" },
          { label: "🟢 正常", count: statusCounts.level1, color: "text-[var(--accent-green)]" },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-left">
            <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-[10px] text-gray-500 font-mono">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SentinelCard({ s }: { s: SentinelIndicator }) {
  const isNearThreshold = s.proximity_pct >= 80 && !s.triggered;
  
  const cardClass = s.triggered
    ? "border-red-500 bg-red-950/60 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
    : isNearThreshold
    ? "border-orange-500 bg-orange-950/30"
    : "border-gray-700 bg-gray-900/50";

  const valueClass = s.triggered ? "text-red-300" : isNearThreshold ? "text-orange-300" : "text-gray-100";
  
  const barColor = s.triggered || s.proximity_pct >= 95
    ? "bg-red-500"
    : s.proximity_pct >= 80 ? "bg-orange-500"
    : s.proximity_pct >= 60 ? "bg-yellow-500"
    : "bg-green-500";

  return (
    <div className={`rounded-lg border-2 p-4 transition-all duration-500 ${cardClass} ${s.triggered ? "animate-pulse" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-lg font-mono">{s.icon}</div>
          <div className="text-sm font-bold text-gray-200 mt-0.5 font-mono">{s.title}</div>
          <div className="text-[11px] text-gray-500 font-mono">{s.subtitle}</div>
        </div>
        <div className={`flex items-center gap-4.5 text-xs px-2 py-1 rounded-full border
          ${s.triggered
            ? "border-red-500 text-red-300 bg-red-950"
            : isNearThreshold
            ? "border-orange-500 text-orange-300 bg-orange-950/50"
            : "border-green-700 text-[var(--accent-green)] bg-green-950/30"}`}>
          {s.triggered ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />已触发</>
          ) : (
            <><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />未触发</>
          )}
        </div>
      </div>

      {/* Value */}
      <div className={`text-3xl font-black font-mono mb-1 ${valueClass}`}>
        {s.display}
      </div>
      <div className="text-[11px] text-gray-500 mb-3">
        触发阈值：<span className="text-gray-300 font-mono font-mono">{s.threshold_display}</span>
      </div>

      {/* Proximity progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-gray-600 mb-1">
          <span>接近程度</span>
          <span className={s.proximity_pct >= 80 ? "text-orange-400" : "text-gray-500"}>
            {Math.min(100, s.proximity_pct).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor} ${s.triggered ? "animate-pulse" : ""}`}
            style={{ width: `${Math.min(100, s.proximity_pct)}%` }}
          />
        </div>
      </div>

      {/* Distance */}
      <div className={`text-xs font-mono mb-2 ${s.triggered ? "text-[var(--accent-red)]" : "text-gray-400"}`}>
        {s.distance}
      </div>

      {/* Lead time + description */}
      <div className="border-t border-gray-800 pt-2 mt-1 space-y-0.5">
        <div className="text-[10px] text-blue-400">⏱ {s.lead_time}</div>
        <div className="text-[10px] text-gray-600 leading-relaxed font-mono">{s.description}</div>
      </div>
    </div>
  );
}

function SentinelSection({ sentinels }: { sentinels: SentinelIndicator[] }) {
  const triggeredCount = sentinels.filter(s => s.triggered).length;
  const nuclearAlert = triggeredCount >= 2;
  
  return (
    <div className="space-y-4 font-mono">
      {/* Nuclear alert banner — only shows when 2+ triggered */}
      {nuclearAlert && (
        <div className="rounded-lg border-2 border-red-500 bg-red-950/80 p-4 animate-pulse">
          <div className="flex items-center gap-4 text-red-300 font-bold text-sm">
            <span className="text-xl">🚨</span>
            <span>最高警戒 — {triggeredCount}/3 哨兵触发 · 综合分已失效 · 立即行动</span>
          </div>
          <div className="mt-2 text-[var(--accent-red)] text-xs font-mono">
            {sentinels.filter(s => s.triggered).map(s => s.subtitle).join(" + ")} 同时触发
          </div>
          <div className="mt-1 text-red-500 text-xs">
            历史数据：两哨兵同时触发后，市场平均在 2-8 个月内崩盘 20%+
          </div>
        </div>
      )}
      
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-200">⚡ 三大哨兵指标</span>
          <span className="text-[11px] text-gray-500">任意两个触发 → 立即升级警戒（不管综合分）</span>
        </div>
        <div className={`text-xs px-2 py-0.5 rounded-full border font-mono
          ${triggeredCount === 0 ? "border-green-700 text-[var(--accent-green)] bg-green-950/30" :
            triggeredCount === 1 ? "border-orange-600 text-orange-400 bg-orange-950/30" :
            "border-red-500 text-red-300 bg-red-950/50 animate-pulse"}`}>
          {triggeredCount}/3 触发
        </div>
      </div>

      {/* Three sentinel cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        {sentinels.map(s => <SentinelCard key={s.id} s={s} />)}
      </div>

      {/* Distance summary bar */}
      <div className="flex gap-4 text-[11px] text-gray-500 px-1">
        {sentinels.map(s => (
          <span key={s.id}>
            <span className="text-gray-600 font-mono">{s.subtitle}: </span>
            <span className={s.triggered ? "text-[var(--accent-red)] font-semibold" : "text-gray-400"}>
              {s.distance}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function RunRiskPanel() {
  const [data, setData] = useState<RunRiskData>(MOCK_DATA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: fetch from /api/macro/run-risk when backend ready
  }, []);

  const sc = SIGNAL_COLORS[data.signal_level as keyof typeof SIGNAL_COLORS] || SIGNAL_COLORS[1];
  const regimeColors: Record<string, string> = {
    bull_late: "text-orange-400",
    rate_shock: "text-yellow-400",
    credit_stress: "text-[var(--accent-red)]",
    vol_spike: "text-purple-400",
    normal: "text-[var(--accent-green)]",
    mixed: "text-gray-400",
  };
  const regimeEmoji: Record<string, string> = {
    bull_late: "🟠", rate_shock: "🟡", credit_stress: "🔴", vol_spike: "🟣", normal: "🟢", mixed: "⚪"
  };

  // Sort indicators: most dangerous first (by weighted contribution)
  const sortedIndicators = useMemo(
    () => [...data.indicators].sort((a, b) => b.weighted_contribution - a.weighted_contribution),
    [data.indicators]
  );

  // Derived Sentinels
  const moveInd = data.indicators.find(i => i.id === "move")!;
  const hyOasInd = data.indicators.find(i => i.id === "hy_oas")!;
  const yieldCurveInd = data.indicators.find(i => i.id === "yield_curve")!;

  const sentinels: SentinelIndicator[] = [
    {
      id: "move",
      icon: "📡",
      title: "债市压力",
      subtitle: "MOVE 指数",
      value: moveInd.value,
      display: moveInd.value_display,
      threshold: 120,
      threshold_display: "> 120",
      threshold_direction: "above",
      lead_time: "领先股市 3-6 个月",
      description: "债市开始为流动性危机定价，银行间市场压力上升",
      triggered: moveInd.value > 120,
      distance: moveInd.value > 120 ? `已超出 ${(moveInd.value - 120).toFixed(1)}` : `距阈值 +${(120 - moveInd.value).toFixed(1)}`,
      proximity_pct: (moveInd.value / 120) * 100,
    },
    {
      id: "hy_oas",
      icon: "💀",
      title: "信用危机",
      subtitle: "HY OAS 利差",
      value: hyOasInd.value,
      display: hyOasInd.value_display,
      threshold: 450,
      threshold_display: "> 450 bps",
      threshold_direction: "above",
      lead_time: "领先崩盘 3-6 个月",
      description: "高收益债市场开始为大规模违约定价",
      triggered: hyOasInd.value > 450,
      distance: hyOasInd.value > 450 ? `已超出 ${(hyOasInd.value - 450).toFixed(0)} bps` : `距阈值 +${(450 - hyOasInd.value).toFixed(0)} bps`,
      proximity_pct: (hyOasInd.value / 450) * 100,
    },
    {
      id: "yield_curve",
      icon: "📉",
      title: "收益率倒挂",
      subtitle: "10Y-2Y 曲线",
      value: yieldCurveInd.value,
      display: yieldCurveInd.value_display,
      threshold: -30,
      threshold_display: "< -30 bps",
      threshold_direction: "below",
      lead_time: "领先衰退 12-18 个月",
      description: "最可靠的衰退预言，历史命中率 100%（1960年后）",
      triggered: yieldCurveInd.value < -30,
      distance: yieldCurveInd.value < -30 ? `已倒挂 ${(Math.abs(yieldCurveInd.value - (-30))).toFixed(0)} bps` : `距阈值 +${(yieldCurveInd.value - (-30)).toFixed(0)} bps`,
      proximity_pct: Math.max(0, (yieldCurveInd.value - 100) / (-30 - 100) * 100),
    },
  ];

  const nuclearAlert = sentinels.filter(s => s.triggered).length >= 2;

  return (
    <div className="space-y-4 p-4 bg-[var(--bg-base)] min-h-screen text-white font-mono">
      {/* Nuclear Alert at the very top if triggered */}
      {nuclearAlert && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-950/80 p-4 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.4)] mb-4">
          <div className="flex items-center gap-4 text-red-300 font-black text-xl">
            <span className="text-3xl">🚨</span>
            <span>最高警戒 — {sentinels.filter(s => s.triggered).length}/3 哨兵触发 · 综合分已失效 · 立即行动</span>
          </div>
          <div className="mt-3 text-[var(--accent-red)] text-sm font-medium font-mono">
            {sentinels.filter(s => s.triggered).map(s => s.subtitle).join(" + ")} 同时触发
          </div>
          <div className="mt-2 text-red-500 text-sm">
            历史数据：两哨兵同时触发后，市场平均在 2-8 个月内崩盘 20%+
          </div>
        </div>
      )}
      {/* Section Title */}
      <div className="flex items-center gap-4 mb-2">
        <span className="text-lg font-bold text-gray-100">📊 逃顶危险指数</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.border} ${sc.text} ${sc.bg}`}>
          实时监控
        </span>
      </div>

      {/* TOP ROW: Left Score + Right Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono">

        {/* LEFT: Score Panel */}
        <div className={`rounded-2xl border ${sc.border} ${sc.bg} p-4 flex flex-col items-center`}>
          <SemiCircleGauge score={data.score} level={data.signal_level} />
          
          {/* Score number */}
          <div className={`text-5xl font-black font-mono ${sc.text} mt-1`}>
            {data.score.toFixed(1)}
          </div>
          <div className={`text-lg font-semibold ${sc.text} mt-1`}>
            {data.signal}
          </div>
          
          {/* Score bar */}
          <div className="w-full mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${data.score}%`, background: `linear-gradient(to right, var(--accent-blue), var(--accent-blue), var(--accent-blue), var(--accent-blue))` }} />
          </div>
          <div className="flex justify-between w-full text-[10px] text-gray-600 mt-0.5">
            <span>🟢 安全</span><span>🟡 警戒</span><span>🟠 预警</span><span>🔴 危险</span>
          </div>

          {/* Dynamic score */}
          <div className="mt-4 w-full rounded-lg bg-[var(--bg-base)]/30 border border-gray-800 p-4 space-y-4">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">当前市场环境</span>
              <span className={`font-semibold ${regimeColors[data.regime] || "text-gray-300"}`}>
                {regimeEmoji[data.regime]} {data.regime_label}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">置信度</span>
              <span className="text-gray-300 font-mono">{(data.regime_confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">动态加权分</span>
              <span className="text-gray-200 font-mono font-mono">
                {data.dynamic_score.toFixed(1)}
                <span className={`ml-1 text-[10px] ${data.regime_impact >= 0 ? "text-[var(--accent-red)]" : "text-[var(--accent-green)]"}`}>
                  {data.regime_impact >= 0 ? "+" : ""}{data.regime_impact.toFixed(1)}
                </span>
              </span>
            </div>
          </div>

          {/* Top risks */}
          <div className="mt-3 w-full">
            <div className="text-[11px] text-gray-500 mb-1.5">主要风险来源</div>
            {data.top_risks.map((r, i) => (
              <div key={i} className="flex items-start gap-4.5 text-[11px] text-gray-300 mb-1">
                <span className="text-[var(--accent-red)] mt-0.5">▸</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Action Checklist */}
        <div className="rounded-2xl border border-gray-700 bg-gray-900/50 p-4 flex flex-col gap-4">
          <div className="text-sm font-semibold text-gray-200 font-mono">⚡ 行动建议</div>
          
          {/* Regime evidence */}
          <div className="rounded-lg bg-[var(--bg-base)]/40 border border-gray-800 p-4">
            <div className="text-[11px] text-gray-500 mb-2">环境识别依据</div>
            <div className="flex flex-wrap gap-4.5">
              {data.regime_evidence.map((e, i) => (
                <span key={i} className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700 font-mono">
                  {e}
                </span>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-4">
            {data.action_checklist.map((item, i) => {
              const icon = item.type === "do" ? "✅" : item.type === "watch" ? "⚠️" : "❌";
              const textColor = item.type === "do" ? "text-green-300" : item.type === "watch" ? "text-yellow-300" : "text-red-300";
              return (
                <div key={i} className="flex items-start gap-4 text-sm">
                  <span className="mt-0.5 flex-shrink-0 font-mono">{icon}</span>
                  <span className={textColor}>{item.text}</span>
                </div>
              );
            })}
          </div>

          {/* Trip wires */}
          <div>
            <div className="text-[11px] text-gray-500 mb-2">🚨 升级触发条件（任一触发→立即提升警戒）</div>
            <div className="space-y-4.5">
              {data.trip_wires.map((tw, i) => (
                <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs border
                  ${tw.triggered ? "bg-red-900/40 border-red-600 text-red-300" : "bg-gray-800/50 border-gray-700 text-gray-400"}`}>
                  <div>
                    <span className={tw.triggered ? "text-red-300 font-semibold" : "text-gray-300"}>{tw.condition}</span>
                    <span className="text-gray-600 ml-2 text-[10px] font-mono">{tw.description}</span>
                  </div>
                  <span className={`font-mono text-[11px] ${tw.triggered ? "text-red-300" : "text-[var(--accent-green)]"}`}>
                    {tw.triggered ? "⚡已触发" : `现值 ${tw.current_value}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SENTINEL SECTION */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-4">
        <SentinelSection sentinels={sentinels} />
      </div>

      {/* BOTTOM: 18 Factor Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-300">📈 18大指标详情</span>
          <span className="text-[11px] text-gray-600">按贡献度排序 · 横向滑动查看全部</span>
        </div>
        
        {/* Category filter tabs */}
        <CategoryFilteredCards indicators={sortedIndicators} />
      </div>
    </div>
  );
}
