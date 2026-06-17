"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, WifiOff, Zap, Search } from "lucide-react";
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
    <div className="card flex flex-col h-full">
      <div className="card-header">
        <div>
          <h3 className="card-title text-base">{title}</h3>
          {subtitle && (
            <p className="text-ui-sm mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-[320px]">{children}</div>
    </div>
  );
}

/* ─── DTE badge color ────────────────────────────────────────── */
function dteBadgeColor(dte: number): string {
  if (dte <= 7) return "#E91E63"; // accent-pink
  if (dte <= 21) return "#F5A623"; // accent-orange
  if (dte <= 45) return "#2F6BFF"; // accent-blue
  return "#9A9FA5"; // text-muted
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
    <div className="flex flex-col gap-6 pb-12 max-w-[1600px] mx-auto px-4 md:px-8">

      {/* ── Page header row ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1D1F]">
            {ticker}
            <span className="text-lg font-medium text-[#9A9FA5] ml-2">Chain</span>
          </h1>

          {/* Spot price pill */}
          {summary?.spot && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-2 border border-[#EDF0F2] bg-white font-mono text-base font-bold text-[#2EB6D2] shadow-sm">
              <Zap size={14} fill="currentColor" />
              {formatMoney(summary.spot)}
            </div>
          )}
          {/* Quick Stats */}
          <div className="flex items-center gap-3">
            {["BTC", "ETH", "SOL", "NVDA", "AAPL", "TSLA"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setDraftTicker(t);
                  setTicker(t);
                  setExpiry(null);
                }}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  ticker === t 
                    ? "bg-[#2F6BFF] text-white shadow-md shadow-blue-200" 
                    : "bg-white text-[#6F767E] border border-[#EDF0F2] hover:border-[#2F6BFF] hover:text-[#2F6BFF]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Ticker form */}
        <form onSubmit={submitTicker} className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9FA5]" size={16} />
            <input
              value={draftTicker}
              onChange={(e) => setDraftTicker(e.target.value)}
              className="h-11 w-40 rounded-xl border border-[#EDF0F2] bg-white pl-10 pr-4 font-mono text-base font-bold uppercase transition focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] shadow-sm"
              placeholder="Search..."
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-[#2F6BFF] px-6 text-sm font-bold text-white transition hover:bg-[#1A56FF] active:scale-95 shadow-lg shadow-blue-500/20"
          >
            Load
          </button>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 border text-[10px] font-bold tracking-wider shadow-sm ${
                error ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"
              }`}>
                {error ? <WifiOff size={12} /> : <ShieldCheck size={12} />}
                {error ? "FALLBACK" : "LIVE"}
              </div>
              <button
                type="button"
                onClick={() => setRefreshing((x) => x + 1)}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-[#EDF0F2] bg-white text-[#6F767E] transition hover:bg-gray-50 active:scale-95 shadow-sm"
                aria-label="Refresh"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── KPI bar ── */}
      <KPIBar summary={summary} loading={loading} error={error} />

      {/* ── Expiry tab bar ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#9A9FA5] uppercase tracking-widest px-1">
            Expiration Select
          </span>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
          {expiryItems.map((item) => {
            const isActive = item.date === expiry;
            return (
              <button
                key={item.date}
                onClick={() => setExpiry(item.date)}
                className={`tab-pill shrink-0 flex items-center gap-2 px-5 py-2.5 shadow-sm ${
                  isActive ? "tab-pill-active" : "tab-pill-inactive"
                }`}
              >
                <span className="font-bold">{item.label}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                  isActive ? "bg-white/20" : "bg-gray-100"
                }`} style={{ color: isActive ? "#fff" : dteBadgeColor(item.dte) }}>
                  {item.dte}D
                </span>
                {!isActive && (
                  <span className={`text-[9px] font-bold uppercase ${
                    item.kind === "Monthly" ? "text-orange-500" : "text-gray-400"
                  }`}>
                    {item.kind[0]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Charts: 2-column grid ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="min-w-0">
          <ChartCard
            title="IV Surface 3D"
            subtitle="Strike × DTE × Implied Volatility"
          >
            <IVSurface3D data={surface} spot={summary?.spot} loading={loading} />
          </ChartCard>
        </div>

        <div className="min-w-0">
          <ChartCard
            title="Term Structure"
            subtitle="ATM IV vs Expected Volatility"
          >
            <TermStructure surface={surface} summary={summary} loading={loading} />
          </ChartCard>
        </div>

        <div className="min-w-0">
          <ChartCard
            title="OI & Volume Distribution"
            subtitle="Call/Put Open Interest and Volume by Strike"
          >
            <OIVolChart chain={chain} loading={loading} />
          </ChartCard>
        </div>

        <div className="min-w-0">
          <ChartCard
            title="Gamma Exposure (GEX)"
            subtitle="Gamma Exposure per Strike with Max Pain indicator"
          >
            <GEXChart
              data={gex}
              summary={{ ...(summary || { ticker }), net_gex: netGex }}
              loading={loading}
            />
          </ChartCard>
        </div>
      </div>

    </div>
  );
}
