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
    <div className="card flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/5">
      <div className="card-header border-b border-[var(--border-muted)] -mx-5 -mt-5 px-5 py-4 bg-[var(--bg-base)]/30">
        <div>
          <h3 className="card-title text-sm font-bold tracking-tight text-[var(--text-primary)] font-sans">{title}</h3>
          {subtitle && (
            <p className="text-[10px] font-medium text-[var(--text-secondary)] mt-0.5 uppercase tracking-wider font-mono">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-[320px] pt-4 font-mono">{children}</div>
    </div>
  );
}

/* ─── DTE badge color ────────────────────────────────────────── */
function dteBadgeColor(dte: number): string {
  if (dte <= 7) return "var(--accent-pink)"; 
  if (dte <= 21) return "var(--accent-orange)"; 
  if (dte <= 45) return "var(--accent-blue)"; 
  return "var(--text-muted)";
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
    <div className="flex flex-col gap-4 pb-12 max-w-[1600px] mx-auto px-4 md:px-8 font-mono">

      {/* ── Page header row ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-tighter text-[var(--text-primary)] font-sans">
              {ticker}
            </h1>
            <span className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Options Terminal</span>
          </div>

          {/* Spot price pill */}
          {summary?.spot && (
            <div className="flex items-center gap-4 rounded-lg px-4 py-2 border border-[var(--border-default)] bg-[var(--bg-surface)] font-mono text-base font-bold text-[var(--accent-teal)] shadow-sm">
              <Zap size={14} fill="currentColor" />
              {formatMoney(summary.spot)}
            </div>
          )}

          {/* Quick Stats */}
          <div className="flex items-center gap-4.5 bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-default)] shadow-sm">
            {["SPY", "QQQ", "NVDA", "AAPL", "TSLA", "VIX"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setDraftTicker(t);
                  setTicker(t);
                  setExpiry(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                  ticker === t 
                    ? "bg-[var(--accent-blue)] text-white shadow-md shadow-blue-200" 
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-base)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Ticker form */}
        <form onSubmit={submitTicker} className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-blue)] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none" size={16} />
            <input
              value={draftTicker}
              onChange={(e) => setDraftTicker(e.target.value)}
              className="h-10 w-44 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] pl-10 pr-4 font-mono text-sm font-bold uppercase transition focus:outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:border-[var(--accent-blue)] shadow-sm"
              placeholder="ENTER TICKER..."
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-lg bg-[var(--accent-blue)] px-6 text-xs font-black uppercase tracking-widest text-white transition hover:brightness-110 active:scale-95 shadow-lg shadow-blue-500/20"
          >
            Load
          </button>
          
          <div className="flex items-center gap-4 ml-2">
            <div className={`flex items-center gap-4.5 rounded-lg px-3 py-2 border text-[9px] font-black tracking-widest shadow-sm ${
              error ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${error ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              {error ? "OFFLINE" : "LIVE"}
            </div>
            <button
              type="button"
              onClick={() => setRefreshing((x) => x + 1)}
              className="h-10 w-10 flex items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-base)] active:scale-95 shadow-sm"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </form>
      </div>

      {/* ── KPI bar ── */}
      <div className="mb-2"><KPIBar summary={summary} loading={loading} error={error} /></div>

      {/* ── Expiry tab bar ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">
            Select Expiration
          </span>
          {expiry && (
             <span className="text-[10px] font-mono font-bold text-[var(--accent-blue)]">
               Active: {expiry}
             </span>
          )}
        </div>
        <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
          {expiryItems.map((item) => {
            const isActive = item.date === expiry;
            return (
              <button
                key={item.date}
                onClick={() => setExpiry(item.date)}
                className={`tab-pill shrink-0 flex items-center gap-4 px-4 py-2 border transition-all duration-200 ${
                  isActive 
                    ? "bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white shadow-lg shadow-blue-500/25 translate-y-[-1px]" 
                    : "bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-blue)]"
                }`}
              >
                <span className="text-xs font-bold font-mono">{item.label}</span>
                <span 
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${
                    isActive ? "bg-white/20 text-white" : "bg-[var(--bg-base)]"
                  }`} 
                  style={{ color: isActive ? undefined : dteBadgeColor(item.dte) }}
                >
                  {item.dte}D
                </span>
                {!isActive && item.kind === "Monthly" && (
                  <div className="w-1 h-1 rounded-full bg-[var(--accent-orange)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Charts: 2-column grid ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="min-w-0">
          <ChartCard
            title="IV Surface 3D"
            subtitle="STRIKE × DTE × IMPLIED VOLATILITY"
          >
            <IVSurface3D data={surface} spot={summary?.spot} loading={loading} />
          </ChartCard>
        </div>

        <div className="min-w-0">
          <ChartCard
            title="Term Structure"
            subtitle="ATM IV VS EXPECTED VOLATILITY"
          >
            <TermStructure surface={surface} summary={summary} loading={loading} />
          </ChartCard>
        </div>

        <div className="min-w-0">
          <ChartCard
            title="OI & Volume Distribution"
            subtitle="CALL/PUT OPEN INTEREST AND VOLUME BY STRIKE"
          >
            <OIVolChart chain={chain} loading={loading} />
          </ChartCard>
        </div>

        <div className="min-w-0">
          <ChartCard
            title="Gamma Exposure (GEX)"
            subtitle="GAMMA EXPOSURE PER STRIKE WITH MAX PAIN"
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
