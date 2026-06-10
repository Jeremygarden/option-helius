"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const WATCHLIST = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "META", "MSFT"] as const;
const TAGS = ["全部", "核心", "激进", "保守"] as const;
const STRATEGY_FILTERS = [
  { label: "全部策略", value: "all" },
  { label: "Sell Put", value: "sell_put" },
  { label: "Call Spread", value: "call_spread" },
  { label: "Iron Condor", value: "iron_condor" },
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

const TYPE_META: Record<StrategyType, { label: string; cn: string; border: string; text: string; glow: string; fill: string }> = {
  sell_put: {
    label: "SELL PUT",
    cn: "卖Put",
    border: "border-l-green-400",
    text: "text-green-300",
    glow: "shadow-[0_0_22px_rgba(63,185,80,0.10)]",
    fill: "bg-green-400",
  },
  call_spread: {
    label: "CALL SPREAD",
    cn: "Call价差",
    border: "border-l-blue-400",
    text: "text-blue-300",
    glow: "shadow-[0_0_22px_rgba(88,166,255,0.10)]",
    fill: "bg-blue-400",
  },
  iron_condor: {
    label: "IRON CONDOR",
    cn: "铁鹰",
    border: "border-l-orange-400",
    text: "text-orange-300",
    glow: "shadow-[0_0_22px_rgba(240,136,62,0.10)]",
    fill: "bg-orange-400",
  },
};

const SCANNER_FALLBACK: ScannerItem[] = [
  { ticker: "SPY", price: 542.1, bias: "range bullish", support: 536, resistance: 548, ivRank: 41 },
  { ticker: "QQQ", price: 468.4, bias: "momentum bullish", support: 461, resistance: 476, ivRank: 38 },
  { ticker: "NVDA", price: 124.7, bias: "high beta pullback", support: 118, resistance: 132, ivRank: 62 },
  { ticker: "TSLA", price: 181.3, bias: "volatile range", support: 170, resistance: 196, ivRank: 74 },
  { ticker: "AAPL", price: 211.8, bias: "defensive bullish", support: 205, resistance: 218, ivRank: 33 },
  { ticker: "META", price: 498.6, bias: "trend bullish", support: 482, resistance: 515, ivRank: 45 },
  { ticker: "MSFT", price: 426.9, bias: "quality range", support: 418, resistance: 438, ivRank: 36 },
];

function buildFallbackPicks(): StrategyPick[] {
  const expiry = "2026-01-16";
  return SCANNER_FALLBACK.slice(0, 5).map((item, index) => {
    const ticker = item.ticker || WATCHLIST[index];
    const price = item.price || 100;
    const ivRank = item.ivRank || 40;
    const support = item.support || price * 0.95;
    const resistance = item.resistance || price * 1.05;
    const aggressive = ivRank >= 65;
    const type: StrategyType = aggressive ? "iron_condor" : index % 2 === 0 ? "sell_put" : "call_spread";
    const score = Math.max(7, Math.min(9, Math.round(6.8 + ivRank / 30 + index * 0.15)));
    const putStrike = Math.round(support);
    const callStrike = Math.round(price * 1.02);
    const upperStrike = Math.round(resistance * 1.02);

    if (type === "iron_condor") {
      return {
        id: `${ticker}-fallback-ic`,
        tag: "激进",
        ticker,
        strategyType: type,
        strategyName: "Iron Condor",
        score,
        direction: "flat",
        legs: [
          { action: "Sell", quantity: 1, strike: putStrike, optionType: "P", expiry },
          { action: "Buy", quantity: 1, strike: putStrike - 10, optionType: "P", expiry },
          { action: "Sell", quantity: 1, strike: upperStrike, optionType: "C", expiry },
          { action: "Buy", quantity: 1, strike: upperStrike + 10, optionType: "C", expiry },
        ],
        entry: `${ticker} 保持 ${support}-${resistance} 区间，IV Rank > ${ivRank - 5} 时收取权利金。`,
        scenarioTip: "区间居中才开，靠近短腿不追单。",
        target: "权利金衰减 55% 或剩余 21 DTE 平仓。",
        stop: "任一短腿 Delta > 0.35 或组合亏损达到权利金 1.8x。",
        maxRisk: "$650-$900 / condor",
        expectedReturn: "35%-48% 风险回报",
        holdingPeriod: "21-35 天",
        signalText: `${ticker} IV Rank ${ivRank}，技术偏向 ${item.bias}，适合宽翼收时间价值。`,
        riskText: "跳空突破区间会快速扩大亏损。",
        capitalText: "每组约 $700 保证金，单标的风险 ≤ 3%。",
        scoreDimensions: { ivRank: 10, otm: 7, riskReward: 8, liquidity: 8 },
        greeks: { delta: -0.03, gamma: -0.006, theta: 0.16, vega: -0.28, iv: ivRank / 100 },
        capitalRequired: 700,
        returnLow: 35,
        returnHigh: 48,
      };
    }

    if (type === "call_spread") {
      return {
        id: `${ticker}-fallback-call-spread`,
        tag: "核心",
        ticker,
        strategyType: type,
        strategyName: "Bull Call Spread",
        score,
        direction: "up",
        legs: [
          { action: "Buy", quantity: 1, strike: callStrike, optionType: "C", expiry },
          { action: "Sell", quantity: 1, strike: upperStrike, optionType: "C", expiry },
        ],
        entry: `${ticker} 放量站上 ${resistance}，净借方不超过价差宽度 42%。`,
        scenarioTip: "突破确认后入场，避免横盘 Theta 消耗。",
        target: "价差达到最大价值 65%-75% 止盈。",
        stop: `${ticker} 跌回 ${support} 下方或组合亏损 45%。`,
        maxRisk: "$400-$950 / spread",
        expectedReturn: "60%-90% 目标回报",
        holdingPeriod: "14-35 天",
        signalText: `${ticker} 技术偏向 ${item.bias}，阻力位明确，价差控制追涨成本。`,
        riskText: "假突破或 IV 回落会压缩组合价值。",
        capitalText: "净借方即最大资金占用，分批进场。",
        scoreDimensions: { ivRank: 7, otm: 8, riskReward: 9, liquidity: 9 },
        greeks: { delta: 0.34, gamma: 0.01, theta: -0.06, vega: 0.14, iv: ivRank / 100 },
        capitalRequired: 650,
        returnLow: 60,
        returnHigh: 90,
      };
    }

    return {
      id: `${ticker}-fallback-sell-put`,
      tag: score >= 9 ? "核心" : "保守",
      ticker,
      strategyType: type,
      strategyName: "Cash-Secured Put",
      score,
      direction: "up",
      legs: [{ action: "Sell", quantity: 1, strike: putStrike, optionType: "P", expiry }],
      entry: `${ticker} 守住 ${support} 支撑，卖出 ${putStrike}P，限价 ≥ ${(price * 0.018).toFixed(2)}。`,
      scenarioTip: "只卖愿意接货的标的，避开财报前窗口。",
      target: "权利金衰减 55%-70% 止盈。",
      stop: `${ticker} 有效跌破 ${support * 0.98} 或期权价格扩大至 2x。`,
      maxRisk: `$${Math.round((putStrike - price * 0.018) * 100).toLocaleString()} / contract`,
      expectedReturn: `${(price * 0.018 / putStrike * 100).toFixed(1)}%-${(price * 0.024 / putStrike * 100).toFixed(1)}% 权利金`,
      holdingPeriod: "28-45 天",
      signalText: `${ticker} 支撑 ${support} 清晰，IV Rank ${ivRank}，Put 侧权利金具备安全垫。`,
      riskText: "趋势破位或事件跳空会提高被行权概率。",
      capitalText: `现金担保约 $${(putStrike * 100).toLocaleString()}。`,
      scoreDimensions: { ivRank: Math.max(6, Math.round(ivRank / 10)), otm: 8, riskReward: 8, liquidity: 9 },
      greeks: { delta: -0.22, gamma: 0.014, theta: 0.07, vega: 0.18, iv: ivRank / 100 },
      capitalRequired: putStrike * 100,
      returnLow: 8,
      returnHigh: 18,
    };
  });
}

function normalizeType(value?: string): StrategyType {
  if (value === "iron_condor") return "iron_condor";
  if (value === "call_spread" || value === "bull_call_spread" || value === "bear_put_spread") return "call_spread";
  return "sell_put";
}

function clampScore(value?: number): number {
  return Math.max(1, Math.min(10, Math.round(Number(value || 7))));
}

function fmtDate(value?: string) {
  if (!value) return "--";
  return value.replaceAll("-", "/");
}

function fmtNum(value?: number, digits = 2) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toFixed(digits);
}

function scoreClass(score: number) {
  if (score >= 9) return "text-green-300";
  if (score >= 8) return "text-yellow-300";
  return "text-gray-300";
}

function ScoreStrip({ score, fill }: { score: number; fill: string }) {
  return (
    <div className="flex items-center gap-1" aria-label={`score ${score} of 10`}>
      {Array.from({ length: 10 }).map((_, index) => (
        <span
          key={index}
          className={`h-3 w-1.5 rounded-sm ${index < score ? fill : "bg-[#30363d]"}`}
        />
      ))}
    </div>
  );
}

function DimensionBars({ dimensions, meta }: { dimensions?: ScoreDimensions; meta: (typeof TYPE_META)[StrategyType] }) {
  const rows = [
    ["IV Rank", dimensions?.ivRank ?? 6],
    ["OTM 程度", dimensions?.otm ?? 7],
    ["Risk/Reward", dimensions?.riskReward ?? 7],
    ["流动性", dimensions?.liquidity ?? 8],
  ] as const;

  return (
    <div className="grid gap-2 rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
      {rows.map(([label, value]) => {
        const score = clampScore(value);
        return (
          <div key={label} className="grid grid-cols-[88px_1fr_28px] items-center gap-2 text-[11px]">
            <span className="text-gray-500">{label}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#30363d]">
              <div className={`h-full rounded-full ${meta.fill} transition-all duration-700`} style={{ width: `${score * 10}%` }} />
            </div>
            <span className="text-right font-mono text-gray-300">{score}</span>
          </div>
        );
      })}
    </div>
  );
}

function LegsRow({ legs }: { legs?: Leg[] }) {
  const safeLegs = legs?.length ? legs : [{ action: "Sell", quantity: 1, strike: 0, optionType: "P", expiry: "--" }];
  return (
    <div className="divide-y divide-[#30363d] border-y border-[#30363d]">
      {safeLegs.map((leg, index) => (
        <div key={`${leg.action}-${leg.strike}-${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 font-mono text-xs">
          <span className={leg.action === "Buy" ? "text-blue-300" : "text-green-300"}>[{leg.action || "Sell"}]</span>
          <span className="text-gray-200">{leg.quantity || 1}张</span>
          <span className="text-white">{leg.strike || "--"}{leg.optionType || "P"}</span>
          <span className="text-gray-500">{fmtDate(leg.expiry)}</span>
        </div>
      ))}
    </div>
  );
}

function DetailLine({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_1fr] gap-2 text-xs leading-relaxed sm:grid-cols-[128px_1fr]">
      <div className="whitespace-nowrap text-gray-500"><span className="mr-1">{icon}</span>{label}</div>
      <div className="text-gray-200">{children}</div>
    </div>
  );
}

function GreeksSnapshot({ greeks }: { greeks?: Greeks }) {
  const rows = [
    ["Delta", greeks?.delta, 2],
    ["Gamma", greeks?.gamma, 3],
    ["Theta", greeks?.theta, 2],
    ["Vega", greeks?.vega, 2],
    ["IV%", typeof greeks?.iv === "number" ? greeks.iv * 100 : undefined, 1],
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-5">
      {rows.map(([label, value, digits]) => (
        <div key={label} className="rounded-lg border border-[#30363d] bg-[#0d1117] p-2">
          <div className="text-[10px] uppercase tracking-widest text-gray-600">{label}</div>
          <div className="mt-1 font-mono text-sm text-white">{fmtNum(value, digits)}</div>
        </div>
      ))}
    </div>
  );
}

function StrategyCard({ pick }: { pick: StrategyPick }) {
  const [open, setOpen] = useState(false);
  const type = normalizeType(pick.strategyType);
  const meta = TYPE_META[type];
  const score = clampScore(pick.score);
  const ticker = (pick.ticker || "SPY").toUpperCase();
  const tag = pick.tag || "核心";

  return (
    <article
      className={`group overflow-hidden rounded-xl border border-[#30363d] border-l-4 ${meta.border} bg-[#161b22] ${meta.glow} transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-500 hover:bg-[#18202b]`}
    >
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full p-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded border border-[#30363d] bg-[#0d1117] px-2 py-1 text-[10px] font-bold text-gray-300">{tag}</span>
            <span className="font-mono text-lg font-black tracking-wide text-white">{ticker}</span>
            <span className={`truncate text-sm font-semibold ${meta.text}`}>{pick.strategyName || meta.cn}</span>
          </div>
          <div className="flex items-center gap-3">
            <ScoreStrip score={score} fill={meta.fill} />
            <span className={`font-mono text-lg font-black ${scoreClass(score)}`}>{score}/10</span>
            <span className={pick.direction === "down" ? "text-red-400" : pick.direction === "flat" ? "text-orange-300" : "text-green-400"}>
              {pick.direction === "down" ? "▼" : pick.direction === "flat" ? "◆" : "▲"}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <LegsRow legs={pick.legs} />
        </div>

        <div className="mt-3 grid gap-2">
          <DetailLine icon="🎯" label="入场条件">
            {pick.entry || "等待价格与盘口确认后限价入场"}
            <div className="mt-1 text-[11px] text-gray-500">└ 💡 {pick.scenarioTip || "先确认流动性，再确认方向，不抢开盘前几分钟。"}</div>
          </DetailLine>
          <DetailLine icon="📋" label="目标预期">{pick.target || "权利金衰减 50%-70% 后止盈"}</DetailLine>
          <DetailLine icon="🔴" label="止损位">{pick.stop || "价格破位或亏损达到计划阈值"}</DetailLine>
          <DetailLine icon="⚠️" label="最大风险">{pick.maxRisk || "按组合保证金和成交价格计算"}</DetailLine>
          <DetailLine icon="💰" label="预期回报">{pick.expectedReturn || "以实时成交价估算"}</DetailLine>
          <DetailLine icon="⏱" label="持有周期">{pick.holdingPeriod || "21-45 天"}</DetailLine>
        </div>

        <div className="my-3 border-t border-[#30363d]" />

        <div className="grid gap-2 text-xs leading-relaxed">
          <div><span className="text-gray-500">📊 异动依据: </span><span className="text-gray-200">{pick.signalText || "多因子评分通过，等待成交确认。"}</span></div>
          <div><span className="text-gray-500">⚠️ 风险点: </span><span className="text-gray-200">{pick.riskText || "跳空、流动性与波动率变化。"}</span></div>
          <div><span className="text-gray-500">💵 资金占用: </span><span className="text-gray-200">{pick.capitalText || "按券商保证金为准。"}</span></div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
          <span>{meta.label} · 点击{open ? "收起" : "展开"} Greeks 快照</span>
          <span className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>⌄</span>
        </div>
      </button>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-[#30363d] px-4 pb-4">
            <GreeksSnapshot greeks={pick.greeks} />
          </div>
        </div>
      </div>
    </article>
  );
}

function ScannerPanel({ scanner, selected, onSelect }: { scanner: ScannerItem[]; selected: string; onSelect: (ticker: string) => void }) {
  const current = scanner.find(item => (item.ticker || "").toUpperCase() === selected) || scanner[0] || SCANNER_FALLBACK[0];
  const bias = current.bias || "neutral";

  return (
    <aside className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 lg:sticky lg:top-4 lg:self-start">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-gray-600">Scanner</div>
          <h2 className="mt-1 text-base font-bold text-white">标的雷达</h2>
        </div>
        <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] text-green-300">LIVE BIAS</span>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {WATCHLIST.map(ticker => {
          const item = scanner.find(row => (row.ticker || "").toUpperCase() === ticker) || SCANNER_FALLBACK.find(row => row.ticker === ticker);
          const active = selected === ticker;
          return (
            <button
              key={ticker}
              type="button"
              onClick={() => onSelect(ticker)}
              className={`rounded-lg border p-3 text-left transition-all ${active ? "border-green-500 bg-green-500/10" : "border-[#30363d] bg-[#0d1117] hover:border-gray-500"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-white">{ticker}</span>
                <span className="font-mono text-xs text-gray-400">{fmtNum(item?.price, 1)}</span>
              </div>
              <div className="mt-1 truncate text-[11px] text-gray-500">{item?.bias || "neutral"}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-lg font-black text-white">{selected}</span>
          <span className="text-xs text-green-300">IV Rank {current.ivRank ?? "--"}</span>
        </div>
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-gray-500">技术偏向</span><span className="text-gray-200">{bias}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">关键支撑</span><span className="font-mono text-blue-300">{fmtNum(current.support, 1)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">关键阻力</span><span className="font-mono text-orange-300">{fmtNum(current.resistance, 1)}</span></div>
        </div>
      </div>
    </aside>
  );
}

export default function PicksPage() {
  const [payload, setPayload] = useState<PicksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string>("SPY");
  const [tagFilter, setTagFilter] = useState<(typeof TAGS)[number]>("全部");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<"score" | "ticker">("score");

  const fetchPicks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/picks`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as PicksResponse;
      setPayload({
        ...data,
        picks: data.picks?.length ? data.picks : buildFallbackPicks(),
        scanner: data.scanner?.length ? data.scanner : SCANNER_FALLBACK,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "API unavailable");
      setPayload({
        dataSource: "frontend-fallback",
        week: undefined,
        scanner: SCANNER_FALLBACK,
        picks: buildFallbackPicks(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPicks();
  }, [fetchPicks]);

  const picks = payload?.picks?.length ? payload.picks : buildFallbackPicks();
  const scanner = payload?.scanner?.length ? payload.scanner : SCANNER_FALLBACK;

  const filtered = useMemo(() => {
    return picks
      .filter(pick => (selectedTicker ? (pick.ticker || "").toUpperCase() === selectedTicker : true))
      .filter(pick => (tagFilter === "全部" ? true : (pick.tag || "核心") === tagFilter))
      .filter(pick => (strategyFilter === "all" ? true : normalizeType(pick.strategyType) === strategyFilter))
      .sort((a, b) => sortMode === "score" ? clampScore(b.score) - clampScore(a.score) : (a.ticker || "").localeCompare(b.ticker || ""));
  }, [picks, selectedTicker, tagFilter, strategyFilter, sortMode]);

  const displayPicks = filtered.length ? filtered : picks.slice().sort((a, b) => clampScore(b.score) - clampScore(a.score));
  const highScoreCount = picks.filter(pick => clampScore(pick.score) >= 8).length;
  const returnLows = picks.map(p => Number(p.returnLow || 0)).filter(Boolean);
  const returnHighs = picks.map(p => Number(p.returnHigh || 0)).filter(Boolean);
  const weekStart = payload?.week?.start;
  const weekEnd = payload?.week?.end;

  return (
    <div className="min-h-screen bg-[#0d1117] pb-10 text-[#e6edf3]">
      <div className="mb-5 overflow-hidden rounded-xl border border-[#30363d] bg-[#161b22]">
        <div className="relative p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(63,185,80,0.16),transparent_34%),linear-gradient(90deg,rgba(88,166,255,0.08),transparent)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.35em] text-green-300/80">Weekly Options Picks</div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white">本周精选策略</h1>
              <p className="mt-1 text-xs text-gray-500">真实策略评分优先 · API 不可用时自动生成完整 fallback 卡片</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/80 px-4 py-3">
                <div className="text-[10px] text-gray-500">日期范围</div>
                <div className="mt-1 font-mono text-xs text-white">{fmtDate(weekStart)} → {fmtDate(weekEnd)}</div>
              </div>
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/80 px-4 py-3">
                <div className="text-[10px] text-gray-500">策略 / 高分</div>
                <div className="mt-1 font-mono text-lg font-black text-white">{picks.length}<span className="text-gray-600"> / </span><span className="text-green-300">{payload?.summary?.highScoreCount ?? highScoreCount}</span></div>
              </div>
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/80 px-4 py-3">
                <div className="text-[10px] text-gray-500">预期回报范围</div>
                <div className="mt-1 font-mono text-lg font-black text-white">{payload?.summary?.expectedReturnRange?.low ?? Math.min(...returnLows, 0)}-{payload?.summary?.expectedReturnRange?.high ?? Math.max(...returnHighs, 0)}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <ScannerPanel scanner={scanner} selected={selectedTicker} onSelect={setSelectedTicker} />

        <main className="space-y-4">
          <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">策略筛选与评分面板</h2>
                <p className="mt-1 text-xs text-gray-500">
                  {loading ? "正在刷新评分..." : error ? `API fallback active: ${error}` : `Data source: ${payload?.dataSource || "api"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={fetchPicks}
                disabled={loading}
                className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs font-bold text-green-300 transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "刷新中..." : "刷新数据"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr_160px]">
              <div className="flex flex-wrap gap-2">
                {TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTagFilter(tag)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${tagFilter === tag ? "border-green-500 bg-green-500/10 text-green-300" : "border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500"}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {STRATEGY_FILTERS.map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStrategyFilter(item.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${strategyFilter === item.value ? "border-blue-500 bg-blue-500/10 text-blue-300" : "border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <select
                value={sortMode}
                onChange={event => setSortMode(event.target.value as "score" | "ticker")}
                className="rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-xs text-gray-300 outline-none focus:border-green-500"
              >
                <option value="score">按评分排序</option>
                <option value="ticker">按Ticker排序</option>
              </select>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(STRATEGY_FILTERS.slice(1) as readonly { label: string; value: StrategyType }[]).map(item => {
                const meta = TYPE_META[item.value];
                const count = picks.filter(pick => normalizeType(pick.strategyType) === item.value).length;
                return (
                  <div key={item.value} className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
                    <div className={`text-[10px] font-bold uppercase tracking-widest ${meta.text}`}>{item.label}</div>
                    <div className="mt-2 flex items-end justify-between">
                      <span className="font-mono text-2xl font-black text-white">{count}</span>
                      <span className="text-[11px] text-gray-500">cards</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {loading && (
            <div className="grid gap-3">
              {[0, 1].map(index => <div key={index} className="h-64 animate-pulse rounded-xl border border-[#30363d] bg-[#161b22]" />)}
            </div>
          )}

          {!loading && (
            <div className="grid gap-4">
              {displayPicks.map((pick, index) => (
                <div key={pick.id || `${pick.ticker}-${index}`} className="animate-[fadeIn_0.35s_ease-out_both]" style={{ animationDelay: `${index * 45}ms` }}>
                  <StrategyCard pick={pick} />
                  <div className="mt-2">
                    <DimensionBars dimensions={pick.scoreDimensions} meta={TYPE_META[normalizeType(pick.strategyType)]} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
