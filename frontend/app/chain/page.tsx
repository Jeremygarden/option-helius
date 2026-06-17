"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, WifiOff, Zap } from "lucide-react";
import KPIBar from "@/components/chain/KPIBar";
import IVSurface3D from "@/components/chain/IVSurface3D";
import TermStructure from "@/components/chain/TermStructure";
import OIVolChart from "@/components/chain/OIVolChart";
import GEXChart from "@/components/chain/GEXChart";
import {
  ChainResponse,
  GexPoint,
  IVSurfacePoint,
  SummaryResponse,
  createMockChain,
  createMockExpirations,
  createMockGex,
  createMockIVSurface,
  fetchJson,
  formatMoney,
  normalizeTicker,
  summarizeChain,
  toExpirationItem,
} from "@/lib/chainData";

/* ─── Chart card wrapper ─────────────────────────────────────── */
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col rounded-lg border overflow-hidden"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between px-4 pt-4 pb-3 border-b"
        style={{ borderColor: "var(--border-muted)" }}
      >
        <div>
          <h3
            className="text-sm font-semibold leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {/* Body */}
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}

/* ─── DTE badge color ────────────────────────────────────────── */
function dteBadgeColor(dte: number): string {
  if (dte <= 7) return "#f85149";
  if (dte <= 21) return "#f0883e";
  if (dte <= 45) return "#58a6ff";
  return "#8b949e";
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function ChainPage() {
  const [ticker, setTicker] = useState("NVDA");
  const [draftTicker, setDraftTicker] = useState("NVDA");
  const [expiry, setExpiry] = useState<string | null>(null);
  const [expirations, setExpirations] = useState<string[]>([]);
  const [chain, setChain] = useState<ChainResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [gex, setGex] = useState<GexPoint[]>([]);
  const [surface, setSurface] = useState<IVSurfacePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const mockExp = createMockExpirations();
      const expResult = await fetchJson<{ ticker: string; expirations: string[] }>(
        `/api/options/expirations/${ticker}`,
        { ticker, expirations: mockExp },
      );
      const dates = expResult.data.expirations?.length ? expResult.data.expirations : mockExp;
      const selected = expiry && dates.includes(expiry) ? expiry : dates[0];
      const mockChain = createMockChain(ticker, selected);
      const [chainResult, summaryResult, gexResult, surfaceResult] = await Promise.all([
        fetchJson<ChainResponse>(`/api/options/chain/${ticker}?expiry=${selected}`, mockChain),
        fetchJson<SummaryResponse>(`/api/options/summary/${ticker}`, summarizeChain(mockChain)),
        fetchJson<GexPoint[]>(`/api/options/gex/${ticker}?expiry=${selected}`, createMockGex(mockChain)),
        fetchJson<IVSurfacePoint[]>(`/api/options/iv-surface/${ticker}`, createMockIVSurface(ticker)),
      ]);
      if (cancelled) return;
      const nextChain = chainResult.data.options?.length ? chainResult.data : mockChain;
      const chainSummary = summarizeChain(nextChain);
      const nextSummary = {
        ...chainSummary,
        ...summaryResult.data,
        expiry: selected,
        call_oi: chainSummary.call_oi,
        put_oi: chainSummary.put_oi,
        net_gex: gexResult.data.reduce((sum, p) => sum + p.gex * 1_000_000, 0),
      };
      setExpirations(dates);
      setExpiry(selected);
      setChain(nextChain);
      setSummary(nextSummary);
      setGex(gexResult.data.length ? gexResult.data : createMockGex(nextChain));
      setSurface(surfaceResult.data.length ? surfaceResult.data : createMockIVSurface(ticker));
      const errors = [expResult, chainResult, summaryResult, gexResult, surfaceResult]
        .filter((r) => r.fallback && r.error)
        .map((r) => r.error);
      setError(errors.length ? Array.from(new Set(errors)).slice(0, 2).join("; ") : null);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ticker, expiry, refreshing]);

  const expiryItems = useMemo(() => expirations.map(toExpirationItem), [expirations]);
  const netGex = gex.reduce((sum, p) => sum + p.gex * 1_000_000, 0);

  function submitTicker(event: FormEvent) {
    event.preventDefault();
    const next = normalizeTicker(draftTicker);
    setDraftTicker(next);
    setExpiry(null);
    setTicker(next);
  }

  return (
    <div className="flex flex-col gap-4 pb-8">

      {/* ── Page header row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Spot price pill */}
          {summary?.spot && (
            <div
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 border font-mono text-sm font-bold"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border-default)",
                color: "var(--accent-green)",
              }}
            >
              <Zap size={13} />
              {formatMoney(summary.spot)}
            </div>
          )}
          {/* Data state badge */}
          <div
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 border text-xs font-mono"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-default)",
              color: error ? "var(--accent-yellow)" : "var(--accent-green)",
            }}
          >
            {error ? <WifiOff size={12} /> : <ShieldCheck size={12} />}
            {error ? "FALLBACK" : "LIVE"}
          </div>
        </div>

        {/* Ticker form */}
        <form onSubmit={submitTicker} className="flex items-center gap-2">
          <input
            value={draftTicker}
            onChange={(e) => setDraftTicker(e.target.value)}
            className="h-9 w-28 rounded-lg border px-3 font-mono text-sm uppercase transition focus:outline-none focus:border-[#58a6ff]"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
            placeholder="Ticker"
          />
          <button
            type="submit"
            className="h-9 rounded-lg px-4 text-sm font-semibold transition hover:brightness-110"
            style={{ background: "#1158c7", color: "#fff" }}
          >
            载入
          </button>
          <button
            type="button"
            onClick={() => setRefreshing((x) => x + 1)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border transition hover:brightness-110"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-default)",
              color: "var(--text-muted)",
            }}
            aria-label="刷新"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </form>
      </div>

      {/* ── KPI bar ── */}
      <KPIBar summary={summary} loading={loading} error={error} />

      {/* ── Expiry tab bar ── */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        <span
          className="shrink-0 text-xs font-semibold mr-1"
          style={{ color: "var(--text-muted)" }}
        >
          到期日
        </span>
        {expiryItems.map((item) => {
          const isActive = item.date === expiry;
          return (
            <button
              key={item.date}
              onClick={() => setExpiry(item.date)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium transition-colors border"
              style={{
                background: isActive ? "var(--accent-blue)" : "var(--bg-surface)",
                borderColor: isActive ? "var(--accent-blue)" : "var(--border-default)",
                color: isActive ? "#fff" : "var(--text-secondary)",
              }}
            >
              <span>{item.label}</span>
              <span
                className="text-[10px] font-bold px-1 rounded"
                style={{
                  background: isActive ? "rgba(255,255,255,0.2)" : "var(--bg-elevated)",
                  color: isActive ? "#fff" : dteBadgeColor(item.dte),
                }}
              >
                {item.dte}D
              </span>
              {!isActive && (
                <span
                  className="text-[9px] uppercase"
                  style={{ color: item.kind === "Monthly" ? "#f0883e" : "var(--text-muted)" }}
                >
                  {item.kind[0]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Charts: 2-column top row ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="IV 曲面 / IV Surface 3D"
          subtitle="Strike × DTE × 隐含波动率，悬停查看节点数据"
        >
          <IVSurface3D data={surface} spot={summary?.spot} loading={loading} />
        </ChartCard>

        <ChartCard
          title="IV 期限结构 / Term Structure"
          subtitle="ATM IV（蓝线）+ 预期波动（橙线）双轴"
        >
          <TermStructure surface={surface} summary={summary} loading={loading} />
        </ChartCard>
      </div>

      {/* ── Charts: full-width bottom row ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="持仓/成交分布 / OI & Volume"
          subtitle="各行权价 Call/Put 持仓量 + 成交量对比"
        >
          <OIVolChart chain={chain} loading={loading} />
        </ChartCard>

        <ChartCard
          title="GEX 分布 / Gamma Exposure"
          subtitle="各行权价正/负 Gamma 敞口，Max Pain 标记"
        >
          <GEXChart
            data={gex}
            summary={{ ...(summary || { ticker }), net_gex: netGex }}
            loading={loading}
          />
        </ChartCard>
      </div>

    </div>
  );
}
