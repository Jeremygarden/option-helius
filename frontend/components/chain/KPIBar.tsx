"use client";

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
  const netGex = parseNetGex(summary?.net_gex);
  const callVol = summary?.call_volume ?? 0;
  const putVol = summary?.put_volume ?? 0;
  const callOi = summary?.call_oi ?? 0;
  const putOi = summary?.put_oi ?? 0;

  const kpis: { label: string; value: string; sub: string; color: string }[] = [
    {
      label: "预期波动",
      value: summary?.expected_move
        || (summary?.expected_move_dollar ? `±${formatMoney(summary.expected_move_dollar)}` : "—"),
      sub: summary?.spot ? `现价 ${formatMoney(summary.spot)}` : "front straddle",
      color: "#58a6ff",
    },
    {
      label: "Max Pain",
      value: formatMoney(summary?.max_pain, { digits: 2 }),
      sub: summary?.expiry ?? "selected expiry",
      color: "#f0883e",
    },
    {
      label: "P/C 成交量",
      value: formatNumber(summary?.pcr_volume, 3),
      sub: `${callVol.toLocaleString()}C / ${putVol.toLocaleString()}P`,
      color: (summary?.pcr_volume ?? 0) > 1 ? "#f85149" : "#3fb950",
    },
    {
      label: "P/C 持仓",
      value: formatNumber(summary?.pcr_oi, 3),
      sub: callOi
        ? `${Math.round(callOi).toLocaleString()}C / ${Math.round(putOi).toLocaleString()}P`
        : "open interest ratio",
      color: (summary?.pcr_oi ?? 0) > 1 ? "#f85149" : "#3fb950",
    },
    {
      label: "净 GEX",
      value:
        netGex !== undefined
          ? formatMoney(netGex, { signed: true, compact: true })
          : typeof summary?.net_gex === "string"
          ? summary.net_gex
          : "—",
      sub: (netGex ?? 0) < 0 ? "做市商短 Gamma" : "做市商多 Gamma",
      color: (netGex ?? 0) < 0 ? "#f85149" : "#3fb950",
    },
  ];

  return (
    <section className="mb-4">
      {error && (
        <div
          className="mb-2 rounded px-3 py-1.5 text-[11px] font-mono border"
          style={{
            background: "rgba(210,153,34,0.08)",
            borderColor: "rgba(210,153,34,0.25)",
            color: "#d29922",
          }}
        >
          API fallback active: {error}
        </div>
      )}

      {/* Horizontal KPI bar — one row, border-r dividers */}
      <div
        className="flex rounded-lg border overflow-hidden"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
      >
        {kpis.map((kpi, idx) => (
          <div
            key={kpi.label}
            className="flex flex-col gap-1 px-6 py-3 flex-1"
            style={{
              borderRight: idx < kpis.length - 1 ? "1px solid var(--border-default)" : "none",
              minWidth: 0,
            }}
          >
            {/* Label — small gray uppercase */}
            <span
              className="text-xs uppercase tracking-wide whitespace-nowrap"
              style={{ color: "var(--text-secondary)" }}
            >
              {kpi.label}
            </span>

            {/* Value — large bold mono */}
            {loading ? (
              <div
                className="h-7 w-24 rounded animate-pulse"
                style={{ background: "var(--border-default)" }}
              />
            ) : (
              <span
                className="text-xl font-bold font-mono leading-none tabular-nums"
                style={{ color: kpi.color }}
              >
                {kpi.value}
              </span>
            )}

            {/* Sub-label */}
            <span
              className="text-[11px] font-mono truncate"
              style={{ color: "var(--text-muted)" }}
            >
              {loading ? "加载中..." : kpi.sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
