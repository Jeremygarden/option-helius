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

const COLOR_POS = "#39c5bb";   // accent-teal
const COLOR_NEG = "#f06292";   // accent-pink
const COLOR_GRID = "#21262d";  // border-muted
const COLOR_AXIS = "#8b949e";  // text-secondary
const COLOR_MAXP = "#ffab70";  // accent-orange

const GEXTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const positive = val >= 0;
    return (
      <div className="surface-elevated px-3 py-2.5 min-w-[180px] font-mono">
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 pb-1.5 border-b border-[var(--border-muted)]">
          Strike ${label.toLocaleString()}
        </p>
        <div className="flex items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: positive ? COLOR_POS : COLOR_NEG }}
            />
            <span className="text-[var(--text-secondary)]">Gamma</span>
          </div>
          <span
            className="font-bold tabular-nums"
            style={{ color: positive ? COLOR_POS : COLOR_NEG }}
          >
            {positive ? "+" : ""}{val.toFixed(2)}M
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
  const netPositive = net >= 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Net GEX header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">
          Net GEX
        </span>
        <span
          className="font-mono text-sm font-bold tabular-nums"
          style={{ color: netPositive ? COLOR_POS : COLOR_NEG }}
        >
          {formatMoney(net, { signed: true, compact: true })}
        </span>
      </div>

      {/* Chart */}
      <div className="h-[320px] w-full">
        {loading ? (
          <div className="h-full rounded-lg surface-skeleton animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 16, right: 4, bottom: 0, left: 0 }}>
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
                tickFormatter={(v: number) => `${Number(v).toFixed(0)}M`}
                dx={-6}
              />
              <Tooltip
                content={<GEXTooltip />}
                cursor={{ fill: "rgba(88,166,255,0.06)", radius: 4 }}
              />
              <ReferenceLine y={0} stroke={COLOR_AXIS} strokeWidth={1} />
              {summary?.max_pain != null && (
                <ReferenceLine
                  x={summary.max_pain}
                  stroke={COLOR_MAXP}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Max Pain",
                    fill: COLOR_MAXP,
                    fontSize: 10,
                    fontWeight: 700,
                    position: "insideTopLeft",
                    offset: 8,
                  }}
                />
              )}
              <Bar dataKey="gex" name="GEX ($M)" radius={[2, 2, 0, 0]}>
                {rows.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.gex >= 0 ? COLOR_POS : COLOR_NEG}
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
