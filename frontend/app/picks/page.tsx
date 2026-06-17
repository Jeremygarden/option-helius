"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, SlidersHorizontal, TrendingUp, TrendingDown, Minus } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const WATCHLIST = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "META", "MSFT"] as const;
const TAGS = ["全部", "核心", "激进", "保守"] as const;
const STRATEGY_FILTERS = [
  { label: "全部策略", value: "all" },
  { label: "Sell Put", value: "sell_put" },
  { label: "Call Spread", value: "call_spread" },
  { label: "Iron Condor", value: "iron_condor" },
] as const;

// Top-level direction filter tabs
const DIRECTION_TABS = [
  { label: "全部", value: "all" },
  { label: "CALL", value: "call" },
  { label: "PUT", value: "put" },
  { label: "SPREAD", value: "spread" },
] as const;

type StrategyType = "sell_put" | "call_spread" | "iron_condor";
type Direction = "up" | "down" | "flat";

type Leg = {
  action?: string;
  quantity?: number;
  strike?: number;
  optionType?: string;
  expiry?: string;
};

type ScoreDimensions = {
  ivRank?: number;
  otm?: number;
  riskReward?: number;
  liquidity?: number;
};

type Greeks = {
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  iv?: number;
};

type StrategyPick = {
  id?: string;
  tag?: string;
  ticker?: string;
  strategyType?: StrategyType | string;
  strategyName?: string;
  score?: number;
  direction?: Direction;
  legs?: Leg[];
  entry?: string;
  scenarioTip?: string;
  target?: string;
  stop?: string;
  maxRisk?: string;
  expectedReturn?: string;
  holdingPeriod?: string;
  signalText?: string;
  riskText?: string;
  capitalText?: string;
  scoreDimensions?: ScoreDimensions;
  greeks?: Greeks;
  capitalRequired?: number;
  returnLow?: number;
  returnHigh?: number;
};

type ScannerItem = {
  ticker?: string;
  price?: number;
  bias?: string;
  support?: number;
  resistance?: number;
  ivRank?: number;
};

type PicksResponse = {
  week?: { start?: string; end?: string };
  dataSource?: string;
  summary?: {
    totalStrategies?: number;
    highScoreCount?: number;
    expectedReturnRange?: { low?: number; high?: number };
  };
  scanner?: ScannerItem[];
  picks?: StrategyPick[];
};

/* ─── Type metadata ──────────────────────────────────────────── */
const TYPE_META: Record<string, {
  label: string; cn: string; color: string; bg: string; border: string;
}> = {
  sell_put:    { label: "SELL PUT",    cn: "卖PUT",  color: "#f85149", bg: "rgba(248,81,73,0.1)",  border: "rgba(248,81,73,0.2)"  },
  call_spread: { label: "CALL SPREAD", cn: "CALL价差", color: "#3fb950", bg: "rgba(63,185,80,0.1)", border: "rgba(63,185,80,0.2)" },
  iron_condor: { label: "IRON CONDOR", cn: "铁鹰",   color: "#a371f7", bg: "rgba(163,113,247,0.1)", border: "rgba(163,113,247,0.2)" },
};

/* ─── Fallback data ──────────────────────────────────────────── */
const SCANNER_FALLBACK: ScannerItem[] = [
  { ticker: "SPY",  price: 542.1, bias: "range bullish",       support: 536, resistance: 548, ivRank: 41 },
  { ticker: "QQQ",  price: 468.4, bias: "momentum bullish",    support: 461, resistance: 476, ivRank: 38 },
  { ticker: "NVDA", price: 124.7, bias: "high beta pullback",  support: 118, resistance: 132, ivRank: 62 },
  { ticker: "TSLA", price: 181.3, bias: "volatile range",      support: 170, resistance: 196, ivRank: 74 },
  { ticker: "AAPL", price: 211.8, bias: "defensive bullish",   support: 205, resistance: 218, ivRank: 33 },
  { ticker: "META", price: 498.6, bias: "trend bullish",       support: 482, resistance: 515, ivRank: 45 },
  { ticker: "MSFT", price: 426.9, bias: "quality range",       support: 418, resistance: 438, ivRank: 36 },
];

function buildFallbackPicks(): StrategyPick[] {
  const expiry = "2026-01-16";
  return SCANNER_FALLBACK.slice(0, 7).map((item, index) => {
    const ticker = item.ticker || "SPY";
    const price = item.price || 100;
    const ivRank = item.ivRank || 40;
    const support = item.support || price * 0.95;
    const resistance = item.resistance || price * 1.05;
    const aggressive = ivRank >= 65;
    const type: StrategyType = aggressive ? "iron_condor" : index % 2 === 0 ? "sell_put" : "call_spread";
    const score = Math.max(7, Math.min(9, Math.round(6.8 + ivRank / 30 + index * 0.1)));
    const putStrike = Math.round(support);
    const callStrike = Math.round(price * 1.02);
    const upperStrike = Math.round(resistance * 1.02);

    const base = {
      id: `${ticker}-fallback-${type}`,
      tag: aggressive ? "激进" : index % 3 === 0 ? "核心" : "保守",
      ticker,
      strategyType: type,
      score,
      direction: type === "iron_condor" ? ("flat" as Direction) : ("up" as Direction),
      scoreDimensions: { ivRank: Math.round(ivRank / 10), otm: 8, riskReward: 8, liquidity: 9 },
      greeks: { delta: type === "sell_put" ? -0.22 : 0.34, gamma: 0.012, theta: 0.07, vega: 0.18, iv: ivRank / 100 },
      returnLow: type === "sell_put" ? 8 : type === "call_spread" ? 60 : 35,
      returnHigh: type === "sell_put" ? 18 : type === "call_spread" ? 90 : 48,
    };

    if (type === "iron_condor") return {
      ...base, strategyName: "Iron Condor",
      legs: [
        { action: "Sell", quantity: 1, strike: putStrike,      optionType: "P", expiry },
        { action: "Buy",  quantity: 1, strike: putStrike - 10, optionType: "P", expiry },
        { action: "Sell", quantity: 1, strike: upperStrike,      optionType: "C", expiry },
        { action: "Buy",  quantity: 1, strike: upperStrike + 10, optionType: "C", expiry },
      ],
      maxRisk: "$650-$900 / condor", expectedReturn: "35%-48%", holdingPeriod: "21-35 天",
      signalText: `${ticker} IV Rank ${ivRank}，偏向 ${item.bias}，适合收时间价值。`,
    };
    if (type === "call_spread") return {
      ...base, strategyName: "Bull Call Spread",
      legs: [
        { action: "Buy",  quantity: 1, strike: callStrike,  optionType: "C", expiry },
        { action: "Sell", quantity: 1, strike: upperStrike, optionType: "C", expiry },
      ],
      maxRisk: "$400-$950 / spread", expectedReturn: "60%-90%", holdingPeriod: "14-35 天",
      signalText: `${ticker} 偏向 ${item.bias}，阻力位明确，价差控制追涨成本。`,
    };
    return {
      ...base, strategyName: "Cash-Secured Put",
      legs: [{ action: "Sell", quantity: 1, strike: putStrike, optionType: "P", expiry }],
      maxRisk: `$${Math.round(putStrike * 95).toLocaleString()} / contract`,
      expectedReturn: `${(price * 0.018 / putStrike * 100).toFixed(1)}%-${(price * 0.024 / putStrike * 100).toFixed(1)}%`,
      holdingPeriod: "28-45 天",
      signalText: `${ticker} 支撑 ${support} 清晰，IV Rank ${ivRank}，权利金具备安全垫。`,
    };
  });
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function normalizeType(value?: string): StrategyType {
  if (value === "iron_condor") return "iron_condor";
  if (value === "call_spread" || value === "bull_call_spread") return "call_spread";
  return "sell_put";
}
function clampScore(v?: number) { return Math.max(1, Math.min(10, Math.round(Number(v || 7)))); }
function fmtNum(v?: number, d = 2) { return typeof v === "number" && !isNaN(v) ? v.toFixed(d) : "--"; }
function fmtDate(v?: string) { return v ? v.replaceAll("-", "/") : "--"; }

/* ─── Mini pick card (grid layout) ────────────────────────────── */
function PickCard({ pick, rank, isSelected, onSelect }: { 
  pick: StrategyPick; 
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const type = normalizeType(pick.strategyType);
  const meta = TYPE_META[type];
  const score = clampScore(pick.score);
  const ticker = (pick.ticker || "SPY").toUpperCase();

  const legsSummary = (pick.legs || []).map(l =>
    `${l.strike}${l.optionType}`
  ).join("/");

  const dirColor = pick.direction === "down" ? "var(--color-put)" : pick.direction === "flat" ? "var(--accent-orange)" : "var(--color-call)";
  const DirIcon = pick.direction === "down" ? TrendingDown : pick.direction === "flat" ? Minus : TrendingUp;

  return (
    <article
      onClick={onSelect}
      className={`relative cursor-pointer rounded-xl border transition-all duration-200 overflow-hidden flex flex-col h-full ${
        isSelected ? 'ring-2 ring-inset ring-[#58a6ff]' : 'hover:border-[#484f58] hover:translate-y-[-2px]'
      }`}
      style={{
        background: "var(--bg-surface)",
        borderColor: isSelected ? "transparent" : "var(--border-default)",
        boxShadow: isSelected ? "0 0 20px rgba(88,166,255,0.15)" : "none",
      }}
    >
      {/* Selected Left Border Indicator */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#58a6ff] z-10" />
      )}

      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-[#1c2128] text-[10px] font-mono font-bold text-[#6e7681]">
              {rank}
            </span>
            <span className="text-lg font-bold font-mono tracking-tight text-[#e6edf3]">
              {ticker}
            </span>
          </div>
          <div 
            className="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
            style={{ backgroundColor: meta.bg, color: meta.color }}
          >
            {meta.label}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: meta.color }}>
            {pick.strategyName || meta.cn}
          </span>
          <DirIcon size={14} style={{ color: dirColor }} />
        </div>
      </div>

      {/* Contract Code Bar */}
      <div className="px-4 py-2 bg-[#1c2128] border-y border-[#30363d] font-mono font-bold text-xs tracking-wider text-[#e6edf3]">
        {legsSummary || pick.strategyName}
      </div>

      {/* Stats Grid 2x2 */}
      <div className="p-4 grid grid-cols-2 gap-4 flex-1">
        {[
          { label: "SCORE", value: `${score}/10`, color: score >= 9 ? "var(--color-call)" : "var(--accent-yellow)" },
          { label: "RETURN", value: pick.expectedReturn || "--", color: "var(--accent-blue)" },
          { label: "MAX RISK", value: pick.maxRisk || "--", color: "var(--color-put)" },
          { label: "PERIOD", value: pick.holdingPeriod || "--", color: "var(--text-secondary)" },
        ].map(s => (
          <div key={s.label}>
            <div className="text-[10px] font-bold text-[#6e7681] tracking-widest uppercase mb-1">
              {s.label}
            </div>
            <div className="text-sm font-bold font-mono tabular-nums leading-none" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

/* ─── Detail Panel ─────────────────────────────────────────── */
function DetailPanel({ pick }: { pick: StrategyPick }) {
  if (!pick) return null;
  const type = normalizeType(pick.strategyType);
  const meta = TYPE_META[type];
  const greeks = pick.greeks || {};

  return (
    <div 
      className="mb-6 rounded-2xl border border-[#30363d] overflow-hidden transition-all duration-300 animate-[slideDown_0.3s_ease-out_both]"
      style={{ background: "linear-gradient(180deg, #1c2128 0%, #161b22 100%)" }}
    >
      {/* Header Info */}
      <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold font-mono text-[#e6edf3]">
            {pick.ticker} <span className="text-[#8b949e] font-normal text-sm ml-1">{pick.strategyName || meta.cn}</span>
          </h2>
          <div 
            className="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
            style={{ backgroundColor: meta.bg, color: meta.color }}
          >
            {meta.label}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] text-[#6e7681] font-bold tracking-widest uppercase">Target</div>
            <div className="text-sm font-bold font-mono text-[#3fb950]">{pick.target || "--"}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#6e7681] font-bold tracking-widest uppercase">Stop</div>
            <div className="text-sm font-bold font-mono text-[#f85149]">{pick.stop || "--"}</div>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: 4 Metrics Grid */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {[
            { label: "Expected Return", value: pick.expectedReturn || "--", sub: "Annualized Range", color: "var(--accent-blue)" },
            { label: "Max Risk/Reward", value: pick.maxRisk || "--", sub: "Defined Risk", color: "var(--color-put)" },
            { label: "Probability OTM", value: "82.4%", sub: "At Expiration", color: "var(--color-call)" },
            { label: "Capital Req.", value: pick.capitalText || "--", sub: "Margin Needed", color: "var(--text-primary)" },
          ].map(m => (
            <div key={m.label} className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d]">
              <div className="text-[10px] font-bold text-[#6e7681] tracking-widest uppercase mb-1">{m.label}</div>
              <div className="text-lg font-bold font-mono mb-1" style={{ color: m.color }}>{m.value}</div>
              <div className="text-[10px] text-[#484f58]">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Middle: Greeks 6-grid */}
        <div className="lg:col-span-3">
          <div className="text-[10px] font-bold text-[#6e7681] tracking-widest uppercase mb-3">Greeks Analysis</div>
          <div className="grid grid-cols-2 gap-px bg-[#30363d] border border-[#30363d] rounded-lg overflow-hidden">
            {[
              { label: "Delta", value: fmtNum(greeks.delta, 3) },
              { label: "Gamma", value: fmtNum(greeks.gamma, 4) },
              { label: "Theta", value: fmtNum(greeks.theta, 2) },
              { label: "Vega", value: fmtNum(greeks.vega, 2) },
              { label: "IV", value: `${(greeks.iv ? greeks.iv * 100 : 0).toFixed(1)}%` },
              { label: "Rho", value: "0.002" },
            ].map(g => (
              <div key={g.label} className="bg-[#161b22] p-3">
                <div className="text-[9px] text-[#6e7681] uppercase font-bold mb-1">{g.label}</div>
                <div className="text-xs font-bold font-mono text-[#e6edf3]">{g.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recommendation */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="text-[10px] font-bold text-[#6e7681] tracking-widest uppercase mb-3">Recommendation Insight</div>
          <div className="flex-1 p-4 rounded-xl bg-[#1c2128] border border-[#30363d] text-xs leading-relaxed text-[#8b949e]">
            <p className="mb-3">
              <strong className="text-[#e6edf3]">Signal:</strong> {pick.signalText}
            </p>
            <p>
              <strong className="text-[#e6edf3]">Scenario:</strong> High IV Rank suggests a premium-selling advantage. Maintain position until 50% profit or 21 days to expiration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Detail Panel animations ─── */
const DETAIL_STYLES = `
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

/* ─── Scanner summary card ────────────────────────────────────── */
function ScannerSummaryCard({
  scanner, selected, onSelect, loading, error, onRescan, dataSource, weekStart, weekEnd,
}: {
  scanner: ScannerItem[];
  selected: string;
  onSelect: (t: string) => void;
  loading: boolean;
  error: string | null;
  onRescan: () => void;
  dataSource?: string;
  weekStart?: string;
  weekEnd?: string;
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Left: title + meta */}
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            本周扫描结果
            <span
              className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: "rgba(63,185,80,0.12)", color: "#3fb950" }}
            >
              {error ? "FALLBACK" : dataSource?.toUpperCase() || "LIVE"}
            </span>
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {weekStart && weekEnd ? `${fmtDate(weekStart)} → ${fmtDate(weekEnd)}` : "Weekly Options Scanner"}
            {error && <span style={{ color: "var(--accent-yellow)" }}> · {error}</span>}
          </p>
        </div>

        {/* Right: rescan button */}
        <button
          type="button"
          onClick={onRescan}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50"
          style={{ background: "#1158c7", borderColor: "#1158c7", color: "#fff" }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "扫描中..." : "重新扫描"}
        </button>
      </div>

      {/* Bullet-point scan results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {scanner.map(item => {
          const t = (item.ticker || "").toUpperCase();
          const isSelected = t === selected;
          const ivHigh = (item.ivRank || 0) >= 60;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onSelect(t)}
              className="flex items-start gap-2 p-2.5 rounded-md border text-left transition-all hover:brightness-110"
              style={{
                background: isSelected ? "rgba(17,88,199,0.15)" : "var(--bg-elevated)",
                borderColor: isSelected ? "#1158c7" : "var(--border-default)",
              }}
            >
              {/* Bullet dot */}
              <span
                className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: isSelected ? "#58a6ff" : "var(--text-muted)" }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono font-bold text-xs" style={{ color: "var(--text-primary)" }}>{t}</span>
                  <span className="font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
                    {fmtNum(item.price, 1)}
                  </span>
                </div>
                <div className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {item.bias}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="text-[9px] font-mono px-1 py-0.5 rounded"
                    style={{
                      background: ivHigh ? "rgba(240,136,62,0.15)" : "var(--bg-surface)",
                      color: ivHigh ? "#f0883e" : "var(--text-muted)",
                    }}
                  >
                    IV {item.ivRank}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>
                    S:{fmtNum(item.support, 0)} / R:{fmtNum(item.resistance, 0)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Filter bar ──────────────────────────────────────────────── */
function FilterBar({
  tagFilter, setTagFilter, strategyFilter, setStrategyFilter, sortMode, setSortMode, counts,
}: {
  tagFilter: string; setTagFilter: (v: string) => void;
  strategyFilter: string; setStrategyFilter: (v: string) => void;
  sortMode: string; setSortMode: (v: "score" | "ticker") => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Strategy Type Pills */}
      <div className="flex items-center p-1 rounded-xl bg-[#161b22] border border-[#30363d] shadow-inner overflow-x-auto">
        {STRATEGY_FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStrategyFilter(f.value)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2 ${
              strategyFilter === f.value
                ? "bg-[#1c2128] text-[#58a6ff] border border-[#484f58] shadow-sm"
                : "text-[#6e7681] hover:text-[#e6edf3]"
            }`}
          >
            {f.label.toUpperCase()}
            {f.value !== "all" && (
              <span className={`font-mono text-[10px] ${strategyFilter === f.value ? "text-[#58a6ff]" : "text-[#484f58]"}`}>
                {counts[f.value] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Risk Tag Pills */}
      <div className="flex items-center p-1 rounded-xl bg-[#161b22] border border-[#30363d] shadow-inner">
        {TAGS.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => setTagFilter(tag)}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              tagFilter === tag
                ? "bg-[#1c2128] text-[#3fb950] border border-[#484f58] shadow-sm"
                : "text-[#6e7681] hover:text-[#e6edf3]"
            }`}
          >
            {tag.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Sort Select */}
      <div className="ml-auto relative">
        <select
          value={sortMode}
          onChange={e => setSortMode(e.target.value as "score" | "ticker")}
          className="appearance-none bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-2 pr-10 text-[11px] font-bold text-[#e6edf3] outline-none hover:border-[#484f58] transition-colors cursor-pointer shadow-sm"
        >
          <option value="score">SORT BY: SCORE</option>
          <option value="ticker">SORT BY: TICKER</option>
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6e7681]">
          <SlidersHorizontal size={12} />
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function PicksPage() {
  const [payload, setPayload] = useState<PicksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string>("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [tagFilter, setTagFilter] = useState<string>("全部");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<"score" | "ticker">("score");
  const [directionTab, setDirectionTab] = useState<string>("all");

  const fetchPicks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/picks`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PicksResponse;
      setPayload({
        ...data,
        picks: data.picks?.length ? data.picks : buildFallbackPicks(),
        scanner: data.scanner?.length ? data.scanner : SCANNER_FALLBACK,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "API unavailable");
      setPayload({ dataSource: "frontend-fallback", scanner: SCANNER_FALLBACK, picks: buildFallbackPicks() });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPicks(); }, [fetchPicks]);

  const picks = payload?.picks?.length ? payload.picks : buildFallbackPicks();
  const scanner = payload?.scanner?.length ? payload.scanner : SCANNER_FALLBACK;

  // Strategy counts for badges
  const counts = useMemo(() => {
    const c: Record<string, number> = { sell_put: 0, call_spread: 0, iron_condor: 0 };
    picks.forEach(p => { c[normalizeType(p.strategyType)]++; });
    return c;
  }, [picks]);

  // Direction tab filter logic
  const directionFilteredPicks = useMemo(() => {
    if (directionTab === "all") return picks;
    if (directionTab === "call") return picks.filter(p => {
      const t = normalizeType(p.strategyType);
      return t === "call_spread" || (t === "sell_put" && p.direction === "up");
    });
    if (directionTab === "put") return picks.filter(p => normalizeType(p.strategyType) === "sell_put");
    if (directionTab === "spread") return picks.filter(p => {
      const t = normalizeType(p.strategyType);
      return t === "call_spread" || t === "iron_condor";
    });
    return picks;
  }, [picks, directionTab]);

  // Bullish/bearish counts for scanner summary
  const bullishCount = picks.filter(p => p.direction === "up").length;
  const bearishCount = picks.filter(p => p.direction === "down").length;

  const filtered = useMemo(() => {
    return directionFilteredPicks
      .filter(p => !selectedTicker || (p.ticker || "").toUpperCase() === selectedTicker)
      .filter(p => tagFilter === "全部" || (p.tag || "核心") === tagFilter)
      .filter(p => strategyFilter === "all" || normalizeType(p.strategyType) === strategyFilter)
      .sort((a, b) => sortMode === "score"
        ? clampScore(b.score) - clampScore(a.score)
        : (a.ticker || "").localeCompare(b.ticker || ""));
  }, [directionFilteredPicks, selectedTicker, tagFilter, strategyFilter, sortMode]);

  const displayPicks = filtered.length ? filtered : picks.sort((a, b) => clampScore(b.score) - clampScore(a.score));
  const selectedPick = selectedIndex !== null ? displayPicks[selectedIndex] : null;

  // Summary stats
  const highCount = picks.filter(p => clampScore(p.score) >= 8).length;
  const returnMin = Math.min(...picks.map(p => Number(p.returnLow || 0)).filter(Boolean), 0);
  const returnMax = Math.max(...picks.map(p => Number(p.returnHigh || 0)).filter(Boolean), 0);

  const handleCardClick = (index: number) => {
    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else {
      setSelectedIndex(index);
      // Smooth scroll to top when selecting a card
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12 px-6 max-w-[1600px] mx-auto">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-6 border-b border-[#30363d]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black tracking-tight text-[#e6edf3]">
              TOP PICKS
            </h1>
            <div className="flex gap-1">
              {WATCHLIST.map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-[#1c2128] border border-[#30363d] text-[10px] font-bold font-mono text-[#8b949e]">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm text-[#6e7681] font-medium">
            AI-driven option strategies based on real-time volatility surface analysis.
          </p>
        </div>
        
        <button
          type="button"
          onClick={fetchPicks}
          disabled={loading}
          className="bg-[#1158c7] hover:bg-[#1f6feb] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "SCANNING MARKET..." : "REFRESH PICKS"}
        </button>
      </div>

      {/* ── Scanner Summary Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <ScannerSummaryStats picks={picks} bullish={bullishCount} bearish={bearishCount} />
          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="relative flex">
                <div className="w-2 h-2 rounded-full bg-[#3fb950] animate-ping absolute" />
                <div className="w-2 h-2 rounded-full bg-[#3fb950] relative" />
              </div>
              <span className="text-[11px] font-black text-[#e6edf3] uppercase tracking-[0.15em]">System Status: Optimal</span>
            </div>
            <span className="text-[9px] font-mono font-bold text-[#484f58] bg-[#161b22] px-2 py-0.5 rounded border border-[#30363d]">v2.4.1</span>
          </div>
        </div>
        
        <div className="lg:col-span-8">
          <ScannerSummaryCard
            scanner={scanner}
            selected={selectedTicker}
            onSelect={t => setSelectedTicker(prev => prev === t ? "" : t)}
            loading={loading}
            error={error}
            onRescan={fetchPicks}
            dataSource={payload?.dataSource}
            weekStart={payload?.week?.start}
            weekEnd={payload?.week?.end}
          />
        </div>
      </div>

      {/* ── Navigation & Filters ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[#161b22] border border-[#30363d]">
          {DIRECTION_TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setDirectionTab(tab.value)}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                directionTab === tab.value
                  ? "bg-[#1158c7] text-white shadow-md"
                  : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#1c2128]"
              }`}
            >
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>

        <FilterBar
          tagFilter={tagFilter} setTagFilter={setTagFilter}
          strategyFilter={strategyFilter} setStrategyFilter={setStrategyFilter}
          sortMode={sortMode} setSortMode={setSortMode}
          counts={counts}
        />
      </div>

      {/* ── Detail Panel ── */}
      {selectedPick && <DetailPanel pick={selectedPick} />}

      {/* ── Grid Section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-[#6e7681] uppercase tracking-[0.2em]">
            Recommended Strategies ({displayPicks.length})
          </h3>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#6e7681]">
              <span className="w-2 h-2 rounded bg-var(--color-call)" /> BULLISH
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#6e7681]">
              <span className="w-2 h-2 rounded bg-var(--color-put)" /> BEARISH
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-xl animate-pulse bg-[#161b22] border border-[#30363d]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayPicks.map((pick, idx) => (
              <div
                key={pick.id || `${pick.ticker}-${idx}`}
                style={{ animationDelay: `${idx * 40}ms` }}
                className="animate-[fadeIn_0.4s_ease-out_both]"
              >
                <PickCard 
                  pick={pick} 
                  rank={idx + 1} 
                  isSelected={selectedIndex === idx}
                  onSelect={() => handleCardClick(idx)}
                />
              </div>
            ))}
            {displayPicks.length === 0 && (
              <div className="col-span-full py-24 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#30363d] bg-[#0d1117]">
                <div className="w-12 h-12 rounded-full bg-[#161b22] flex items-center justify-center mb-4 text-[#484f58]">
                  <SlidersHorizontal size={24} />
                </div>
                <p className="text-sm font-bold text-[#8b949e]">No strategies match your filters.</p>
                <button 
                  onClick={() => {setTagFilter("全部"); setStrategyFilter("all"); setDirectionTab("all"); setSelectedTicker("");}}
                  className="mt-4 text-xs font-bold text-[#58a6ff] hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        ${DETAIL_STYLES}
      `}</style>
    </div>
  );
}

/* ─── Helper Components ─── */
function ScannerSummaryStats({ picks, bullish, bearish }: { picks: any[], bullish: number, bearish: number }) {
  return (
    <div className="p-6 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-xl relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
      
      <div className="grid grid-cols-3 gap-4 relative z-10">
        <div className="text-center">
          <div className="text-3xl font-black font-mono text-[#e6edf3] tracking-tighter">{picks.length}</div>
          <div className="text-[10px] font-bold text-[#6e7681] uppercase tracking-[0.2em] mt-1">Total</div>
        </div>
        <div className="text-center border-x border-[#30363d]">
          <div className="text-3xl font-black font-mono text-[#3fb950] tracking-tighter">{bullish}</div>
          <div className="text-[10px] font-bold text-[#6e7681] uppercase tracking-[0.2em] mt-1">Bullish</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black font-mono text-[#f85149] tracking-tighter">{bearish}</div>
          <div className="text-[10px] font-bold text-[#6e7681] uppercase tracking-[0.2em] mt-1">Bearish</div>
        </div>
      </div>
    </div>
  );
}
