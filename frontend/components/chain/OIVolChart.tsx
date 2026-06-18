"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ChainResponse } from "@/lib/chainData";

type OIVolChartProps = { chain?: ChainResponse | null; loading?: boolean };
type Mode = "bars" | "heatmap";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-[var(--accent-blue)] rounded-lg p-4 shadow-xl">
        <p className="text-xs font-bold text-[var(--accent-blue)] mb-3 border-b border-[var(--accent-blue)] pb-2 font-mono">
          Strike: ${label.toLocaleString()}
        </p>
        <div className="space-y-4">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-[11px]">
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-lg" style={{ backgroundColor: entry.fill }} />
                <span className="text-[var(--accent-blue)] font-medium">{entry.name}</span>
              </div>
              <span className="font-bold font-mono text-[var(--accent-blue)]">
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
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex justify-end">
        <div className="flex rounded-lg bg-gray-50 border border-[var(--accent-blue)] p-1 shadow-inner">
          {(["bars", "heatmap"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-1.5 text-[11px] font-bold transition-all duration-200 ${
                mode === m 
                  ? "bg-white text-[var(--accent-blue)] shadow-sm ring-1 ring-[var(--accent-blue)]" 
                  : "text-[var(--accent-blue)] hover:text-[var(--accent-blue)]"
              }`}
            >
              {m === "bars" ? "Chart" : "Heatmap"}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="h-[340px] w-full">
        {loading ? (
          <div className="h-full rounded-2xl bg-gray-50 animate-pulse border border-[var(--accent-blue)]" />
        ) : mode === "heatmap" ? (
          <div className="grid h-full content-start gap-4 overflow-auto rounded-lg border border-[var(--accent-blue)] bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {rows.map((r) => {
                const intensity = Math.max(r.callOi, r.putOi, r.callVol, r.putVol) / maxValue;
                return (
                  <div
                    key={r.strike}
                    className="rounded-lg border border-[var(--accent-blue)] p-4 font-mono text-[10px] transition-all hover:scale-[1.02] hover:shadow-md"
                    style={{
                      backgroundColor: `rgba(47, 107, 255, ${0.02 + intensity * 0.15})`,
                    }}
                  >
                    <div className="mb-1.5 font-black text-[var(--accent-blue)] border-b border-[var(--accent-blue)] pb-1">
                      ${r.strike}
                    </div>
                    <div className="flex justify-between text-[var(--accent-blue)] font-bold">
                      <span>C OI</span>
                      <span>{Math.round(r.callOi / 1000)}k</span>
                    </div>
                    <div className="flex justify-between text-[var(--accent-blue)] font-bold">
                      <span>P OI</span>
                      <span>{Math.round(r.putOi / 1000)}k</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 10, right: 0, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGrid stroke="var(--accent-blue)" vertical={false} />
              <XAxis
                dataKey="strike"
                tick={{ fill: "var(--accent-blue)", fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                dy={10}
              />
              <YAxis
                tick={{ fill: "var(--accent-blue)", fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(Number(v) / 1000)}k`}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent-blue)", radius: 4 }} />
              <Legend 
                verticalAlign="top" 
                align="left" 
                iconType="rect" 
                iconSize={10}
                wrapperStyle={{ paddingBottom: 20, fontSize: 11, fontWeight: 600, color: "var(--accent-blue)" }}
              />
              <Bar dataKey="callOi" name="Call OI" fill="var(--accent-blue)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="putOi" name="Put OI" fill="var(--accent-blue)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="callVol" name="Call Vol" fill="var(--accent-blue)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="putVol" name="Put Vol" fill="var(--accent-blue)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
