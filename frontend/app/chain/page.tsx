"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { RefreshCw, Zap, Search } from "lucide-react";
import KPIBar from "@/components/chain/KPIBar";
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

/* Dynamic imports for chart components — reduces initial bundle by ~400KB */
const ChartLoadingFallback = () => (
  <div className="flex h-full min-h-[320px] items-center justify-center text-xs font-mono" style={{ color: "var(--text-muted)" }}>
    Loading chart…
  </div>
);
const IVSurface3D = dynamic(() => import("@/components/chain/IVSurface3D"), { ssr: false, loading: ChartLoadingFallback });
const TermStructure = dynamic(() => import("@/components/chain/TermStructure"), { ssr: false, loading: ChartLoadingFallback });
const OIVolChart = dynamic(() => import("@/components/chain/OIVolChart"), { ssr: false, loading: ChartLoadingFallback });
const GEXChart = dynamic(() => import("@/components/chain/GEXChart"), { ssr: false, loading: ChartLoadingFallback });

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
    <div className="card flex flex-col h-full overflow-hidden transition-shadow duration-200 hover:shadow-lg hover:shadow-black/20">
      <div className="card-header border-b border-[var(--border-muted)] -mx-5 -mt-5 px-5 py-3.5 bg-[var(--bg-base)]/40">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="card-title text-sm font-bold tracking-tight text-[var(--text-primary)] font-sans truncate">{title}</h3>
          {subtitle && (
            <p className="text-[10px] font-medium text-[var(--text-muted)] tracking-wide truncate">{subtitle}</p>
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
      try {
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
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Chain data load failed");
          // Populate with mock data so the page is usable even if everything fails
          const mockExp = createMockExpirations();
          const selected = mockExp[0];
          const mockChain = createMockChain(ticker, selected);
          setExpirations(mockExp);
          setExpiry(selected);
          setChain(mockChain);
          setSummary(summarizeChain(mockChain));
          setGex(createMockGex(mockChain));
          setSurface(createMockIVSurface(ticker));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ticker, expiry, refreshing]);

  const expiryItems = useMemo(() => expirations.map(toExpirationItem), [expirations]);
  const netGex = useMemo(() => gex.reduce((sum, p) => sum + p.gex * 1_000_000, 0), [gex]);

  const submitTicker = useCallback((event: FormEvent) => {
    event.preventDefault();
    const next = normalizeTicker(draftTicker);
    setDraftTicker(next);
    setExpiry(null);
    setTicker(next);
  }, [draftTicker]);

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-[1600px] mx-auto px-4 md:px-8 font-mono">

      {/* ── Page header row ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-black tracking-tighter text-[var(--text-primary)] font-sans leading-none">
              {ticker}
            </h1>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">
              Options Terminal
            </span>
          </div>

          {/* Spot price pill */}
          {summary?.spot && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-[var(--border-default)] bg-[var(--bg-surface)] font-mono text-sm font-bold tabular-nums text-[var(--accent-teal)] shadow-sm">
              <Zap size={12} fill="currentColor" />
              {formatMoney(summary.spot)}
            </div>
          )}

          {/* Quick picker */}
          <div
            role="group"
            aria-label="Quick ticker switch"
            className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-default)] shadow-sm"
          >
            {["SPY", "QQQ", "NVDA", "AAPL", "TSLA", "VIX"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setDraftTicker(t);
                  setTicker(t);
                  setExpiry(null);
                }}
                className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:outline-none ${
                  ticker === t
                    ? "bg-[var(--accent-blue)] text-white shadow-sm"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Ticker form */}
        <form onSubmit={submitTicker} className="flex items-center gap-2">
          <div className="relative group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-blue)] transition-colors pointer-events-none"
              size={14}
            />
            <input
              value={draftTicker}
              onChange={(e) => setDraftTicker(e.target.value)}
              className="h-9 w-44 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] pl-9 pr-3 font-mono text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] transition focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/40 focus:border-[var(--accent-blue)] shadow-sm"
              placeholder="Enter ticker…"
              aria-label="Ticker symbol"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-lg bg-[var(--accent-blue)] px-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:brightness-110 active:scale-95 shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/40 focus-visible:outline-none"
          >
            Load
          </button>

          <div className="flex items-center gap-2 ml-1">
            <div
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 border text-[9px] font-black tracking-widest shadow-sm ${
                error
                  ? "bg-[var(--accent-orange)]/10 border-[var(--accent-orange)]/40 text-[var(--accent-orange)]"
                  : "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/40 text-[var(--accent-green)]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  error ? "bg-[var(--accent-orange)] animate-pulse" : "bg-[var(--accent-green)]"
                }`}
              />
              {error ? "OFFLINE" : "LIVE"}
            </div>
            <button
              type="button"
              onClick={() => setRefreshing((x) => x + 1)}
              aria-label="Refresh data"
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] active:scale-95 shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/40 focus-visible:outline-none"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </form>
      </div>

      {/* ── KPI bar ── */}
      <KPIBar summary={summary} loading={loading} error={error} />

      {/* ── Expiry tab bar ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">
            Select Expiration
          </span>
          {expiry && (
            <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)] tabular-nums">
              Active: <span className="text-[var(--accent-blue)]">{expiry}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
          {expiryItems.map((item) => {
            const isActive = item.date === expiry;
            return (
              <button
                key={item.date}
                onClick={() => setExpiry(item.date)}
                aria-pressed={isActive}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/40 focus-visible:outline-none ${
                  isActive
                    ? "bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white shadow-md shadow-[var(--accent-blue)]/20"
                    : "bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-blue)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="font-mono tabular-nums">{item.label}</span>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                    isActive ? "bg-white/20 text-white" : "bg-[var(--bg-base)]"
                  }`}
                  style={{ color: isActive ? undefined : dteBadgeColor(item.dte) }}
                >
                  {item.dte}D
                </span>
                {!isActive && item.kind === "Monthly" && (
                  <div
                    className="w-1 h-1 rounded-full bg-[var(--accent-orange)]"
                    aria-label="Monthly expiry"
                  />
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
            subtitle="Strike × DTE × Implied Vol"
          >
            <IVSurface3D data={surface} spot={summary?.spot} loading={loading} />
          </ChartCard>
        </div>

        <div className="min-w-0">
          <ChartCard
            title="Term Structure"
            subtitle="ATM IV vs Expected Move"
          >
            <TermStructure surface={surface} summary={summary} loading={loading} />
          </ChartCard>
        </div>

        <div className="min-w-0">
          <ChartCard
            title="OI & Volume"
            subtitle="Call / Put open interest and volume by strike"
          >
            <OIVolChart chain={chain} loading={loading} />
          </ChartCard>
        </div>

        <div className="min-w-0">
          <ChartCard
            title="Gamma Exposure"
            subtitle="GEX per strike with max-pain marker"
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
