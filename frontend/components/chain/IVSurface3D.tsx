"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Layout } from "plotly.js";
import { IVSurfacePoint, formatIV } from "@/lib/chainData";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full items-center justify-center text-xs font-mono"
      style={{ color: "var(--text-muted)" }}
    >
      Loading 3D surface…
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
      z: dtes.map((dte) =>
        strikes.map((strike) => lookup.get(`${strike}-${dte}`) ?? null),
      ),
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plotData: any[] = [
    mode === "3d"
      ? {
          type: "surface",
          x: matrix.strikes,
          y: matrix.dtes,
          z: matrix.z,
          colorscale: [
            [0, "#1e3a8a"],
            [0.25, "#2563eb"],
            [0.5, "#3b82f6"],
            [0.75, "#60a5fa"],
            [1, "#bfdbfe"],
          ],
          hovertemplate: "Strike $%{x}<br>DTE %{y}<br>IV %{z:.2%}<extra></extra>",
          contours: {
            z: { show: true, usecolormap: true, highlightcolor: "#58a6ff", project: { z: true } },
          },
          showscale: false,
          lighting: {
            ambient: 0.6,
            diffuse: 0.9,
            fresnel: 0.2,
            specular: 0.5,
            roughness: 0.3,
          },
        }
      : {
          type: "heatmap",
          x: matrix.strikes,
          y: matrix.dtes,
          z: matrix.z,
          colorscale: [
            [0, "#0f1117"],
            [0.5, "#2563eb"],
            [1, "#f06292"],
          ],
          hovertemplate: "Strike $%{x}<br>DTE %{y}<br>IV %{z:.2%}<extra></extra>",
          showscale: false,
        },
  ];

  const layout: Partial<Layout> = {
    autosize: true,
    margin: { l: 0, r: 0, b: 0, t: 8 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#8b949e", size: 10, family: "monospace" },
    scene: {
      xaxis: {
        title: { text: "Strike", font: { size: 10, color: "#8b949e" } },
        gridcolor: "#21262d",
        color: "#8b949e",
        zerolinecolor: "#30363d",
        showbackground: false,
      },
      yaxis: {
        title: { text: "DTE", font: { size: 10, color: "#8b949e" } },
        gridcolor: "#21262d",
        color: "#8b949e",
        zerolinecolor: "#30363d",
        showbackground: false,
      },
      zaxis: {
        title: { text: "IV", font: { size: 10, color: "#8b949e" } },
        tickformat: ".0%",
        gridcolor: "#21262d",
        color: "#8b949e",
        showbackground: false,
      },
      camera: { eye: { x: 1.55, y: 1.35, z: 0.92 } },
      bgcolor: "rgba(0,0,0,0)",
    },
    xaxis: {
      color: "#8b949e",
      gridcolor: "#21262d",
      title: { text: "Strike", font: { size: 10, color: "#8b949e" } },
    },
    yaxis: {
      color: "#8b949e",
      gridcolor: "#21262d",
      title: { text: "DTE", font: { size: 10, color: "#8b949e" } },
    },
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div className="flex justify-end">
        <div className="flex rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] p-0.5 shadow-inner">
          {(["3d", "money", "table"] as Mode[]).map((item) => (
            <button
              key={item}
              onClick={() => setMode(item)}
              aria-pressed={mode === item}
              className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/40 focus-visible:outline-none ${
                mode === item
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {item === "money" ? "$" : item}
            </button>
          ))}
        </div>
      </div>

      {/* Chart / table */}
      <div className="h-[320px] w-full">
        {loading ? (
          <div className="h-full rounded-lg surface-skeleton animate-pulse" />
        ) : mode === "table" ? (
          <div className="h-full overflow-auto rounded-lg border border-[var(--border-muted)] bg-[var(--bg-base)]/40">
            <table className="w-full min-w-[520px] text-left font-mono text-[11px]">
              <thead className="sticky top-0 bg-[var(--bg-surface)] text-[var(--text-muted)] border-b border-[var(--border-default)] z-10">
                <tr>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[10px]">Strike</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[10px]">DTE</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[10px]">IV</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[10px]">Moneyness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-muted)]">
                {rows.map((p, idx) => {
                  const itm = p.strike < (spot || 0);
                  return (
                    <tr
                      key={`${p.strike}-${p.dte}-${idx}`}
                      className="hover:bg-[var(--bg-surface)] transition-colors"
                    >
                      <td className="px-4 py-2 font-bold text-[var(--text-primary)] tabular-nums">
                        ${p.strike.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-[var(--text-secondary)] tabular-nums">
                        {p.dte}
                      </td>
                      <td className="px-4 py-2 font-bold text-[var(--accent-blue)] tabular-nums">
                        {formatIV(p.iv)}
                      </td>
                      <td
                        className={`px-4 py-2 font-bold tabular-nums ${
                          itm ? "text-[var(--accent-teal)]" : "text-[var(--accent-pink)]"
                        }`}
                      >
                        {spot ? `${p.moneyness > 0 ? "+" : ""}${p.moneyness.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
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
