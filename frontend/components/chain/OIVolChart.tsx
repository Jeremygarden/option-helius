"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChainResponse } from "@/lib/chainData";

type OIVolChartProps = { chain?: ChainResponse | null; loading?: boolean };
type Mode = "bars" | "heatmap";

export default function OIVolChart({ chain, loading }: OIVolChartProps) {
  const [mode, setMode] = useState<Mode>("bars");
  const rows = useMemo(() => {
    const byStrike = new Map<number, { strike: number; callOi: number; putOi: number; callVol: number; putVol: number }>();
    (chain?.options || []).forEach((o) => {
      const row = byStrike.get(o.strike) || { strike: o.strike, callOi: 0, putOi: 0, callVol: 0, putVol: 0 };
      if (o.type === "call") { row.callOi += o.oi || 0; row.callVol += o.volume || 0; } else { row.putOi += o.oi || 0; row.putVol += o.volume || 0; }
      byStrike.set(o.strike, row);
    });
    return Array.from(byStrike.values()).sort((a, b) => a.strike - b.strike);
  }, [chain]);
  const maxValue = Math.max(1, ...rows.flatMap((r) => [r.callOi, r.putOi, r.callVol, r.putVol]));
  return <div className="card h-full min-h-[380px] p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold tracking-wide">OI/Vol Distribution / 持仓成交分布</h3><p className="text-xs text-[#7d8590]">Grouped Call/Put OI + Volume by strike</p></div><div className="flex rounded-md border border-[#30363d] bg-[#0d1117] p-1 text-[11px]"><button onClick={() => setMode("bars")} className={`rounded px-2 py-1 ${mode === "bars" ? "bg-[#58a6ff] text-[#0d1117]" : "text-[#7d8590]"}`}>柱状图</button><button onClick={() => setMode("heatmap")} className={`rounded px-2 py-1 ${mode === "heatmap" ? "bg-[#58a6ff] text-[#0d1117]" : "text-[#7d8590]"}`}>热力图</button></div></div><div className="h-[310px]">{loading ? <div className="h-full animate-pulse rounded bg-[#0d1117]" /> : mode === "heatmap" ? <div className="grid h-full content-start gap-1 overflow-auto rounded border border-[#30363d] p-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))" }}>{rows.map((r) => { const intensity = Math.max(r.callOi, r.putOi, r.callVol, r.putVol) / maxValue; return <div key={r.strike} className="rounded border border-[#30363d] p-2 font-mono text-[10px]" style={{ background: `rgba(88,166,255,${0.06 + intensity * 0.42})` }}><div className="mb-1 text-[#e6edf3]">${r.strike}</div><div className="text-[#3fb950]">C {Math.round(r.callOi / 1000)}k</div><div className="text-[#f85149]">P {Math.round(r.putOi / 1000)}k</div><div className="text-[#7d8590]">V {Math.round((r.callVol + r.putVol) / 1000)}k</div></div>; })}</div> : <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}><CartesianGrid stroke="#30363d" strokeDasharray="3 3" /><XAxis dataKey="strike" tick={{ fill: "#7d8590", fontSize: 10 }} axisLine={{ stroke: "#30363d" }} tickLine={false} interval="preserveStartEnd" /><YAxis tick={{ fill: "#7d8590", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(Number(v) / 1000)}k`} /><Tooltip cursor={{ fill: "rgba(88,166,255,0.08)" }} contentStyle={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3" }} /><Bar dataKey="callOi" name="Call OI" fill="#3fb950" radius={[2, 2, 0, 0]} /><Bar dataKey="putOi" name="Put OI" fill="#f85149" radius={[2, 2, 0, 0]} /><Bar dataKey="callVol" name="Call Vol" fill="#58a6ff" radius={[2, 2, 0, 0]} /><Bar dataKey="putVol" name="Put Vol" fill="#f0883e" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer>}</div></div>;
}
