"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GexPoint, SummaryResponse, formatMoney } from "@/lib/chainData";

type GEXChartProps = { data: GexPoint[]; summary?: SummaryResponse | null; loading?: boolean };

export default function GEXChart({ data, summary, loading }: GEXChartProps) {
  const rows = useMemo(() => data.map((p) => ({ ...p, gexDollar: p.gex * 1_000_000 })), [data]);
  const net = rows.reduce((sum, p) => sum + p.gexDollar, 0);
  return <div className="card h-full min-h-[380px] p-4"><div className="mb-3 flex items-start justify-between"><div><h3 className="text-sm font-bold tracking-wide">GEX Distribution / Gamma Exposure</h3><p className="text-xs text-[#7d8590]">Positive/negative gamma by strike, Max Pain marker</p></div><div className={`font-mono text-xs font-bold ${net < 0 ? "text-[#f85149]" : "text-[#3fb950]"}`}>{formatMoney(net, { signed: true, compact: true })}</div></div><div className="h-[310px]">{loading ? <div className="h-full animate-pulse rounded bg-[#0d1117]" /> : <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}><CartesianGrid stroke="#30363d" strokeDasharray="3 3" /><XAxis dataKey="strike" tick={{ fill: "#7d8590", fontSize: 10 }} axisLine={{ stroke: "#30363d" }} tickLine={false} interval="preserveStartEnd" /><YAxis tick={{ fill: "#7d8590", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Number(v).toFixed(0)}M`} /><Tooltip cursor={{ fill: "rgba(88,166,255,0.08)" }} contentStyle={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3" }} formatter={(v: number) => [`${Number(v).toFixed(2)}M`, "GEX"]} /><ReferenceLine y={0} stroke="#7d8590" /><ReferenceLine x={summary?.max_pain} stroke="#f0883e" strokeDasharray="4 4" label={{ value: "Max Pain", fill: "#f0883e", fontSize: 11, position: "insideTop" }} /><Bar dataKey="gex" name="GEX ($M)" radius={[2, 2, 0, 0]}>{rows.map((entry) => <Cell key={entry.strike} fill={entry.gex >= 0 ? "#3fb950" : "#f85149"} />)}</Bar></BarChart></ResponsiveContainer>}</div></div>;
}
