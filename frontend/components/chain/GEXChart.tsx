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

export default function GEXChart({ data, summary, loading }: GEXChartProps) {
  const rows = useMemo(
    () => data.map((p) => ({ ...p, gexDollar: p.gex * 1_000_000 })),
    [data],
  );
  const net = rows.reduce((sum, p) => sum + p.gexDollar, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tooltipFormatter = (v: any) => [`${Number(v).toFixed(2)}M`, "GEX"];

  return (
    <div className="flex flex-col gap-3">
      {/* Net GEX header */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          净 GEX
        </span>
        <span
          className="font-mono text-sm font-bold tabular-nums"
          style={{ color: net < 0 ? "#f85149" : "#3fb950" }}
        >
          {formatMoney(net, { signed: true, compact: true })}
        </span>
      </div>

      {/* Chart */}
      <div className="h-[280px]">
        {loading ? (
          <div
            className="h-full rounded-md animate-pulse"
            style={{ background: "var(--bg-elevated)" }}
          />
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
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-default)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: 12,
                }}
                formatter={tooltipFormatter}
              />
              <ReferenceLine y={0} stroke="var(--text-muted)" />
              <ReferenceLine
                x={summary?.max_pain}
                stroke="#f0883e"
                strokeDasharray="4 4"
                label={{
                  value: "Max Pain",
                  fill: "#f0883e",
                  fontSize: 11,
                  position: "insideTop",
                }}
              />
              <Bar dataKey="gex" name="GEX ($M)" radius={[2, 2, 0, 0]}>
                {rows.map((entry) => (
                  <Cell
                    key={entry.strike}
                    fill={entry.gex >= 0 ? "#3fb950" : "#f85149"}
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
