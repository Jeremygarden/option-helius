"use client";
import React, { useState, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────
interface ScanSummary {
  ticker: string;
  price: number;
  vwap_pct: number;          // % vs VWAP
  tech_bias: string;         // "bullish_breakout_only"
  top_pick: OptionContract;
  entry_trigger: string;
  risk_control: string;
  scan_time: string;
}

interface OptionContract {
  symbol: string;            // "SPY260508C00730000"
  expiry: string;            // "2026-05-08"
  strike: number;            // 730
  type: "CALL" | "PUT";
  bid: number;
  ask: number;
  spread_pct: number;
  volume: number;
  oi: number;
  iv_pct: number;
  rank: number;              // 1-8
}

interface KLinePoint { date: string; close: number; }
interface IntradayPoint { time: string; price: number; vwap: number; }

// ── Mock Data ──────────────────────────────────────────────────
const MOCK_SCAN: Record<string, ScanSummary> = {
  SPY: {
    ticker: "SPY",
    price: 714.35,
    vwap_pct: 0.20,
    tech_bias: "bullish_breakout_only",
    top_pick: {
      symbol: "SPY260508C00730000", expiry: "2026-05-08", strike: 730, type: "CALL",
      bid: 0.69, ask: 0.70, spread_pct: 1.43, volume: 2800, oi: 6318, iv_pct: 11.35, rank: 1,
    },
    entry_trigger: "按方向等符合正股突破/跌破关键位确认；不要提前在横盘里烧 theta",
    risk_control: "期权亏 40%-50% 或正股跌回/站回触发发位方向反方向时退出；期权可能归零，优先限价单",
    scan_time: "2026-05-08 09:45",
  },
  NVDA: {
    ticker: "NVDA",
    price: 132.80,
    vwap_pct: -0.35,
    tech_bias: "range_bound_iv_sell",
    top_pick: {
      symbol: "NVDA260516C00140000", expiry: "2026-05-16", strike: 140, type: "CALL",
      bid: 0.42, ask: 0.44, spread_pct: 4.55, volume: 1820, oi: 9240, iv_pct: 38.72, rank: 1,
    },
    entry_trigger: "IV Rank > 60，可直接卖出；等价差收窄至 < 3% 再成交",
    risk_control: "Delta 超出 ±0.30 立即对冲；亏损超出收取权利金 2x 时平仓",
    scan_time: "2026-05-08 09:45",
  },
  QQQ: {
    ticker: "QQQ",
    price: 488.20,
    vwap_pct: 0.08,
    tech_bias: "neutral_wait_for_break",
    top_pick: {
      symbol: "QQQ260515P00480000", expiry: "2026-05-15", strike: 480, type: "PUT",
      bid: 1.15, ask: 1.17, spread_pct: 1.72, volume: 3240, oi: 14200, iv_pct: 18.44, rank: 1,
    },
    entry_trigger: "等待QQQ跌破488支撑确认，或纳指期货开盘-0.3%以上",
    risk_control: "亏 40% 平仓；期权到期前3天无盈利则强制平仓",
    scan_time: "2026-05-08 09:45",
  },
  TSLA: {
    ticker: "TSLA",
    price: 248.90,
    vwap_pct: 1.12,
    tech_bias: "high_iv_premium_sell",
    top_pick: {
      symbol: "TSLA260516C00265000", expiry: "2026-05-16", strike: 265, type: "CALL",
      bid: 2.85, ask: 2.90, spread_pct: 1.73, volume: 8920, oi: 22100, iv_pct: 62.30, rank: 1,
    },
    entry_trigger: "IV Rank = 85，高IV卖方策略；开盘后10分钟价稳后入场",
    risk_control: "TSLA 单日±10% 跳空风险极高；仓位不超过账户 3%",
    scan_time: "2026-05-08 09:45",
  },
};

function generateCandidates(ticker: string): OptionContract[] {
  const base = MOCK_SCAN[ticker];
  if (!base) return [];
  const p = base.price;
  const strikes = [
    p * 1.022, p * 1.030, p * 1.025, p * 1.028,
    p * 1.033, p * 1.038, p * 1.019, p * 1.031,
  ].map(s => Math.round(s / 0.5) * 0.5);
  const expiries = ["2026-05-08","2026-05-15","2026-05-15","2026-05-15","2026-05-08","2026-05-22","2026-05-08","2026-05-15"];
  return strikes.map((strike, i) => {
    const mid = Math.max(0.10, (strike - p) * 0.015 + Math.random() * 0.4 + 0.2);
    const spread = mid * (0.01 + Math.random() * 0.04);
    return {
      symbol: `${ticker}${expiries[i].replace(/-/g,'')}C00${Math.round(strike*1000).toString().padStart(8,'0')}`,
      expiry: expiries[i],
      strike: Math.round(strike * 100) / 100,
      type: "CALL",
      bid: Math.round((mid - spread/2) * 100) / 100,
      ask: Math.round((mid + spread/2) * 100) / 100,
      spread_pct: Math.round(spread / mid * 10000) / 100,
      volume: Math.round(200 + Math.random() * 8000),
      oi: Math.round(2000 + Math.random() * 20000),
      iv_pct: Math.round((10 + Math.random() * 50) * 100) / 100,
      rank: i + 1,
    };
  });
}

function generateKLine(ticker: string): KLinePoint[] {
  const base = MOCK_SCAN[ticker]?.price || 500;
  const points: KLinePoint[] = [];
  let price = base * 0.94;
  const start = new Date("2026-02-04");
  for (let i = 0; i < 60; i++) {
    price *= (1 + (Math.random() - 0.48) * 0.025);
    const d = new Date(start);
    d.setDate(start.getDate() + i * 1.3);
    points.push({ date: d.toISOString().slice(0, 10), close: Math.round(price * 100) / 100 });
  }
  points[points.length - 1].close = base;
  return points;
}

function generateIntraday(ticker: string): IntradayPoint[] {
  const base = MOCK_SCAN[ticker]?.price || 500;
  const points: IntradayPoint[] = [];
  let price = base * 0.998;
  let vwapSum = 0;
  for (let i = 0; i < 78; i++) { // 9:30-16:00 in 5min bars
    const h = Math.floor(i * 5 / 60) + 9;
    const m = (i * 5) % 60;
    price *= (1 + (Math.random() - 0.49) * 0.003);
    vwapSum += price;
    points.push({
      time: `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`,
      price: Math.round(price * 100) / 100,
      vwap: Math.round((vwapSum / (i + 1)) * 100) / 100,
    });
  }
  return points;
}

// ── Mini SVG Charts ────────────────────────────────────────────
function KLineChart({ data, w = 400, h = 140 }: { data: KLinePoint[]; w?: number; h?: number }) {
  if (!data.length) return null;
  const prices = data.map(d => d.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = { l: 8, r: 8, t: 10, b: 24 };
  const W = w - pad.l - pad.r;
  const H = h - pad.t - pad.b;
  const xStep = W / (data.length - 1);
  const toY = (v: number) => pad.t + H - ((v - min) / range) * H;
  const toX = (i: number) => pad.l + i * xStep;
  const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.close).toFixed(1)}`).join(" ");
  const area = `M${toX(0)},${toY(data[0].close)} ` +
    data.map((d, i) => `L${toX(i).toFixed(1)},${toY(d.close).toFixed(1)}`).join(" ") +
    ` L${toX(data.length-1)},${h-pad.b} L${toX(0)},${h-pad.b} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <defs>
        <linearGradient id="kgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#kgrad)" />
      <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round" />
      {/* x-axis labels */}
      {[0, Math.floor(data.length/2), data.length-1].map(i => (
        <text key={i} x={toX(i)} y={h-4} fill="#4b5563" fontSize="9" textAnchor="middle">{data[i].date}</text>
      ))}
    </svg>
  );
}

function IntradayChart({ data, w = 400, h = 140 }: { data: IntradayPoint[]; w?: number; h?: number }) {
  if (!data.length) return null;
  const allPrices = [...data.map(d => d.price), ...data.map(d => d.vwap)];
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;
  const pad = { l: 8, r: 8, t: 10, b: 24 };
  const W = w - pad.l - pad.r;
  const H = h - pad.t - pad.b;
  const toY = (v: number) => pad.t + H - ((v - min) / range) * H;
  const toX = (i: number) => pad.l + (i / (data.length - 1)) * W;
  const pricePts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.price).toFixed(1)}`).join(" ");
  const vwapPts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.vwap).toFixed(1)}`).join(" ");
  const area = `M${toX(0)},${toY(data[0].price)} ` +
    data.map((d,i) => `L${toX(i).toFixed(1)},${toY(d.price).toFixed(1)}`).join(" ") +
    ` L${toX(data.length-1)},${H+pad.t} L${toX(0)},${H+pad.t} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <defs>
        <linearGradient id="igrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#igrad)" />
      <polyline points={pricePts} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round" />
      <polyline points={vwapPts} fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" strokeLinejoin="round" />
      {[0, Math.floor(data.length/2), data.length-1].map(i => (
        <text key={i} x={toX(i)} y={h-4} fill="#4b5563" fontSize="9" textAnchor="middle">
          {data[i].time}
        </text>
      ))}
    </svg>
  );
}

// ── Option Candidate Card ──────────────────────────────────────
function OptionCard({ contract, isTop }: { contract: OptionContract; isTop: boolean }) {
  const spreadColor = contract.spread_pct < 2 ? "text-green-400" : contract.spread_pct < 4 ? "text-yellow-400" : "text-red-400";
  return (
    <div className={`relative rounded-lg border p-3 font-mono text-xs transition-all cursor-pointer
      ${isTop
        ? "border-green-500 bg-green-950/20 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
        : "border-gray-800 bg-[#0a0d12] hover:border-gray-600"}`}>
      {/* Rank + Type badge */}
      <div className="flex justify-between items-center mb-1.5">
        <span className={`text-[11px] font-bold ${isTop ? "text-green-400" : "text-gray-500"}`}>#{contract.rank}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold
          ${contract.type === "CALL" ? "bg-green-900/60 text-green-300 border border-green-800" : "bg-red-900/60 text-red-300 border border-red-800"}`}>
          {contract.type}
        </span>
      </div>
      {/* Symbol */}
      <div className={`text-[11px] font-bold truncate mb-1 ${isTop ? "text-green-300" : "text-gray-300"}`}>
        {contract.symbol}
      </div>
      {/* Expiry + Strike */}
      <div className="flex justify-between text-[10px] text-gray-500 mb-2">
        <span>{contract.expiry}</span>
        <span className="text-gray-400">Strike {contract.strike}</span>
      </div>
      {/* Bid/Ask */}
      <div className={`text-lg font-black mb-0.5 ${isTop ? "text-green-400" : "text-gray-200"}`}>
        {contract.bid} / {contract.ask}
      </div>
      {/* Spread */}
      <div className={`text-[10px] mb-2 ${spreadColor}`}>spread {contract.spread_pct}%</div>
      {/* Vol / OI / IV */}
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <div><span className="text-gray-600">Vol </span><span className="text-gray-400">{(contract.volume/1000).toFixed(1)}K</span></div>
        <div><span className="text-gray-600">OI </span><span className="text-gray-400">{(contract.oi/1000).toFixed(1)}K</span></div>
        <div><span className="text-gray-600">IV </span><span className="text-gray-400">{contract.iv_pct}%</span></div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
const STRATEGY_TYPES = ["全部策略", "买入Call", "买入Put", "卖出Call", "价差策略", "Iron Condor"];
const RISK_LEVELS = ["全部风险", "低风险", "中等风险", "高风险"];
const QUICK_TICKERS = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "AMZN"];

export default function PicksPage() {
  const [ticker, setTicker] = useState("SPY");
  const [searchInput, setSearchInput] = useState("SPY");
  const [strategyFilter, setStrategyFilter] = useState("全部策略");
  const [riskFilter, setRiskFilter] = useState("全部风险");
  const [scanning, setScanning] = useState(false);

  const scan = MOCK_SCAN[ticker.toUpperCase()] || MOCK_SCAN["SPY"];
  const candidates = generateCandidates(ticker.toUpperCase());
  const klineData = generateKLine(ticker.toUpperCase());
  const intradayData = generateIntraday(ticker.toUpperCase());

  const handleSearch = useCallback(() => {
    const t = searchInput.trim().toUpperCase();
    if (!t) return;
    setScanning(true);
    setTimeout(() => { setTicker(t); setScanning(false); }, 800);
  }, [searchInput]);

  const biasColor = scan.tech_bias.includes("bullish") ? "text-green-400"
    : scan.tech_bias.includes("sell") || scan.tech_bias.includes("high_iv") ? "text-yellow-400"
    : "text-gray-400";

  return (
    <div className="flex flex-col gap-4 pb-12 text-sm">
      {/* ── Header + Search + Filters ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">精选策略 / Options Scanner</h1>
          <p className="text-gray-500 text-xs mt-0.5">Multi-signal: IV Rank · GEX · Skew · Trend · OI Flow</p>
        </div>

        {/* Right: filters + search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Strategy type */}
          <select
            value={strategyFilter}
            onChange={e => setStrategyFilter(e.target.value)}
            className="bg-[#111827] border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-green-600"
          >
            {STRATEGY_TYPES.map(s => <option key={s}>{s}</option>)}
          </select>
          {/* Risk level */}
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="bg-[#111827] border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-green-600"
          >
            {RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
          </select>
          {/* Search box */}
          <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden focus-within:border-green-500 transition-colors">
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="输入标的 SPY..."
              className="bg-[#111827] text-white text-xs px-3 py-1.5 w-32 outline-none placeholder-gray-600"
            />
            <button
              onClick={handleSearch}
              className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 font-medium transition-colors"
            >
              扫描
            </button>
          </div>
        </div>
      </div>

      {/* Quick ticker pills */}
      <div className="flex gap-1.5 flex-wrap">
        {QUICK_TICKERS.map(t => (
          <button key={t} onClick={() => { setTicker(t); setSearchInput(t); }}
            className={`px-3 py-1 rounded-full text-xs font-mono font-medium border transition-all
              ${ticker === t
                ? "bg-green-700 border-green-600 text-white"
                : "bg-[#111827] border-gray-700 text-gray-400 hover:border-gray-500"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── 最终方案 Summary Card ── */}
      <div className="rounded-xl border border-gray-700 bg-[#0a0d12] p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-[10px] text-gray-600 uppercase tracking-widest">最终方案</span>
            <h2 className="text-base font-bold text-green-400 mt-0.5">{ticker} 扫描结论</h2>
          </div>
          <button
            onClick={handleSearch}
            disabled={scanning}
            className="text-xs border border-gray-600 text-gray-400 hover:border-green-500 hover:text-green-400 px-3 py-1 rounded-lg transition-all disabled:opacity-50"
          >
            {scanning ? "扫描中..." : "重新扫描"}
          </button>
        </div>

        <div className="space-y-1.5 text-xs leading-relaxed">
          <div className="flex gap-2">
            <span className="text-green-500 flex-shrink-0">•</span>
            <span className="text-gray-300">
              现价参考：<span className="font-mono text-white">{scan.price.toFixed(2)}</span>；
              日内相对VWAP：<span className="font-mono text-white">{scan.vwap_pct > 0 ? "+" : ""}{scan.vwap_pct}%</span>；
              技术偏向：<span className={`font-mono ${biasColor}`}>{scan.tech_bias}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500 flex-shrink-0">•</span>
            <span className="text-gray-300">
              单腿候选：<span className="font-mono text-green-300">{scan.top_pick.symbol}</span>，
              {scan.top_pick.expiry} 到期 Strike {scan.top_pick.strike} <span className={scan.top_pick.type === "CALL" ? "text-green-400" : "text-red-400"}>{scan.top_pick.type}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500 flex-shrink-0">•</span>
            <span className="text-gray-300">
              盘口：bid/ask <span className="font-mono text-white">{scan.top_pick.bid}/{scan.top_pick.ask}</span>；
              volume <span className="font-mono text-white">{scan.top_pick.volume.toLocaleString()}</span>；
              OI <span className="font-mono text-white">{scan.top_pick.oi.toLocaleString()}</span>；
              IV <span className="font-mono text-yellow-400">{scan.top_pick.iv_pct}%</span>
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500 flex-shrink-0">•</span>
            <span className="text-gray-300"><span className="text-gray-500">触发：</span>{scan.entry_trigger}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500 flex-shrink-0">•</span>
            <span className="text-gray-300"><span className="text-gray-500">风控：</span>{scan.risk_control}</span>
          </div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-800 bg-[#0a0d12] p-4">
          <div className="text-xs text-gray-500 mb-2 font-medium">最近日K收盘路径</div>
          <div className="h-36">
            <KLineChart data={klineData} w={460} h={140} />
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-[#0a0d12] p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-gray-500 font-medium">今日分时 / VWAP</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-3 h-px bg-green-500 inline-block"></span><span className="text-gray-600">Price</span></span>
              <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed border-yellow-500 inline-block"></span><span className="text-gray-600">VWAP</span></span>
            </div>
          </div>
          <div className="h-36">
            <IntradayChart data={intradayData} w={460} h={140} />
          </div>
        </div>
      </div>

      {/* ── 期权候选池 ── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-bold text-gray-200">期权候选池</span>
          <span className="text-[11px] text-gray-600">{candidates.length}个候选合约 · 按综合得分排序</span>
          <div className="h-px flex-1 bg-gray-800"></div>
          <span className="text-[10px] text-green-600 border border-green-900 rounded px-2 py-0.5">#1 最优推荐</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {candidates.map(c => (
            <OptionCard key={c.symbol} contract={c} isTop={c.rank === 1} />
          ))}
        </div>
      </div>

      {/* ── Engine notes ── */}
      <div className="rounded-xl border border-gray-800 bg-[#0a0d12] p-4 text-xs text-gray-500 leading-relaxed">
        <span className="text-gray-600 font-semibold uppercase tracking-widest text-[10px]">Engine Logic</span>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
          <p><span className="text-gray-400">IV排名信号：</span>高IV → 卖方策略；低IV → 买方/方向性策略</p>
          <p><span className="text-gray-400">GEX影响：</span>正GEX区间 = 做市商对冲压制波动；负GEX = 波动放大</p>
          <p><span className="text-gray-400">Skew信号：</span>Put Skew高 → 市场对冲需求大；Call Skew高 → 追涨情绪强</p>
          <p><span className="text-gray-400">安全策略：</span>卖方策略最小 1.5x 隐含波动缓冲；期权亏40%强制平仓</p>
        </div>
      </div>
    </div>
  );
}
