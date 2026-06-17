"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Layout } from "plotly.js";
import { IVSurfacePoint, formatIV } from "@/lib/chainData";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
      Loading Plotly surface…
    </div>
  ),
});

type Mode = "3d" | "money" | "table";
type IVSurface3DProps = { data: IVSurfacePoint[]; spot?: number; loading?: boolean };

export default function IVSurface3D({ data, spot, loading }: IVSurface3DProps) {
  const [mode, setMode] = useState<Mode>("3d");

  const matrix = useMemo(() => {
    const strikes = Array.from(new Set(data.map((p) => p.strike))).sort((a, b) => a - b);
    const dtes = Array.from(new Set(data.map((p) => p.dte))).sort((a, b) => a - b);
    const lookup = new Map(data.map((p) => [`${p.strike}-${p.dte}`, p.iv]));
    return {
      strikes,
      dtes,
      z: dtes.map((dte) => strikes.map((strike) => lookup.get(`${strike}-${dte}`) ?? null)),
    };
  }, [data]);

  const rows = useMemo(
    () =>
      data
        .map((p) => ({ ...p, moneyness: spot ? (p.strike / spot - 1) * 100 : 0 }))
        .filter((p) => !spot || Math.abs(p.moneyness) <= 18)
        .slice(0, 90),
    [data, spot],
  );

  // Use `as any` to bypass strict plotly type checking for the surface contours property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plotData: any[] = [
    mode === "3d"
      ? {
          type: "surface",
          x: matrix.strikes,
          y: matrix.dtes,
          z: matrix.z,
          colorscale: [
            [0, "#0d1117"],
            [0.22, "#1f6feb"],
            [0.55, "#58a6ff"],
            [0.78, "#f0883e"],
            [1, "#f85149"],
          ],
          hovertemplate: "Strike $%{x}<br>DTE %{y}<br>IV %{z:.2%}<extra></extra>",
          contours: { z: { show: true, usecolormap: true, highlightcolor: "#e6edf3", project: { z: true } } },
          showscale: false,
        }
      : {
          type: "heatmap",
          x: matrix.strikes,
          y: matrix.dtes,
          z: matrix.z,
          colorscale: "YlGnBu",
          hovertemplate: "Strike $%{x}<br>DTE %{y}<br>IV %{z:.2%}<extra></extra>",
          showscale: false,
        },
  ];

  const layout: Partial<Layout> = {
    autosize: true,
    margin: { l: 0, r: 0, b: 0, t: 8 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "var(--text-muted)", size: 10 },
    scene: {
      xaxis: { title: { text: "Strike" }, gridcolor: "var(--border-default)", color: "var(--text-muted)", zerolinecolor: "var(--border-default)" },
      yaxis: { title: { text: "DTE" }, gridcolor: "var(--border-default)", color: "var(--text-muted)", zerolinecolor: "var(--border-default)" },
      zaxis: { title: { text: "IV" }, tickformat: ".0%", gridcolor: "var(--border-default)", color: "var(--text-muted)" },
      camera: { eye: { x: 1.55, y: 1.35, z: 0.92 } },
      bgcolor: "rgba(0,0,0,0)",
    },
    xaxis: { color: "var(--text-muted)", gridcolor: "var(--border-default)", title: { text: "Strike" } },
    yaxis: { color: "var(--text-muted)", gridcolor: "var(--border-default)", title: { text: "DTE" } },
  };

  return (
    <div className="card h-full min-h-[380px] overflow-hidden p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold tracking-wide">IV Surface 3D / 波动率曲面</h3>
          <p className="text-xs text-[var(--text-muted)]">Strike × DTE × implied volatility</p>
        </div>
        <div className="flex rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-1 text-[11px]">
          {(["3d", "money", "table"] as Mode[]).map((item) => (
            <button
              key={item}
              onClick={() => setMode(item)}
              className={`rounded px-2 py-1 uppercase transition-colors ${
                mode === item
                  ? "bg-[var(--accent-blue)] text-[var(--bg-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {item === "money" ? "$" : item}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[310px] w-full">
        {loading ? (
          <div className="h-full animate-pulse rounded bg-[var(--bg-primary)]" />
        ) : mode === "table" ? (
          <div className="h-full overflow-auto rounded border border-[var(--border-default)]">
            <table className="w-full min-w-[520px] text-left font-mono text-xs">
              <thead className="sticky top-0 bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 py-2">Strike</th>
                  <th className="px-3 py-2">DTE</th>
                  <th className="px-3 py-2">IV</th>
                  <th className="px-3 py-2">Moneyness</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, idx) => (
                  <tr
                    key={`${p.strike}-${p.dte}-${idx}`}
                    className="border-t border-[var(--border-default)]/60 hover:bg-[var(--bg-primary)]"
                  >
                    <td className="px-3 py-2 text-[var(--text-primary)]">${p.strike}</td>
                    <td className="px-3 py-2">{p.dte}</td>
                    <td className="px-3 py-2 text-[var(--accent-blue)]">{formatIV(p.iv)}</td>
                    <td className={p.strike >= (spot || 0) ? "px-3 py-2 text-[var(--color-bullish)]" : "px-3 py-2 text-[var(--color-bearish)]"}>
                      {spot ? `${p.moneyness.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Plot
            data={plotData}
            layout={layout}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
            config={{ displayModeBar: false, responsive: true }}
          />
        )}
      </div>
    </div>
  );
}
