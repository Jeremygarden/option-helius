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
const TYPE_META: Record<StrategyType, {
  label: string; cn: string; color: string; bg: string; border: string;
}> = {
  sell_put:    { label: "SELL PUT",    cn: "卖Put",  color: "#3fb950", bg: "rgba(63,185,80,0.12)",  border: "rgba(63,185,80,0.3)"  },
  call_spread: { label: "CALL SPREAD", cn: "Call价差", color: "#58a6ff", bg: "rgba(88,166,255,0.12)", border: "rgba(88,166,255,0.3)" },
  iron_condor: { label: "IRON CONDOR", cn: "铁鹰",   color: "#f0883e", bg: "rgba(240,136,62,0.12)", border: "rgba(240,136,62,0.3)" },
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
function PickCard({ pick, rank }: { pick: StrategyPick; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const type = normalizeType(pick.strategyType);
  const meta = TYPE_META[type];
  const score = clampScore(pick.score);
  const ticker = (pick.ticker || "SPY").toUpperCase();

  // Build legs summary
  const legsSummary = (pick.legs || []).map(l =>
    `${l.action} ${l.strike}${l.optionType}`
  ).join(" / ");

  const dirColor = pick.direction === "down" ? "#f85149" : pick.direction === "flat" ? "#f0883e" : "#3fb950";
  const DirIcon = pick.direction === "down" ? TrendingDown : pick.direction === "flat" ? Minus : TrendingUp;

  return (
    <article
      className="rounded-lg border transition-all duration-150 hover:-translate-y-px overflow-hidden flex flex-col"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
        borderLeft: `3px solid ${meta.color}`,
      }}
    >
      {/* Card header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start justify-between gap-1 mb-2">
          {/* Rank + ticker */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-[10px] font-mono font-bold w-5 h-5 flex items-center justify-center rounded"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
            >
              {rank}
            </span>
            <span className="font-mono text-base font-black" style={{ color: "var(--text-primary)" }}>
              {ticker}
            </span>
          </div>
          {/* Type badge */}
          <span
            className="shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
          >
            {meta.label}
          </span>
        </div>

        {/* Strategy name + direction */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold" style={{ color: meta.color }}>
            {pick.strategyName || meta.cn}
          </span>
          <DirIcon size={12} style={{ color: dirColor, flexShrink: 0 }} />
        </div>
      </div>

      {/* Contract code */}
      <div
        className="px-3 py-1.5 border-y text-[11px] font-mono font-bold truncate"
        style={{
          borderColor: "var(--border-muted)",
          background: "var(--bg-elevated)",
          color: "var(--text-primary)",
        }}
      >
        {legsSummary || pick.strategyName}
      </div>

      {/* Stats 2-col grid */}
      <div className="px-3 py-2 grid grid-cols-2 gap-x-3 gap-y-1.5 flex-1">
        {[
          { label: "评分", value: `${score}/10`, color: score >= 9 ? "#3fb950" : score >= 8 ? "#d29922" : "var(--text-secondary)" },
          { label: "回报", value: pick.expectedReturn || "--", color: "#58a6ff" },
          { label: "最大风险", value: pick.maxRisk || "--", color: "#f85149" },
          { label: "周期", value: pick.holdingPeriod || "--", color: "var(--text-secondary)" },
        ].map(s => (
          <div key={s.label}>
            <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {s.label}
            </div>
            <div className="text-[11px] font-mono font-semibold tabular-nums leading-tight mt-0.5 truncate" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Signal text */}
      {pick.signalText && (
        <div className="px-3 pb-2 text-[10px] leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
          {pick.signalText}
        </div>
      )}

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full px-3 py-1.5 text-[10px] font-mono text-left border-t flex items-center justify-between transition-colors hover:opacity-80"
        style={{
          borderColor: "var(--border-muted)",
          color: "var(--text-muted)",
          background: "var(--bg-elevated)",
        }}
      >
        <span>{expanded ? "收起 Greeks" : "展开 Greeks"}</span>
        <span style={{ transform: expanded ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>▾</span>
      </button>

      {/* Expanded Greeks */}
      {expanded && (
        <div
          className="px-3 py-2 grid grid-cols-5 gap-1 border-t"
          style={{ borderColor: "var(--border-muted)", background: "var(--bg-elevated)" }}
        >
          {[
            ["Δ", pick.greeks?.delta, 2],
            ["Γ", pick.greeks?.gamma, 3],
            ["Θ", pick.greeks?.theta, 2],
            ["V", pick.greeks?.vega, 2],
            ["IV", typeof pick.greeks?.iv === "number" ? pick.greeks.iv * 100 : undefined, 1],
          ].map(([label, value, d]) => (
            <div key={label as string} className="text-center">
              <div className="text-[9px] uppercase" style={{ color: "var(--text-muted)" }}>{label}</div>
              <div className="text-[10px] font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                {fmtNum(value as number | undefined, d as number)}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

/* ─── Score dimension bars ────────────────────────────────────── */
function ScoreBars({ dimensions, color }: { dimensions?: ScoreDimensions; color: string }) {
  const rows: [string, number][] = [
    ["IV Rank",     clampScore(dimensions?.ivRank)],
    ["OTM",         clampScore(dimensions?.otm)],
    ["R/R",         clampScore(dimensions?.riskReward)],
    ["流动性",       clampScore(dimensions?.liquidity)],
  ];
  return (
    <div className="flex gap-3 items-end">
      {rows.map(([label, score]) => (
        <div key={label} className="flex flex-col items-center gap-0.5">
          <div className="w-1 rounded-t" style={{ height: `${score * 4}px`, background: color, opacity: 0.8 }} />
          <span className="text-[8px] leading-none" style={{ color: "var(--text-muted)" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

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
    <div
      className="rounded-lg border p-3 flex flex-wrap items-center gap-3"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <SlidersHorizontal size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />

      {/* Tag filters */}
      <div className="flex flex-wrap gap-1.5">
        {TAGS.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => setTagFilter(tag)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
            style={{
              background: tagFilter === tag ? "rgba(63,185,80,0.15)" : "var(--bg-elevated)",
              borderColor: tagFilter === tag ? "#3fb950" : "var(--border-default)",
              color: tagFilter === tag ? "#3fb950" : "var(--text-muted)",
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="w-px h-4" style={{ background: "var(--border-default)" }} />

      {/* Strategy filters */}
      <div className="flex flex-wrap gap-1.5">
        {STRATEGY_FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStrategyFilter(f.value)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
            style={{
              background: strategyFilter === f.value ? "rgba(88,166,255,0.15)" : "var(--bg-elevated)",
              borderColor: strategyFilter === f.value ? "#58a6ff" : "var(--border-default)",
              color: strategyFilter === f.value ? "#58a6ff" : "var(--text-muted)",
            }}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1 font-mono text-[9px]">({counts[f.value] ?? 0})</span>
            )}
          </button>
        ))}
      </div>

      <div className="ml-auto">
        <select
          value={sortMode}
          onChange={e => setSortMode(e.target.value as "score" | "ticker")}
          className="rounded-md border px-2 py-1 text-[11px] outline-none transition-colors"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)",
          }}
        >
          <option value="score">按评分</option>
          <option value="ticker">按Ticker</option>
        </select>
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

  // Summary stats
  const highCount = picks.filter(p => clampScore(p.score) >= 8).length;
  const returnMin = Math.min(...picks.map(p => Number(p.returnLow || 0)).filter(Boolean), 0);
  const returnMax = Math.max(...picks.map(p => Number(p.returnHigh || 0)).filter(Boolean), 0);

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

  return (
    <div className="flex flex-col gap-4 pb-8">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          期权精选
          <span className="text-[#8b949e] text-base font-normal ml-2">Picks</span>
        </h1>
        <button
          type="button"
          onClick={fetchPicks}
          disabled={loading}
          className="bg-[#1158c7] hover:bg-[#1f6feb] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "扫描中..." : "重新扫描"}
        </button>
      </div>

      {/* ── Scanner summary stats card ── */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 mb-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="font-mono text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {picks.length}
            </div>
            <div className="text-[11px] uppercase tracking-wide mt-1" style={{ color: "var(--text-muted)" }}>
              策略数
            </div>
          </div>
          <div className="text-center border-x border-[#30363d]">
            <div className="font-mono text-2xl font-bold" style={{ color: "#3fb950" }}>
              {bullishCount}
            </div>
            <div className="text-[11px] uppercase tracking-wide mt-1" style={{ color: "var(--text-muted)" }}>
              看涨
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono text-2xl font-bold" style={{ color: "#f85149" }}>
              {bearishCount}
            </div>
            <div className="text-[11px] uppercase tracking-wide mt-1" style={{ color: "var(--text-muted)" }}>
              看跌
            </div>
          </div>
        </div>
      </div>

      {/* ── Scanner detail card ── */}
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

      {/* ── Direction filter tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {DIRECTION_TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setDirectionTab(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              directionTab === tab.value
                ? "bg-[#1158c7] text-white border-[#1158c7]"
                : "bg-[#1c2128] border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#8b949e]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Summary stat pills ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex items-center gap-4 rounded-lg border px-4 py-2"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              策略总数
            </div>
            <div className="font-mono text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {picks.length}
              <span className="text-sm font-normal ml-1.5" style={{ color: "#3fb950" }}>
                {highCount} 高分
              </span>
            </div>
          </div>
          <div className="w-px h-8" style={{ background: "var(--border-default)" }} />
          <div>
            <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              预期回报区间
            </div>
            <div className="font-mono text-lg font-bold" style={{ color: "#58a6ff" }}>
              {returnMin}%-{returnMax}%
            </div>
          </div>
          {Object.entries(TYPE_META).map(([key, meta]) => (
            <React.Fragment key={key}>
              <div className="w-px h-8" style={{ background: "var(--border-default)" }} />
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  {meta.cn}
                </div>
                <div className="font-mono text-lg font-bold" style={{ color: meta.color }}>
                  {counts[key] ?? 0}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <FilterBar
        tagFilter={tagFilter} setTagFilter={setTagFilter}
        strategyFilter={strategyFilter} setStrategyFilter={setStrategyFilter}
        sortMode={sortMode} setSortMode={setSortMode}
        counts={counts}
      />

      {/* ── Loading skeletons ── */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-56 rounded-lg animate-pulse"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
            />
          ))}
        </div>
      )}

      {/* ── Picks grid ── */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {displayPicks.map((pick, idx) => (
            <div
              key={pick.id || `${pick.ticker}-${idx}`}
              style={{ animationDelay: `${idx * 30}ms` }}
              className="animate-[fadeIn_0.3s_ease-out_both]"
            >
              <PickCard pick={pick} rank={idx + 1} />
            </div>
          ))}
          {displayPicks.length === 0 && (
            <div
              className="col-span-4 py-16 text-center text-sm rounded-lg border"
              style={{
                color: "var(--text-muted)",
                background: "var(--bg-surface)",
                borderColor: "var(--border-default)",
              }}
            >
              当前筛选条件下没有策略，请调整过滤器
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
