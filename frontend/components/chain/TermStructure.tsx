"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IVSurfacePoint, SummaryResponse, formatMoney } from "@/lib/chainData";

type TermStructureProps = { surface: IVSurfacePoint[]; summary?: SummaryResponse | null; loading?: boolean };

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
    <div className="h-[280px]">
      {loading ? (
        <div
          className="h-full rounded-md animate-pulse"
          style={{ background: "var(--bg-elevated)" }}
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="ivFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#58a6ff" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#58a6ff" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border-default)" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="iv"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <YAxis
              yAxisId="move"
              orientation="right"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-base)",
                border: "1px solid var(--border-default)",
                borderRadius: 8,
                color: "var(--text-primary)",
                fontSize: 12,
              }}
              formatter={(value, name) =>
                name === "Expected Move"
                  ? [formatMoney(Number(value)), name]
                  : [`${value}%`, name]
              }
              labelStyle={{ color: "var(--text-muted)" }}
            />
            <Legend wrapperStyle={{ color: "var(--text-muted)", fontSize: 12 }} />
            <Area
              yAxisId="iv"
              type="monotone"
              dataKey="atmIv"
              name="ATM IV"
              stroke="#58a6ff"
              fill="url(#ivFill)"
              strokeWidth={2.4}
              dot={{ r: 3, fill: "#58a6ff" }}
            />
            <Line
              yAxisId="move"
              type="monotone"
              dataKey="expectedMove"
              name="Expected Move"
              stroke="#f0883e"
              strokeWidth={2.4}
              dot={{ r: 3, fill: "#f0883e" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
