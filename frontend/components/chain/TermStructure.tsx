"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IVSurfacePoint, SummaryResponse, formatMoney } from "@/lib/chainData";

type TermStructureProps = { surface: IVSurfacePoint[]; summary?: SummaryResponse | null; loading?: boolean };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-[var(--accent-blue)] rounded-lg p-4 shadow-xl">
        <p className="text-xs font-bold text-[var(--accent-blue)] mb-3 border-b border-[var(--accent-blue)] pb-2 font-mono">
          Term: {label}
        </p>
        <div className="space-y-4">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-[11px]">
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-lg" style={{ backgroundColor: entry.stroke }} />
                <span className="text-[var(--accent-blue)] font-medium">{entry.name}</span>
              </div>
              <span className="font-bold font-mono text-[var(--accent-blue)]">
                {entry.name === "Expected Move" ? formatMoney(entry.value) : `${entry.value}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function TermStructure({ surface, summary, loading }: TermStructureProps) {
  const data = useMemo(() => {
    const grouped = new Map<number, IVSurfacePoint[]>();
    surface.forEach((p) => grouped.set(p.dte, [...(grouped.get(p.dte) || []), p]));
    const spotMove = summary?.expected_move_dollar || 0;
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([dte, rows]) => {
        const mid = rows.reduce((sum, p) => sum + p.iv, 0) / Math.max(1, rows.length);
        const atm =
          rows.slice().sort((a, b) => Math.abs(a.iv - mid) - Math.abs(b.iv - mid))[0]?.iv || mid;
        return {
          dte,
          label: `${dte}D`,
          atmIv: +(atm * 100).toFixed(2),
          expectedMove: +(
            spotMove * Math.sqrt(Math.max(1, dte) / Math.max(1, 30))
          ).toFixed(2),
        };
      });
  }, [surface, summary]);

  return (
    <div className="h-[340px] w-full">
      {loading ? (
        <div className="h-full rounded-2xl bg-gray-50 animate-pulse border border-[var(--accent-blue)]" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="ivFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--accent-blue)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--accent-blue)", fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              yAxisId="iv"
              tick={{ fill: "var(--accent-blue)", fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              unit="%"
              dx={-10}
            />
            <YAxis
              yAxisId="move"
              orientation="right"
              tick={{ fill: "var(--accent-blue)", fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
              dx={10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              align="left" 
              iconType="circle" 
              iconSize={8}
              wrapperStyle={{ paddingBottom: 20, fontSize: 11, fontWeight: 600, color: "var(--accent-blue)" }}
            />
            <Area
              yAxisId="iv"
              type="monotone"
              dataKey="atmIv"
              name="ATM IV"
              stroke="var(--accent-blue)"
              fill="url(#ivFill)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--accent-blue)", stroke: "var(--accent-blue)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "var(--accent-blue)" }}
            />
            <Line
              yAxisId="move"
              type="monotone"
              dataKey="expectedMove"
              name="Expected Move"
              stroke="var(--accent-blue)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--accent-blue)", stroke: "var(--accent-blue)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "var(--accent-blue)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
