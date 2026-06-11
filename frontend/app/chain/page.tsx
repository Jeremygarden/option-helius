"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ShieldCheck, WifiOff } from "lucide-react";
import KPIBar from "@/components/chain/KPIBar";
import IVSurface3D from "@/components/chain/IVSurface3D";
import TermStructure from "@/components/chain/TermStructure";
import OIVolChart from "@/components/chain/OIVolChart";
import GEXChart from "@/components/chain/GEXChart";
import { ChainResponse, GexPoint, IVSurfacePoint, SummaryResponse, createMockChain, createMockExpirations, createMockGex, createMockIVSurface, fetchJson, formatMoney, normalizeTicker, summarizeChain, toExpirationItem } from "@/lib/chainData";

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
      const expResult = await fetchJson<{ ticker: string; expirations: string[] }>(`/api/options/expirations/${ticker}`, { ticker, expirations: mockExp });
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
      const nextSummary = { ...chainSummary, ...summaryResult.data, expiry: selected, call_oi: chainSummary.call_oi, put_oi: chainSummary.put_oi, net_gex: gexResult.data.reduce((sum, p) => sum + p.gex * 1_000_000, 0) };
      setExpirations(dates);
      setExpiry(selected);
      setChain(nextChain);
      setSummary(nextSummary);
      setGex(gexResult.data.length ? gexResult.data : createMockGex(nextChain));
      setSurface(surfaceResult.data.length ? surfaceResult.data : createMockIVSurface(ticker));
      const errors = [expResult, chainResult, summaryResult, gexResult, surfaceResult].filter((r) => r.fallback && r.error).map((r) => r.error);
      setError(errors.length ? Array.from(new Set(errors)).slice(0, 2).join("; ") : null);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [ticker, expiry, refreshing]);

  const expiryItems = useMemo(() => expirations.map(toExpirationItem), [expirations]);
  const activeExpiry = expiryItems.find((item) => item.date === expiry);
  const netGex = gex.reduce((sum, p) => sum + p.gex * 1_000_000, 0);

  function submitTicker(event: FormEvent) {
    event.preventDefault();
    const next = normalizeTicker(draftTicker);
    setDraftTicker(next);
    setExpiry(null);
    setTicker(next);
  }

  return <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(88,166,255,0.10),transparent_34%),#0d1117] pb-8"><div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#30363d] bg-[#161b22]/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#58a6ff]"><span className="h-1.5 w-1.5 rounded-full bg-[#3fb950] shadow-[0_0_12px_#3fb950]" /> NUX Options Terminal</div><h1 className="text-3xl font-black tracking-tight text-[#e6edf3]">{ticker} 期权链 / Options Chain</h1><p className="text-sm text-[#7d8590]">Production-grade derivatives cockpit with live API sync and deterministic fallback.</p></div><form onSubmit={submitTicker} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8590]" size={16} /><input value={draftTicker} onChange={(e) => setDraftTicker(e.target.value)} className="h-10 w-full rounded-md border border-[#30363d] bg-[#161b22] pl-9 pr-3 font-mono text-sm uppercase outline-none transition focus:border-[#58a6ff] sm:w-56" placeholder="Ticker" /></div><button className="h-10 rounded-md border border-[#58a6ff]/50 bg-[#58a6ff]/10 px-4 text-sm font-bold text-[#58a6ff] transition hover:bg-[#58a6ff] hover:text-[#0d1117]">Load Chain</button><button type="button" onClick={() => setRefreshing((x) => x + 1)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#30363d] bg-[#161b22] px-3 text-sm text-[#7d8590] hover:text-[#e6edf3]"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />Refresh</button></form></div>

    <div className="mb-5 overflow-hidden rounded-lg border border-[#30363d] bg-[#161b22]/80"><div className="flex items-center gap-2 overflow-x-auto p-2">{expiryItems.map((item) => <button key={item.date} onClick={() => setExpiry(item.date)} className={`min-w-[132px] rounded-md border px-3 py-2 text-left transition ${item.date === expiry ? "border-[#58a6ff] bg-[#58a6ff]/12 shadow-[0_0_0_1px_rgba(88,166,255,0.22)_inset]" : "border-[#30363d] bg-[#0d1117] hover:border-[#58a6ff]/50"}`}><span className="block font-mono text-sm font-black text-[#e6edf3]">{item.label}</span><span className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-[#7d8590]"><span>{item.dte} DTE</span><span className={item.kind === "Monthly" ? "text-[#f0883e]" : "text-[#58a6ff]"}>{item.kind}</span></span></button>)}</div></div>

    <KPIBar summary={summary} loading={loading} error={error} />

    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4"><div className="card p-3"><p className="text-[10px] uppercase tracking-[0.16em] text-[#7d8590]">Selected Expiry</p><p className="mt-1 font-mono text-lg font-bold text-[#e6edf3]">{activeExpiry?.date || "—"}</p></div><div className="card p-3"><p className="text-[10px] uppercase tracking-[0.16em] text-[#7d8590]">Spot</p><p className="mt-1 font-mono text-lg font-bold text-[#58a6ff]">{formatMoney(summary?.spot)}</p></div><div className="card p-3"><p className="text-[10px] uppercase tracking-[0.16em] text-[#7d8590]">Contracts</p><p className="mt-1 font-mono text-lg font-bold text-[#e6edf3]">{(chain?.options.length || 0).toLocaleString()}</p></div><div className="card p-3"><p className="text-[10px] uppercase tracking-[0.16em] text-[#7d8590]">Data State</p><p className={`mt-1 flex items-center gap-2 font-mono text-sm font-bold ${error ? "text-[#f0883e]" : "text-[#3fb950]"}`}>{error ? <WifiOff size={15} /> : <ShieldCheck size={15} />}{error ? "FALLBACK" : "LIVE API"}</p></div></div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><IVSurface3D data={surface} spot={summary?.spot} loading={loading} /><TermStructure surface={surface} summary={summary} loading={loading} /><OIVolChart chain={chain} loading={loading} /><GEXChart data={gex} summary={{ ...(summary || { ticker }), net_gex: netGex }} loading={loading} /></div>
  </div>;
}
