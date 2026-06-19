"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ChainResponse } from "@/lib/chainData";

type OIVolChartProps = { chain?: ChainResponse | null; loading?: boolean };
type Mode = "bars" | "heatmap";

const COLOR_CALL = "#3fb950";       // accent-green (bullish call OI)
const COLOR_PUT = "#f85149";        // accent-red (bearish put OI)
const COLOR_CALL_LIGHT = "#3fb95066"; // dimmed green for call volume
const COLOR_PUT_LIGHT = "#f8514966";  // dimmed red for put volume
const COLOR_GRID = "#21262d";       // border-muted
const COLOR_AXIS = "#8b949e";       // text-secondary

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="surface-elevated px-3 py-2.5 min-w-[200px] font-mono">
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 pb-1.5 border-b border-[var(--border-muted)]">
          Strike ${label.toLocaleString()}
        </p>
        <div className="flex flex-col gap-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="text-[var(--text-secondary)]">{entry.name}</span>
              </div>
              <span className="font-bold text-[var(--text-primary)] tabular-nums">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function OIVolChart({ chain, loading }: OIVolChartProps) {
  const [mode, setMode] = useState<Mode>("bars");

  const rows = useMemo(() => {
    const byStrike = new Map<
      number,
      { strike: number; callOi: number; putOi: number; callVol: number; putVol: number }
    >();
    (chain?.options || []).forEach((o) => {
      const row = byStrike.get(o.strike) || {
        strike: o.strike,
        callOi: 0,
        putOi: 0,
        callVol: 0,
        putVol: 0,
      };
      if (o.type === "call") {
        row.callOi += o.oi || 0;
        row.callVol += o.volume || 0;
      } else {
        row.putOi += o.oi || 0;
        row.putVol += o.volume || 0;
      }
      byStrike.set(o.strike, row);
    });
    return Array.from(byStrike.values()).sort((a, b) => a.strike - b.strike);
  }, [chain]);

  const maxValue = Math.max(
    1,
    ...rows.flatMap((r) => [r.callOi, r.putOi, r.callVol, r.putVol]),
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div className="flex justify-end">
        <div className="flex rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] p-0.5 shadow-inner">
          {(["bars", "heatmap"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/40 focus-visible:outline-none ${
                mode === m
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {m === "bars" ? "Bars" : "Heatmap"}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="h-[320px] w-full">
        {loading ? (
          <div className="h-full rounded-lg surface-skeleton animate-pulse" />
        ) : mode === "heatmap" ? (
          <div className="h-full overflow-auto rounded-lg border border-[var(--border-muted)] bg-[var(--bg-base)]/40 p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {rows.map((r) => {
                const intensity = Math.max(r.callOi, r.putOi, r.callVol, r.putVol) / maxValue;
                return (
                  <div
                    key={r.strike}
                    className="rounded-md border border-[var(--border-muted)] p-2 font-mono text-[10px] transition-transform duration-150 hover:scale-[1.02] hover:border-[var(--accent-blue)]/60"
                    style={{
                      backgroundColor: `rgba(88, 166, 255, ${0.04 + intensity * 0.24})`,
                    }}
                  >
                    <div className="mb-1.5 font-black text-[var(--text-primary)] border-b border-[var(--border-muted)] pb-1 tabular-nums">
                      ${r.strike}
                    </div>
                    <div className="flex justify-between font-bold" style={{ color: COLOR_CALL }}>
                      <span>C OI</span>
                      <span className="tabular-nums">{Math.round(r.callOi / 1000)}k</span>
                    </div>
                    <div className="flex justify-between font-bold" style={{ color: COLOR_PUT }}>
                      <span>P OI</span>
                      <span className="tabular-nums">{Math.round(r.putOi / 1000)}k</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 10, right: 4, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGrid stroke={COLOR_GRID} vertical={false} />
              <XAxis
                dataKey="strike"
                tick={{ fill: COLOR_AXIS, fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                dy={8}
              />
              <YAxis
                tick={{ fill: COLOR_AXIS, fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(Number(v) / 1000)}k`}
                dx={-6}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(88,166,255,0.06)", radius: 4 }}
              />
              <Legend
                verticalAlign="top"
                align="left"
                iconType="rect"
                iconSize={10}
                wrapperStyle={{
                  paddingBottom: 12,
                  fontSize: 10,
                  fontWeight: 600,
                  color: COLOR_AXIS,
                  letterSpacing: "0.04em",
                }}
              />
              <Bar dataKey="callOi" name="Call OI" fill={COLOR_CALL} radius={[2, 2, 0, 0]} />
              <Bar dataKey="putOi" name="Put OI" fill={COLOR_PUT} radius={[2, 2, 0, 0]} />
              <Bar dataKey="callVol" name="Call Vol" fill={COLOR_CALL_LIGHT} radius={[2, 2, 0, 0]} />
              <Bar dataKey="putVol" name="Put Vol" fill={COLOR_PUT_LIGHT} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
