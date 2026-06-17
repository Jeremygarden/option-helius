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
      colorClass: "text-[#F5A623]", // accent-orange
    },
    {
      label: "最大痛点 (MAX PAIN)",
      value: formatMoney(summary?.max_pain, { digits: 2 }),
      sub: summary?.expiry ?? "selected expiry",
      colorClass: "text-[#1A1D1F]", // text-primary
    },
    {
      label: "成交量比例 (P/C VOL)",
      value: formatNumber(summary?.pcr_volume, 3),
      sub: `${callVol.toLocaleString()}C / ${putVol.toLocaleString()}P`,
      colorClass: (summary?.pcr_volume ?? 0) > 1 ? "text-[#E91E63]" : "text-[#2EB6D2]", // red vs teal
      trend: (summary?.pcr_volume ?? 0) > 1 ? "down" : "up",
    },
    {
      label: "持仓比例 (P/C OI)",
      value: formatNumber(summary?.pcr_oi, 3),
      sub: callOi
        ? `${Math.round(callOi).toLocaleString()}C / ${Math.round(putOi).toLocaleString()}P`
        : "open interest ratio",
      colorClass: (summary?.pcr_oi ?? 0) > 1 ? "text-[#E91E63]" : "text-[#2EB6D2]",
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
      colorClass: (netGex ?? 0) < 0 ? "text-[#E91E63]" : "text-[#2EB6D2]",
      trend: (netGex ?? 0) < 0 ? "down" : "up",
    },
  ];

  return (
    <section className="mb-6">
      {error && (
        <div className="mb-4 rounded-xl px-4 py-3 text-xs font-mono border bg-amber-50/50 border-amber-200/50 text-amber-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          API fallback active: {error}
        </div>
      )}

      <div className="grid grid-cols-5 bg-white border border-[#EDF0F2] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {kpis.map((kpi, idx) => (
          <div
            key={kpi.label}
            className={`flex flex-col gap-1.5 px-8 py-6 min-w-0 transition-colors hover:bg-gray-50/50 ${
              idx < kpis.length - 1 ? "border-r border-[#EDF0F2]" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-[#9A9FA5] uppercase tracking-[0.1em] truncate">
                {kpi.label}
              </span>
              {kpi.trend && (
                <div className={`w-1.5 h-1.5 rounded-full ${
                  kpi.trend === "up" ? "bg-[#2EB6D2]" : kpi.trend === "down" ? "bg-[#E91E63]" : "bg-gray-300"
                }`} />
              )}
            </div>

            {loading ? (
              <div className="h-8 w-28 rounded-lg bg-gray-100 animate-pulse my-1" />
            ) : (
              <span className={`text-2xl font-bold font-mono tabular-nums leading-none tracking-tight ${kpi.colorClass}`}>
                {kpi.value}
              </span>
            )}

            <span className="text-[11px] font-semibold text-[#6F767E] truncate mt-0.5 opacity-80">
              {loading ? "..." : kpi.sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
