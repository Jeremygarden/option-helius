"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ChainResponse } from "@/lib/chainData";

type OIVolChartProps = { chain?: ChainResponse | null; loading?: boolean };
type Mode = "bars" | "heatmap";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-[#EDF0F2] rounded-xl p-4 shadow-xl">
        <p className="text-xs font-bold text-[#1A1D1F] mb-3 border-b border-[#EDF0F2] pb-2 font-mono">
          Strike: ${label.toLocaleString()}
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
                <span className="text-[#6F767E] font-medium">{entry.name}</span>
              </div>
              <span className="font-bold font-mono text-[#1A1D1F]">
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
        <div className="flex rounded-xl bg-gray-50 border border-[#EDF0F2] p-1 shadow-inner">
          {(["bars", "heatmap"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-1.5 text-[11px] font-bold transition-all duration-200 ${
                mode === m 
                  ? "bg-white text-[#2F6BFF] shadow-sm ring-1 ring-[#EDF0F2]" 
                  : "text-[#9A9FA5] hover:text-[#6F767E]"
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
          <div className="h-full rounded-2xl bg-gray-50 animate-pulse border border-[#EDF0F2]" />
        ) : mode === "heatmap" ? (
          <div className="grid h-full content-start gap-2 overflow-auto rounded-xl border border-[#EDF0F2] bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {rows.map((r) => {
                const intensity = Math.max(r.callOi, r.putOi, r.callVol, r.putVol) / maxValue;
                return (
                  <div
                    key={r.strike}
                    className="rounded-lg border border-[#EDF0F2] p-2 font-mono text-[10px] transition-all hover:scale-[1.02] hover:shadow-md"
                    style={{
                      backgroundColor: `rgba(47, 107, 255, ${0.02 + intensity * 0.15})`,
                    }}
                  >
                    <div className="mb-1.5 font-black text-[#1A1D1F] border-b border-[#EDF0F2] pb-1">
                      ${r.strike}
                    </div>
                    <div className="flex justify-between text-[#2EB6D2] font-bold">
                      <span>C OI</span>
                      <span>{Math.round(r.callOi / 1000)}k</span>
                    </div>
                    <div className="flex justify-between text-[#E91E63] font-bold">
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
              <CartesianGrid stroke="#F0F2F5" vertical={false} />
              <XAxis
                dataKey="strike"
                tick={{ fill: "#9A9FA5", fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                dy={10}
              />
              <YAxis
                tick={{ fill: "#9A9FA5", fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(Number(v) / 1000)}k`}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F5F7FA", radius: 4 }} />
              <Legend 
                verticalAlign="top" 
                align="left" 
                iconType="rect" 
                iconSize={10}
                wrapperStyle={{ paddingBottom: 20, fontSize: 11, fontWeight: 600, color: "#6F767E" }}
              />
              <Bar dataKey="callOi" name="Call OI" fill="#2EB6D2" radius={[2, 2, 0, 0]} />
              <Bar dataKey="putOi" name="Put OI" fill="#E91E63" radius={[2, 2, 0, 0]} />
              <Bar dataKey="callVol" name="Call Vol" fill="#7B61FF" radius={[2, 2, 0, 0]} />
              <Bar dataKey="putVol" name="Put Vol" fill="#F5A623" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
