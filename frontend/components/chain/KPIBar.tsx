"use client";

import { useMemo } from "react";
import { formatMoney, formatNumber, SummaryResponse } from "@/lib/chainData";

type KPIBarProps = { summary?: SummaryResponse | null; loading?: boolean; error?: string | null };

function parseNetGex(value: SummaryResponse["net_gex"]): number | undefined {
  if (typeof value === "number") return value;
  if (!value) return undefined;
  const normalized = String(value).replace(/[$,+\s]/g, "").toUpperCase();
  const multiplier = normalized.endsWith("B") ? 1_000_000_000 : normalized.endsWith("M") ? 1_000_000 : 1;
  const numeric = Number.parseFloat(normalized.replace(/[BM]/g, ""));
  return Number.isFinite(numeric) ? numeric * multiplier : undefined;
}

export default function KPIBar({ summary, loading, error }: KPIBarProps) {
  const netGex = useMemo(() => parseNetGex(summary?.net_gex), [summary?.net_gex]);
  const callVol = summary?.call_volume ?? 0;
  const putVol = summary?.put_volume ?? 0;
  const callOi = summary?.call_oi ?? 0;
  const putOi = summary?.put_oi ?? 0;

  const kpis: { label: string; value: string; sub: string; colorClass: string; trend?: "up" | "down" | "neutral" }[] = [
    {
      label: "预期波动 (EXP MOVE)",
      value: summary?.expected_move
        || (summary?.expected_move_dollar ? `±${formatMoney(summary.expected_move_dollar)}` : "—"),
      sub: summary?.spot ? `现价 ${formatMoney(summary.spot)}` : "front straddle",
      colorClass: "text-[var(--accent-orange)]", 
    },
    {
      label: "最大痛点 (MAX PAIN)",
      value: formatMoney(summary?.max_pain, { digits: 2 }),
      sub: summary?.expiry ?? "selected expiry",
      colorClass: "text-[var(--text-primary)]",
    },
    {
      label: "成交量比例 (P/C VOL)",
      value: formatNumber(summary?.pcr_volume, 3),
      sub: `${callVol.toLocaleString()}C / ${putVol.toLocaleString()}P`,
      colorClass: (summary?.pcr_volume ?? 0) > 1 ? "text-[var(--accent-red)]" : "text-[var(--accent-teal)]",
      trend: (summary?.pcr_volume ?? 0) > 1 ? "down" : "up",
    },
    {
      label: "持仓比例 (P/C OI)",
      value: formatNumber(summary?.pcr_oi, 3),
      sub: callOi
        ? `${Math.round(callOi).toLocaleString()}C / ${Math.round(putOi).toLocaleString()}P`
        : "open interest ratio",
      colorClass: (summary?.pcr_oi ?? 0) > 1 ? "text-[var(--accent-red)]" : "text-[var(--accent-teal)]",
      trend: (summary?.pcr_oi ?? 0) > 1 ? "down" : "up",
    },
    {
      label: "净伽马暴露 (NET GEX)",
      value:
        netGex !== undefined
          ? formatMoney(netGex, { signed: true, compact: true })
          : typeof summary?.net_gex === "string"
          ? summary.net_gex
          : "—",
      sub: (netGex ?? 0) < 0 ? "做市商短 Gamma" : "做市商多 Gamma",
      colorClass: (netGex ?? 0) < 0 ? "text-[var(--accent-red)]" : "text-[var(--accent-teal)]",
      trend: (netGex ?? 0) < 0 ? "down" : "up",
    },
  ];

  return (
    <section className="mb-6">
      {error && (
        <div className="mb-4 rounded-lg px-4 py-3 text-xs font-mono border bg-amber-50/50 border-amber-200/50 text-amber-700 flex items-center gap-4 overflow-x-auto no-scrollbar">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          API fallback active: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {kpis.map((kpi, idx) => (
          <div
            key={kpi.label}
            className={`flex flex-col gap-4.5 px-8 py-6 min-w-0 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none hover:bg-[var(--bg-base)]/50 ${
              idx < kpis.length - 1 ? "border-r border-[var(--border-default)]" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em] truncate font-mono">
                {kpi.label}
              </span>
              {kpi.trend && (
                <div className={`w-1.5 h-1.5 rounded-full ${
                  kpi.trend === "up" ? "bg-[var(--accent-teal)]" : kpi.trend === "down" ? "bg-[var(--accent-pink)]" : "bg-gray-300"
                }`} />
              )}
            </div>

            {loading ? (
              <div className="h-8 w-28 rounded-lg bg-[var(--border-muted)] animate-pulse my-1" />
            ) : (
              <span className={`text-2xl font-bold font-mono tabular-nums leading-none tracking-tight ${kpi.colorClass}`}>
                {kpi.value}
              </span>
            )}

            <span className="text-[11px] font-semibold text-[var(--text-secondary)] truncate mt-0.5 opacity-80 font-mono">
              {loading ? "..." : kpi.sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
