"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IVSurfacePoint, SummaryResponse, formatMoney } from "@/lib/chainData";

type TermStructureProps = { surface: IVSurfacePoint[]; summary?: SummaryResponse | null; loading?: boolean };

const COLOR_IV = "#58a6ff";       // accent-blue
const COLOR_MOVE = "#bc8cff";     // accent-purple
const COLOR_GRID = "#21262d";     // border-muted
const COLOR_AXIS = "#8b949e";     // text-secondary

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="surface-elevated px-3 py-2.5 min-w-[200px] font-mono">
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 pb-1.5 border-b border-[var(--border-muted)]">
          Term {label}
        </p>
        <div className="flex flex-col gap-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: entry.stroke }}
                />
                <span className="text-[var(--text-secondary)]">{entry.name}</span>
              </div>
              <span
                className="font-bold tabular-nums text-[var(--text-primary)]"
              >
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
        <div className="h-full rounded-lg surface-skeleton animate-pulse" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="ivFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={COLOR_IV} stopOpacity={0.18} />
                <stop offset="100%" stopColor={COLOR_IV} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLOR_GRID} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: COLOR_AXIS, fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              yAxisId="iv"
              tick={{ fill: COLOR_IV, fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              unit="%"
              dx={-6}
            />
            <YAxis
              yAxisId="move"
              orientation="right"
              tick={{ fill: COLOR_MOVE, fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
              dx={6}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="left"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                paddingBottom: 12,
                fontSize: 10,
                fontWeight: 600,
                color: COLOR_AXIS,
                letterSpacing: "0.04em",
              }}
            />
            <Area
              yAxisId="iv"
              type="monotone"
              dataKey="atmIv"
              name="ATM IV"
              stroke={COLOR_IV}
              fill="url(#ivFill)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: COLOR_IV, stroke: COLOR_IV, strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: COLOR_IV }}
            />
            <Line
              yAxisId="move"
              type="monotone"
              dataKey="expectedMove"
              name="Expected Move"
              stroke={COLOR_MOVE}
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={{ r: 3, fill: COLOR_MOVE, stroke: COLOR_MOVE, strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: COLOR_MOVE }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
