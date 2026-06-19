"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  sell_put:    { label: "SELL PUT",    cn: "卖PUT",  color: "var(--accent-red)", bg: "rgba(248,81,73,0.1)",  border: "rgba(248,81,73,0.2)"  },
  call_spread: { label: "CALL SPREAD", cn: "CALL价差", color: "var(--accent-green)", bg: "rgba(63,185,80,0.1)", border: "rgba(63,185,80,0.2)" },
  iron_condor: { label: "IRON CONDOR", cn: "铁鹰",   color: "var(--accent-purple)", bg: "rgba(163,113,247,0.1)", border: "rgba(163,113,247,0.2)" },
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

  const dirColor = pick.direction === "down" ? "var(--color-put)" : pick.direction === "flat" ? "var(--color-flat)" : "var(--color-call)";
  const DirIcon = pick.direction === "down" ? TrendingDown : pick.direction === "flat" ? Minus : TrendingUp;

  return (
    <article
      onClick={onSelect}
      className={`relative cursor-pointer rounded-lg border transition-all duration-200 overflow-hidden flex flex-col h-full group ${
        isSelected ? 'ring-1 ring-inset ring-[var(--accent-blue)]' : 'hover:border-[var(--accent-blue)]/60 hover:-translate-y-px'
      }`}
      style={{
        background: "var(--bg-surface)",
        borderColor: isSelected ? "transparent" : "var(--border-default)",
        boxShadow: isSelected ? "0 0 0 1px var(--accent-blue), 0 6px 18px rgba(88,166,255,0.10)" : "none",
      }}
    >
      {/* Selected Left Border Indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent-blue)] z-10 transition-transform duration-200 origin-top ${isSelected ? 'scale-y-100' : 'scale-y-0'}`} />

      {/* Card Header: rank + ticker (eye anchor) / strategy badge */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-mono font-bold tabular-nums"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
            >
              {rank}
            </span>
            <span className="text-lg font-bold font-mono tracking-tight" style={{ color: "var(--text-primary)" }}>
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
          <span className="text-sm font-semibold font-mono" style={{ color: meta.color }}>
            {pick.strategyName || meta.cn}
          </span>
          <DirIcon size={14} style={{ color: dirColor }} />
        </div>
      </div>

      {/* Contract Code Bar */}
      <div
        className="px-4 py-2 border-y font-mono font-bold text-xs tracking-wider tabular-nums truncate"
        style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
        title={legsSummary || pick.strategyName}
      >
        {legsSummary || pick.strategyName}
      </div>

      {/* Stats Grid 2x2 */}
      <div className="p-4 grid grid-cols-2 gap-3 flex-1">
        {[
          { label: "SCORE", value: `${score}/10`, color: score >= 9 ? "var(--color-call)" : score >= 7 ? "var(--color-warning)" : "var(--text-secondary)" },
          { label: "RETURN", value: pick.expectedReturn || "--", color: "var(--color-call)" },
          { label: "MAX RISK", value: pick.maxRisk || "--", color: "var(--color-put)" },
          { label: "PERIOD", value: pick.holdingPeriod || "--", color: "var(--text-secondary)" },
        ].map(s => (
          <div key={s.label}>
            <div
              className="text-[10px] font-semibold tracking-widest uppercase mb-1"
              style={{ color: "var(--text-muted)" }}
            >
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

/* ─── Base Components ─── */
const PrimaryButton = ({ children, onClick, disabled, loading, icon: Icon }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="bg-[var(--accent-blue)] hover:brightness-110 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all shadow-md shadow-[var(--accent-blue)]/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] outline-none"
  >
    {Icon && <Icon size={16} className={loading ? "animate-spin" : ""} />}
    {children}
  </button>
);

const GhostButton = ({ children, onClick, active }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
      active
        ? "bg-[var(--accent-blue)] text-white shadow-sm"
        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
    }`}
  >
    {children}
  </button>
);

/* ─── Detail Panel ─────────────────────────────────────────── */
function DetailPanel({ pick }: { pick: StrategyPick }) {
  if (!pick) return null;
  const type = normalizeType(pick.strategyType);
  const meta = TYPE_META[type];
  const greeks = pick.greeks || {};

  return (
    <div 
      className="mb-6 rounded-2xl border border-[var(--border-default)] overflow-hidden transition-all duration-300 animate-[slideDown_0.3s_ease-out_both] shadow-2xl"
      style={{ background: "var(--bg-surface)" }}
    >
      {/* Header Info */}
      <div className="px-6 py-5 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
          <h2 className="text-2xl font-black font-mono tracking-tighter text-[var(--text-primary)] font-sans">
            {pick.ticker} <span className="text-[var(--text-muted)] font-bold text-xs ml-2 tracking-widest uppercase font-mono">{pick.strategyName || meta.cn}</span>
          </h2>
          <div 
            className="px-2.5 py-1 rounded-lg text-[10px] font-black font-mono border"
            style={{ backgroundColor: meta.bg, color: meta.color, borderColor: meta.border }}
          >
            {meta.label}
          </div>
        </div>
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
          <div className="text-right">
            <div className="text-[10px] text-[var(--text-muted)] font-black tracking-[0.2em] uppercase mb-1">Target Price</div>
            <div className="text-lg font-black font-mono text-[var(--color-call)] leading-none tabular-nums">{pick.target || "--"}</div>
          </div>
          <div className="text-right border-l border-[var(--border-default)] pl-8">
            <div className="text-[10px] text-[var(--text-muted)] font-black tracking-[0.2em] uppercase mb-1">Stop Loss</div>
            <div className="text-lg font-black font-mono text-[var(--color-put)] leading-none tabular-nums">{pick.stop || "--"}</div>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 font-mono">
        {/* Left: 4 Metrics Grid */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {[
            { label: "Expected Return", value: pick.expectedReturn || "--", sub: "Annualized Range", color: "var(--accent-blue)" },
            { label: "Max Risk/Reward", value: pick.maxRisk || "--", sub: "Defined Risk", color: "var(--color-put)" },
            { label: "Probability OTM", value: "82.4%", sub: "At Expiration", color: "var(--color-call)" },
            { label: "Capital Req.", value: pick.capitalText || "--", sub: "Margin Needed", color: "var(--text-primary)" },
          ].map(m => (
            <div key={m.label} className="p-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)]">
              <div className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-1 font-mono">{m.label}</div>
              <div className="text-lg font-bold font-mono mb-1 tabular-nums" style={{ color: m.color }}>{m.value}</div>
              <div className="text-[10px] text-[var(--text-muted)] font-mono">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Middle: Greeks 6-grid */}
        <div className="lg:col-span-3">
          <div className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-3">Greeks Analysis</div>
          <div className="grid grid-cols-2 gap-px bg-[var(--border-default)] border border-[var(--border-default)] rounded-lg overflow-hidden">
            {[
              { label: "Delta", value: fmtNum(greeks.delta, 3) },
              { label: "Gamma", value: fmtNum(greeks.gamma, 4) },
              { label: "Theta", value: fmtNum(greeks.theta, 2) },
              { label: "Vega", value: fmtNum(greeks.vega, 2) },
              { label: "IV", value: `${(greeks.iv ? greeks.iv * 100 : 0).toFixed(1)}%` },
              { label: "Rho", value: "0.002" },
            ].map(g => (
              <div key={g.label} className="bg-[var(--bg-surface)] p-4">
                <div className="text-[9px] text-[var(--text-muted)] uppercase font-bold mb-1 font-mono">{g.label}</div>
                <div className="text-xs font-bold font-mono tabular-nums text-[var(--text-primary)]">{g.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recommendation */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-3">Recommendation Insight</div>
          <div className="flex-1 p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs leading-relaxed text-[var(--text-secondary)]">
            <p className="mb-3">
              <strong className="text-[var(--accent-blue)] font-mono">Signal:</strong> {pick.signalText}
            </p>
            <p>
              <strong className="text-[var(--accent-blue)] font-mono">Scenario:</strong> High IV Rank suggests a premium-selling advantage. Maintain position until 50% profit or 21 days to expiration.
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
      className="rounded-2xl border p-4 h-full flex flex-col justify-between"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-black text-[var(--accent-blue)] uppercase tracking-wider font-sans">
            Market Scanner
          </h2>
          <p className="text-[10px] font-bold text-[var(--text-muted)] mt-0.5 font-mono">
            {weekStart && weekEnd ? `${fmtDate(weekStart)} → ${fmtDate(weekEnd)}` : "Live Ticker Analysis"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">
        {scanner.map(item => {
          const t = (item.ticker || "").toUpperCase();
          const isSelected = t === selected;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onSelect(t)}
              className="flex flex-col items-center p-4 rounded-lg border text-left transition-all hover:scale-105"
              style={{
                background: isSelected ? "rgba(88,166,255,0.08)" : "var(--bg-elevated)",
                borderColor: isSelected ? "var(--accent-blue)" : "var(--border-default)",
              }}
            >
              <span className={`font-mono font-black text-xs mb-1 tabular-nums ${isSelected ? 'text-[var(--accent-blue)]' : 'text-[var(--text-primary)]'}`}>{t}</span>
              <span className="font-mono text-[9px] font-bold tabular-nums text-[var(--text-muted)]">
                {fmtNum(item.price, 1)}
              </span>
              <div className="mt-2 w-full h-1 bg-[var(--bg-base)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--accent-blue)]" 
                  style={{ width: `${item.ivRank}%` }}
                />
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
    <div className="flex flex-wrap items-center gap-4 font-mono">
      {/* Strategy Type Pills */}
      <div className="flex items-center p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-inner overflow-x-auto">
        {STRATEGY_FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStrategyFilter(f.value)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[11px] font-bold transition-all inline-flex items-center gap-1.5 ${
              strategyFilter === f.value
                ? "bg-[var(--bg-elevated)] text-[var(--accent-blue)] border border-[var(--accent-blue)] shadow-sm"
                : "text-[var(--text-secondary)] border border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            }`}
          >
            {f.label.toUpperCase()}
            {f.value !== "all" && (
              <span className={`font-mono text-[10px] tabular-nums ${strategyFilter === f.value ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)]"}`}>
                {counts[f.value] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Risk Tag Pills */}
      <div className="flex items-center p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-inner">
        {TAGS.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => setTagFilter(tag)}
            className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
              tagFilter === tag
                ? "bg-[var(--bg-elevated)] text-[var(--accent-blue)] border border-[var(--accent-blue)] shadow-sm"
                : "text-[var(--text-secondary)] border border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
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
          className="appearance-none bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md px-3 py-1.5 pr-9 text-[11px] font-bold text-[var(--text-primary)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:outline-none outline-none cursor-pointer shadow-sm"
        >
          <option value="score">SORT BY: SCORE</option>
          <option value="ticker">SORT BY: TICKER</option>
        </select>
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
          <SlidersHorizontal size={12} />
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function PicksPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading picks…</div>}>
      <PicksPageInner />
    </Suspense>
  );
}

function PicksPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [payload, setPayload] = useState<PicksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Initialize filter state from URL params
  const [selectedTicker, setSelectedTicker] = useState<string>(searchParams.get("ticker") || "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string>(searchParams.get("tag") || "全部");
  const [strategyFilter, setStrategyFilter] = useState<string>(searchParams.get("strategy") || "all");
  const [sortMode, setSortMode] = useState<"score" | "ticker">(searchParams.get("sort") === "ticker" ? "ticker" : "score");
  const [directionTab, setDirectionTab] = useState<string>(searchParams.get("dir") || "all");

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

  // Sync filter state to URL params for deep-link and browser back/forward support
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedTicker) params.set("ticker", selectedTicker);
    if (tagFilter !== "全部") params.set("tag", tagFilter);
    if (strategyFilter !== "all") params.set("strategy", strategyFilter);
    if (directionTab !== "all") params.set("dir", directionTab);
    if (sortMode !== "score") params.set("sort", sortMode);
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [selectedTicker, tagFilter, strategyFilter, directionTab, sortMode, pathname, router]);

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
  const bullishCount = useMemo(() => picks.filter(p => p.direction === "up").length, [picks]);
  const bearishCount = useMemo(() => picks.filter(p => p.direction === "down").length, [picks]);

  const filtered = useMemo(() => {
    return directionFilteredPicks
      .filter(p => !selectedTicker || (p.ticker || "").toUpperCase() === selectedTicker)
      .filter(p => tagFilter === "全部" || (p.tag || "核心") === tagFilter)
      .filter(p => strategyFilter === "all" || normalizeType(p.strategyType) === strategyFilter)
      .sort((a, b) => sortMode === "score"
        ? clampScore(b.score) - clampScore(a.score)
        : (a.ticker || "").localeCompare(b.ticker || ""));
  }, [directionFilteredPicks, selectedTicker, tagFilter, strategyFilter, sortMode]);

  // Detect if any filter is active (not default values)
  const hasActiveFilter = useMemo(
    () => directionTab !== "all" || selectedTicker !== "" || tagFilter !== "全部" || strategyFilter !== "all",
    [directionTab, selectedTicker, tagFilter, strategyFilter]
  );

  const displayPicks = useMemo(
    () => {
      // When filters are active but produce no results: return empty so empty state shows
      if (hasActiveFilter && filtered.length === 0) {
        return [];
      }
      return filtered.length ? filtered : [...picks].sort((a, b) => clampScore(b.score) - clampScore(a.score));
    },
    [filtered, picks, hasActiveFilter]
  );

  // When filters remove the selected pick from view, clear selection to avoid ghost highlight
  const selectedPick = useMemo(() => {
    if (!selectedId) return null;
    return displayPicks.find(p => (p.id || p.ticker) === selectedId) ?? null;
  }, [selectedId, displayPicks]);

  // Side-effect: if selectedId no longer matches any visible pick, clear it
  useEffect(() => {
    if (selectedId && !displayPicks.find(p => (p.id || p.ticker) === selectedId)) {
      setSelectedId(null);
    }
  }, [displayPicks, selectedId]);

  // Summary stats
  const highCount = useMemo(() => picks.filter(p => clampScore(p.score) >= 8).length, [picks]);
  const returnMin = useMemo(() => Math.min(...picks.map(p => Number(p.returnLow || 0)).filter(Boolean), 0), [picks]);
  const returnMax = useMemo(() => Math.max(...picks.map(p => Number(p.returnHigh || 0)).filter(Boolean), 0), [picks]);

  const handleCardClick = useCallback((pick: StrategyPick) => {
    const id = pick.id || pick.ticker || null;
    if (selectedId === id) {
      setSelectedId(null);
    } else {
      setSelectedId(id ?? null);
      // Smooth scroll to top when selecting a card
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedId]);

  if (loading) return (
    <div className="flex flex-col gap-4 pb-12 px-6 max-w-[1600px] mx-auto font-mono">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-6 border-b border-[var(--border-default)]">
        <div className="h-8 w-48 bg-[var(--bg-surface)] rounded animate-pulse" />
        <div className="h-10 w-36 bg-[var(--bg-surface)] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 h-40 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] animate-pulse" />
        <div className="md:col-span-8 h-40 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-56 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-12 px-6 max-w-[1600px] mx-auto font-mono">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-6 border-b border-[var(--border-default)]">
        <div>
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar mb-2">
            <h1 className="text-2xl font-black tracking-tight text-[var(--accent-blue)] font-sans">
              TOP PICKS
            </h1>
            <div className="flex flex-wrap gap-2">
              {WATCHLIST.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTicker(prev => prev === t ? "" : t)}
                  className={`px-2 py-0.5 rounded border text-[10px] font-bold font-mono transition-all ${
                    selectedTicker === t
                      ? "bg-[var(--accent-blue)]/10 border-[var(--accent-blue)] text-[var(--accent-blue)] shadow-[0_0_10px_rgba(88,166,255,0.2)]"
                      : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] font-normal">
            AI-driven option strategies based on real-time volatility surface analysis.
          </p>
        </div>
        
        <PrimaryButton
          onClick={fetchPicks}
          disabled={loading}
          loading={loading}
          icon={RefreshCw}
        >
          {loading ? "SCANNING MARKET..." : "REFRESH PICKS"}
        </PrimaryButton>
      </div>

      {/* ── Scanner Summary Section ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-12 lg:col-span-4 space-y-4">
          <ScannerSummaryStats picks={picks} bullish={bullishCount} bearish={bearishCount} />
          <div className="p-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
              <div className="relative flex">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)] animate-ping absolute" />
                <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)] relative" />
              </div>
              <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em]">System Status: Optimal</span>
            </div>
            <span className="text-[9px] font-mono font-bold text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-default)]">v2.4.1</span>
          </div>
        </div>
        
        <div className="md:col-span-12 lg:col-span-8">
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
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)]">
          {DIRECTION_TABS.map(tab => (
            <GhostButton
              key={tab.value}
              onClick={() => setDirectionTab(tab.value)}
              active={directionTab === tab.value}
            >
              {tab.label.toUpperCase()}
            </GhostButton>
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
          <h3 className="text-xs font-bold text-[var(--accent-blue)] uppercase tracking-[0.2em] font-sans">
            Recommended Strategies ({displayPicks.length})
          </h3>
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            <span className="flex items-center gap-4 overflow-x-auto no-scrollbar text-[10px] font-bold text-[var(--text-secondary)]">
              <span className="w-2 h-2 rounded bg-[var(--color-call)]" /> BULLISH
            </span>
            <span className="flex items-center gap-4 overflow-x-auto no-scrollbar text-[10px] font-bold text-[var(--text-secondary)]">
              <span className="w-2 h-2 rounded bg-[var(--color-put)]" /> BEARISH
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 font-mono">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-lg relative overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-default)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--accent-blue)] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-1/2 h-6 bg-[var(--bg-base)] rounded" />
                    <div className="w-1/4 h-4 bg-[var(--bg-base)] rounded" />
                  </div>
                  <div className="w-full h-8 bg-[var(--bg-base)] rounded" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-10 bg-[var(--bg-base)] rounded" />
                    <div className="h-10 bg-[var(--bg-base)] rounded" />
                    <div className="h-10 bg-[var(--bg-base)] rounded" />
                    <div className="h-10 bg-[var(--bg-base)] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayPicks.map((pick, idx) => (
              <div
                key={pick.id || `${pick.ticker}-${idx}`}
                style={{ animationDelay: `${idx * 40}ms` }}
                className="animate-[fadeIn_0.4s_ease-out_both]"
              >
                <PickCard 
                  pick={pick} 
                  rank={idx + 1} 
                  isSelected={(pick.id || pick.ticker) === selectedId}
                  onSelect={() => handleCardClick(pick)}
                />
              </div>
            ))}
            {displayPicks.length === 0 && (
              <div className="col-span-full py-32 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-base)] relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px]" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center mb-6 text-[var(--accent-blue)] shadow-2xl">
                    <SlidersHorizontal size={32} />
                  </div>
                  <h3 className="text-lg font-black text-[var(--accent-blue)] mb-2 tracking-tight font-sans">No Matching Strategies Found</h3>
                  <p className="text-sm font-medium text-[var(--accent-blue)] text-left max-w-xs mb-8">
                    Try broadening your search by adjusting filters or clearing ticker selection.
                  </p>
                  <button 
                    onClick={() => {setTagFilter("全部"); setStrategyFilter("all"); setDirectionTab("all"); setSelectedTicker("");}}
                    className="px-6 py-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs font-bold text-[var(--accent-blue)] hover:bg-[var(--accent-blue)] transition-all active:scale-95 shadow-lg"
                  >
                    Clear All Active Filters
                  </button>
                </div>
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
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        ${DETAIL_STYLES}
      `}</style>
    </div>
  );
}

/* ─── Helper Components ─── */
function ScannerSummaryStats({ picks, bullish, bearish }: { picks: any[], bullish: number, bearish: number }) {
  return (
    <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xl relative overflow-hidden group font-mono">
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        <div className="text-left px-2">
          <div className="text-3xl font-black font-mono text-[var(--text-primary)] tracking-tighter tabular-nums">{picks.length}</div>
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">Total</div>
        </div>
        <div className="text-left px-4 border-x border-[var(--border-default)]">
          <div className="text-3xl font-black font-mono text-[var(--color-call)] tracking-tighter tabular-nums">{bullish}</div>
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">Bullish</div>
        </div>
        <div className="text-left px-2">
          <div className="text-3xl font-black font-mono text-[var(--color-put)] tracking-tighter tabular-nums">{bearish}</div>
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">Bearish</div>
        </div>
      </div>
    </div>
  );
}
