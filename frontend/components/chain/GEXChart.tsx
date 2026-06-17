"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GexPoint, SummaryResponse, formatMoney } from "@/lib/chainData";

type GEXChartProps = { data: GexPoint[]; summary?: SummaryResponse | null; loading?: boolean };

const GEXTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="bg-white/95 backdrop-blur-md border border-[#EDF0F2] rounded-xl p-4 shadow-xl">
        <p className="text-xs font-bold text-[#1A1D1F] mb-3 border-b border-[#EDF0F2] pb-2 font-mono">
          Strike: ${label.toLocaleString()}
        </p>
        <div className="flex items-center justify-between gap-6 text-[11px]">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-sm ${val >= 0 ? "bg-[#2EB6D2]" : "bg-[#E91E63]"}`} />
            <span className="text-[#6F767E] font-medium">Gamma Exposure</span>
          </div>
          <span className={`font-bold font-mono ${val >= 0 ? "text-[#2EB6D2]" : "text-[#E91E63]"}`}>
            {val >= 0 ? "+" : ""}{val.toFixed(2)}M
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function GEXChart({ data, summary, loading }: GEXChartProps) {
  const rows = useMemo(
    () => data.map((p) => ({ ...p, gexDollar: p.gex * 1_000_000 })),
    [data],
  );
  const net = rows.reduce((sum, p) => sum + p.gexDollar, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Net GEX header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-[#9A9FA5] uppercase tracking-wider">
          Net GEX
        </span>
        <span
          className={`font-mono text-base font-bold tabular-nums ${
            net < 0 ? "text-[#E91E63]" : "text-[#2EB6D2]"
          }`}
        >
          {formatMoney(net, { signed: true, compact: true })}
        </span>
      </div>

      {/* Chart */}
      <div className="h-[340px] w-full">
        {loading ? (
          <div className="h-full rounded-2xl bg-gray-50 animate-pulse border border-[#EDF0F2]" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
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
                tickFormatter={(v: number) => `${Number(v).toFixed(0)}M`}
                dx={-10}
              />
              <Tooltip content={<GEXTooltip />} cursor={{ fill: "#F5F7FA", radius: 4 }} />
              <ReferenceLine y={0} stroke="#EDF0F2" strokeWidth={2} />
              <ReferenceLine
                x={summary?.max_pain}
                stroke="#F5A623"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: "Max Pain",
                  fill: "#F5A623",
                  fontSize: 10,
                  fontWeight: 700,
                  position: "insideTopLeft",
                  offset: 10,
                }}
              />
              <Bar dataKey="gex" name="GEX ($M)" radius={[2, 2, 0, 0]}>
                {rows.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.gex >= 0 ? "#7B61FF" : "#E91E63"} // Following purple theme for positive GEX or magenta for negative
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
