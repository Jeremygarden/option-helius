"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Data, Layout } from "plotly.js";
import { IVSurfacePoint, formatIV } from "@/lib/chainData";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-xs text-[#7d8590]">Loading Plotly surface…</div> });
type Mode = "3d" | "money" | "table";
type IVSurface3DProps = { data: IVSurfacePoint[]; spot?: number; loading?: boolean };

export default function IVSurface3D({ data, spot, loading }: IVSurface3DProps) {
  const [mode, setMode] = useState<Mode>("3d");
  const matrix = useMemo(() => {
    const strikes = Array.from(new Set(data.map((p) => p.strike))).sort((a, b) => a - b);
    const dtes = Array.from(new Set(data.map((p) => p.dte))).sort((a, b) => a - b);
    const lookup = new Map(data.map((p) => [`${p.strike}-${p.dte}`, p.iv]));
    return { strikes, dtes, z: dtes.map((dte) => strikes.map((strike) => lookup.get(`${strike}-${dte}`) ?? null)) };
  }, [data]);
  const rows = useMemo(() => data.map((p) => ({ ...p, moneyness: spot ? (p.strike / spot - 1) * 100 : 0 })).filter((p) => !spot || Math.abs(p.moneyness) <= 18).slice(0, 90), [data, spot]);
  const plotData: Data[] = [mode === "3d" ? { type: "surface", x: matrix.strikes, y: matrix.dtes, z: matrix.z, colorscale: [[0, "#0d1117"], [0.22, "#1f6feb"], [0.55, "#58a6ff"], [0.78, "#f0883e"], [1, "#f85149"]], hovertemplate: "Strike $%{x}<br>DTE %{y}<br>IV %{z:.2%}<extra></extra>", contours: { z: { show: true, usecolormap: true, highlightcolor: "#e6edf3", project: { z: true } } }, showscale: false } : { type: "heatmap", x: matrix.strikes, y: matrix.dtes, z: matrix.z, colorscale: "YlGnBu", hovertemplate: "Strike $%{x}<br>DTE %{y}<br>IV %{z:.2%}<extra></extra>", showscale: false }];
  const layout: Partial<Layout> = { autosize: true, margin: { l: 0, r: 0, b: 0, t: 8 }, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", font: { color: "#7d8590", size: 10 }, scene: { xaxis: { title: { text: "Strike" }, gridcolor: "#30363d", color: "#7d8590", zerolinecolor: "#30363d" }, yaxis: { title: { text: "DTE" }, gridcolor: "#30363d", color: "#7d8590", zerolinecolor: "#30363d" }, zaxis: { title: { text: "IV" }, tickformat: ".0%", gridcolor: "#30363d", color: "#7d8590" }, camera: { eye: { x: 1.55, y: 1.35, z: 0.92 } }, bgcolor: "rgba(0,0,0,0)" }, xaxis: { color: "#7d8590", gridcolor: "#30363d", title: { text: "Strike" } }, yaxis: { color: "#7d8590", gridcolor: "#30363d", title: { text: "DTE" } } };
  return <div className="card h-full min-h-[380px] overflow-hidden p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold tracking-wide">IV Surface 3D / 波动率曲面</h3><p className="text-xs text-[#7d8590]">Strike × DTE × implied volatility, hover for exact nodes</p></div><div className="flex rounded-md border border-[#30363d] bg-[#0d1117] p-1 text-[11px]">{(["3d", "money", "table"] as Mode[]).map((item) => <button key={item} onClick={() => setMode(item)} className={`rounded px-2 py-1 uppercase ${mode === item ? "bg-[#58a6ff] text-[#0d1117]" : "text-[#7d8590] hover:text-[#e6edf3]"}`}>{item === "money" ? "$" : item}</button>)}</div></div><div className="h-[310px] w-full">{loading ? <div className="h-full animate-pulse rounded bg-[#0d1117]" /> : mode === "table" ? <div className="h-full overflow-auto rounded border border-[#30363d]"><table className="w-full min-w-[520px] text-left font-mono text-xs"><thead className="sticky top-0 bg-[#161b22] text-[#7d8590]"><tr><th className="px-3 py-2">Strike</th><th className="px-3 py-2">DTE</th><th className="px-3 py-2">IV</th><th className="px-3 py-2">Moneyness</th></tr></thead><tbody>{rows.map((p, idx) => <tr key={`${p.strike}-${p.dte}-${idx}`} className="border-t border-[#30363d]/60 hover:bg-[#0d1117]"><td className="px-3 py-2 text-[#e6edf3]">${p.strike}</td><td className="px-3 py-2">{p.dte}</td><td className="px-3 py-2 text-[#58a6ff]">{formatIV(p.iv)}</td><td className={p.strike >= (spot || 0) ? "px-3 py-2 text-[#3fb950]" : "px-3 py-2 text-[#f85149]"}>{spot ? `${p.moneyness.toFixed(1)}%` : "—"}</td></tr>)}</tbody></table></div> : <Plot data={plotData} layout={layout} style={{ width: "100%", height: "100%" }} useResizeHandler config={{ displayModeBar: false, responsive: true }} />}</div></div>;
}
