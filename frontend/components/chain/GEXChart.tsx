"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GexPoint, SummaryResponse, formatMoney } from "@/lib/chainData";

type GEXChartProps = { data: GexPoint[]; summary?: SummaryResponse | null; loading?: boolean };

export default function GEXChart({ data, summary, loading }: GEXChartProps) {
  const rows = useMemo(() => data.map((p) => ({ ...p, gexDollar: p.gex * 1_000_000 })), [data]);
  const net = rows.reduce((sum, p) => sum + p.gexDollar, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tooltipFormatter = (v: any) => [`${Number(v).toFixed(2)}M`, "GEX"];

  return (
    <div className="card h-full min-h-[380px] p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-wide">GEX Distribution / Gamma Exposure</h3>
          <p className="text-xs text-[var(--text-muted)]">Positive/negative gamma by strike, Max Pain marker</p>
        </div>
        <div className={`font-mono text-xs font-bold ${net < 0 ? "text-[var(--color-bearish)]" : "text-[var(--color-bullish)]"}`}>
          {formatMoney(net, { signed: true, compact: true })}
        </div>
      </div>
      <div className="h-[310px]">
        {loading ? (
          <div className="h-full animate-pulse rounded bg-[var(--bg-primary)]" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" />
              <XAxis
                dataKey="strike"
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                axisLine={{ stroke: "var(--border-default)" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${Number(v).toFixed(0)}M`}
              />
              <Tooltip
                cursor={{ fill: "rgba(88,166,255,0.08)" }}
                contentStyle={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-default)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                }}
                formatter={tooltipFormatter}
              />
              <ReferenceLine y={0} stroke="var(--text-muted)" />
              <ReferenceLine
                x={summary?.max_pain}
                stroke="var(--accent-orange, #f0883e)"
                strokeDasharray="4 4"
                label={{ value: "Max Pain", fill: "var(--accent-orange, #f0883e)", fontSize: 11, position: "insideTop" }}
              />
              <Bar dataKey="gex" name="GEX ($M)" radius={[2, 2, 0, 0]}>
                {rows.map((entry) => (
                  <Cell key={entry.strike} fill={entry.gex >= 0 ? "var(--color-bullish)" : "var(--color-bearish)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
