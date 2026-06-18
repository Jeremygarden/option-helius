"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Layout } from "plotly.js";
import { IVSurfacePoint, formatIV } from "@/lib/chainData";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full items-center justify-center text-xs"
      style={{ color: "var(--text-muted)" }}
    >
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
            [0, "#E3F2FD"],
            [0.2, "#90CAF9"],
            [0.4, "#42A5F5"],
            [0.6, "#2F6BFF"],
            [0.8, "#1A56FF"],
            [1, "#0D47A1"],
          ],
          hovertemplate: "Strike $%{x}<br>DTE %{y}<br>IV %{z:.2%}<extra></extra>",
          contours: {
            z: { show: true, usecolormap: true, highlightcolor: "#2F6BFF", project: { z: true } },
          },
          showscale: false,
          lighting: {
            ambient: 0.6,
            diffuse: 0.9,
            fresnel: 0.2,
            specular: 0.5,
            roughness: 0.3
          }
        }
      : {
          type: "heatmap",
          x: matrix.strikes,
          y: matrix.dtes,
          z: matrix.z,
          colorscale: "Blues",
          hovertemplate: "Strike $%{x}<br>DTE %{y}<br>IV %{z:.2%}<extra></extra>",
          showscale: false,
        },
  ];

  const layout: Partial<Layout> = {
    autosize: true,
    margin: { l: 0, r: 0, b: 0, t: 8 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#6F767E", size: 10, family: "var(--font-sans)" },
    scene: {
      xaxis: {
        title: { text: "Strike", font: { size: 10, weight: 600 } },
        gridcolor: "#EDF0F2",
        color: "#9A9FA5",
        zerolinecolor: "#EDF0F2",
        showbackground: false,
      },
      yaxis: {
        title: { text: "DTE", font: { size: 10, weight: 600 } },
        gridcolor: "#EDF0F2",
        color: "#9A9FA5",
        zerolinecolor: "#EDF0F2",
        showbackground: false,
      },
      zaxis: {
        title: { text: "IV", font: { size: 10, weight: 600 } },
        tickformat: ".0%",
        gridcolor: "#EDF0F2",
        color: "#9A9FA5",
        showbackground: false,
      },
      camera: { eye: { x: 1.55, y: 1.35, z: 0.92 } },
      bgcolor: "rgba(0,0,0,0)",
    },
    xaxis: {
      color: "#9A9FA5",
      gridcolor: "#EDF0F2",
      title: { text: "Strike", font: { size: 10, weight: 600 } },
    },
    yaxis: {
      color: "#9A9FA5",
      gridcolor: "#EDF0F2",
      title: { text: "DTE", font: { size: 10, weight: 600 } },
    },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex justify-end">
        <div className="flex rounded-lg bg-gray-50 border border-[#EDF0F2] p-1 shadow-inner">
          {(["3d", "money", "table"] as Mode[]).map((item) => (
            <button
              key={item}
              onClick={() => setMode(item)}
              className={`rounded-lg px-4 py-1.5 text-[11px] font-bold uppercase transition-all duration-200 ${
                mode === item 
                  ? "bg-white text-[#2F6BFF] shadow-sm ring-1 ring-[#EDF0F2]" 
                  : "text-[#9A9FA5] hover:text-[#6F767E]"
              }`}
            >
              {item === "money" ? "$" : item}
            </button>
          ))}
        </div>
      </div>

      {/* Chart / table */}
      <div className="h-[340px] w-full">
        {loading ? (
          <div className="h-full rounded-2xl bg-gray-50 animate-pulse border border-[#EDF0F2]" />
        ) : mode === "table" ? (
          <div className="h-full overflow-auto rounded-lg border border-[#EDF0F2] bg-white shadow-sm">
            <table className="w-full min-w-[520px] text-left font-mono text-[11px]">
              <thead className="sticky top-0 bg-gray-50 text-[#9A9FA5] border-b border-[#EDF0F2] z-10">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Strike</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">DTE</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">IV</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Moneyness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF0F2]">
                {rows.map((p, idx) => (
                  <tr
                    key={`${p.strike}-${p.dte}-${idx}`}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-bold text-[#1A1D1F]">
                      ${p.strike.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-[#6F767E]">
                      {p.dte}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-[#2F6BFF]">
                      {formatIV(p.iv)}
                    </td>
                    <td
                      className={`px-4 py-2.5 font-bold ${
                        p.strike >= (spot || 0)
                          ? "text-[#2EB6D2]"
                          : "text-[#E91E63]"
                      }`}
                    >
                      {spot ? `${p.moneyness > 0 ? "+" : ""}${p.moneyness.toFixed(1)}%` : "—"}
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
