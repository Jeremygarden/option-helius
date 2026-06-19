'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import RunRiskPanel from '@/components/macro/RunRiskPanel';
import BacktestTable from '@/components/macro/BacktestTable';

export default function MacroPage() {
  const [macroData, setMacroData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [indicatorsResp, compositeResp] = await Promise.all([
        fetch("/api/macro/indicators"),
        fetch("/api/macro/composite")
      ]);

      if (!indicatorsResp.ok || !compositeResp.ok) {
        throw new Error(`API error: indicators=${indicatorsResp.status} composite=${compositeResp.status}`);
      }

      const indicators = await indicatorsResp.json();
      const composite = await compositeResp.json();

      setMacroData({
        run_risk: {
          composite_score: composite.score,
          ...composite
        },
        warning_indicators: {
          composite_score: composite.score,
          indicators: Object.entries(indicators).map(([id, data]: [string, any]) => ({
            id,
            ...data,
            value_display: typeof data.value === 'number' ? data.value.toFixed(2) : data.value,
          }))
        }
      });
    } catch (err) {
      console.error("Failed to fetch macro data", err);
      setError(err instanceof Error ? err.message : "API unavailable");
      // Keep macroData null — RunRiskPanel has its own mock data and will still render
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper to extract a specific indicator value from macroData
  function getIndicatorValue(id: string): string | null {
    if (!macroData?.warning_indicators?.indicators) return null;
    const ind = macroData.warning_indicators.indicators.find((i: any) => i.id === id);
    return ind ? ind.value_display : null;
  }

  // Build summary cards from real data when available, fall back to static values
  const summaryCards = [
    {
      label: "VIX INDEX",
      value: getIndicatorValue("vix") ?? "14.50",
      change: null,
      color: "text-[var(--accent-green)]"
    },
    {
      label: "YIELD CURVE (10Y-2Y)",
      value: getIndicatorValue("yield_curve") ?? "+15bps",
      change: null,
      color: "text-[var(--accent-orange)]"
    },
    {
      label: "DXY INDEX",
      value: getIndicatorValue("dxy") ?? "98.5",
      change: null,
      color: "text-[var(--accent-blue)]"
    },
    {
      label: "HY OAS",
      value: getIndicatorValue("hy_oas") ?? "278bps",
      change: null,
      color: "text-[var(--accent-green)]"
    },
  ];

  if (loading) return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold font-sans">宏观概览
          <span className="text-[var(--text-muted)] text-base font-normal ml-2 font-mono uppercase tracking-wider">Macro Dashboard</span>
        </h1>
      </div>
      {/* Skeleton loading state for each section */}
      <div className="h-64 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] animate-pulse" />
      <div className="h-48 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-20 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold font-sans">宏观概览
          <span className="text-[var(--text-muted)] text-base font-normal ml-2 font-mono uppercase tracking-wider">Macro Dashboard</span>
        </h1>
        <div className="flex items-center gap-2">
          {error && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-amber-950/30 border border-amber-500/30 text-amber-400 text-xs font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              OFFLINE: {error}
            </div>
          )}
          <button
            onClick={() => setRetryCount(c => c + 1)}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] active:scale-95 shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/40 focus-visible:outline-none disabled:opacity-50"
            aria-label="Refresh macro data"
            title="Refresh macro data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* RunRiskPanel always renders — it has its own mock data and gracefully shows it */}
      <RunRiskPanel />

      <BacktestTable />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((item) => (
          <div key={item.label} className="card card-hover">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wide font-mono">{item.label}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-xl font-bold font-mono tabular-nums ${item.color}`}>{item.value}</span>
              {item.change && (
                <span className="text-xs font-bold font-mono text-[var(--text-secondary)]">{item.change}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
           <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-4 font-sans">收益率曲线 <span className="text-[var(--text-muted)]">/ Yield Curve (1M - 30Y)</span></h3>
           <div className="h-64 border-l border-b border-[var(--border-default)] relative rounded">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
                 <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Yield curve visualization</span>
                 <span className="text-2xl font-bold uppercase text-[var(--text-secondary)] tracking-tight">Coming Soon</span>
              </div>
           </div>
        </div>
        <div className="card">
           <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-4 font-sans">当前市场状态 <span className="text-[var(--text-muted)]">/ Market Regime</span></h3>
           <div className="flex flex-col gap-4 mt-8">
              <div className="flex flex-col items-center">
                 <div className="w-32 h-32 rounded-full border-4 border-accent-teal/60 bg-accent-teal/5 flex items-center justify-center text-center text-accent-teal font-bold font-mono text-xs px-3 transition-all">
                    Low Vol Expansion
                 </div>
                 <span className="mt-4 text-sm font-medium text-[var(--text-primary)]">Risk-On Mode</span>
              </div>
              <div className="space-y-4 mt-4">
                 <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)] font-mono uppercase tracking-wider">Bullish Prob.</span>
                    <span className="text-[var(--accent-green)] font-mono font-bold tabular-nums">78%</span>
                 </div>
                 <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div className="h-full bg-accent-teal transition-all" style={{ width: '78%' }} />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
