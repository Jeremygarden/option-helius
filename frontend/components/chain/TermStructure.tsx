"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IVSurfacePoint, SummaryResponse, formatMoney } from "@/lib/chainData";

type TermStructureProps = { surface: IVSurfacePoint[]; summary?: SummaryResponse | null; loading?: boolean };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-[#EDF0F2] rounded-lg p-4 shadow-xl">
        <p className="text-xs font-bold text-[#1A1D1F] mb-3 border-b border-[#EDF0F2] pb-2 font-mono">
          Term: {label}
        </p>
        <div className="space-y-4">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-[11px]">
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-lg" style={{ backgroundColor: entry.stroke }} />
                <span className="text-[#6F767E] font-medium">{entry.name}</span>
              </div>
              <span className="font-bold font-mono text-[#1A1D1F]">
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
        <div className="h-full rounded-2xl bg-gray-50 animate-pulse border border-[#EDF0F2]" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="ivFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2F6BFF" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#2F6BFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F0F2F5" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#9A9FA5", fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              yAxisId="iv"
              tick={{ fill: "#9A9FA5", fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              unit="%"
              dx={-10}
            />
            <YAxis
              yAxisId="move"
              orientation="right"
              tick={{ fill: "#9A9FA5", fontSize: 10, fontWeight: 500 }}
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
              wrapperStyle={{ paddingBottom: 20, fontSize: 11, fontWeight: 600, color: "#6F767E" }}
            />
            <Area
              yAxisId="iv"
              type="monotone"
              dataKey="atmIv"
              name="ATM IV"
              stroke="#2F6BFF"
              fill="url(#ivFill)"
              strokeWidth={3}
              dot={{ r: 4, fill: "#FFFFFF", stroke: "#2F6BFF", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#2F6BFF" }}
            />
            <Line
              yAxisId="move"
              type="monotone"
              dataKey="expectedMove"
              name="Expected Move"
              stroke="#F5A623"
              strokeWidth={3}
              dot={{ r: 4, fill: "#FFFFFF", stroke: "#F5A623", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#F5A623" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
