"use client";

import { Activity, AlertTriangle, CircleDollarSign, Gauge, RadioTower } from "lucide-react";
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

  const kpis = [
    {
      label: "Expected Move",
      value: summary?.expected_move || (summary?.expected_move_dollar ? `\u00B1${formatMoney(summary.expected_move_dollar)}` : "\u2014"),
      color: "text-[var(--color-neutral)]",
      icon: Activity,
      sub: summary?.spot ? `Spot ${formatMoney(summary.spot)}` : "front straddle",
    },
    {
      label: "Max Pain",
      value: formatMoney(summary?.max_pain, { digits: 2 }),
      color: "text-[var(--accent-orange)]",
      icon: CircleDollarSign,
      sub: summary?.expiry || "selected expiry",
    },
    {
      label: "P/C Volume",
      value: formatNumber(summary?.pcr_volume, 3),
      color: (summary?.pcr_volume ?? 0) > 1 ? "text-[var(--color-bearish)]" : "text-[var(--color-bullish)]",
      icon: Gauge,
      sub: `${callVol.toLocaleString()}C / ${putVol.toLocaleString()}P`,
    },
    {
      label: "P/C OI",
      value: formatNumber(summary?.pcr_oi, 3),
      color: (summary?.pcr_oi ?? 0) > 1 ? "text-[var(--color-bearish)]" : "text-[var(--color-bullish)]",
      icon: RadioTower,
      sub: callOi ? `${Math.round(callOi).toLocaleString()}C / ${Math.round(putOi).toLocaleString()}P` : "open interest ratio",
    },
    {
      label: "Net GEX",
      value: netGex !== undefined ? formatMoney(netGex, { signed: true, compact: true }) : typeof summary?.net_gex === "string" ? summary.net_gex : "\u2014",
      color: (netGex ?? 0) < 0 ? "text-[var(--color-bearish)]" : "text-[var(--color-bullish)]",
      icon: AlertTriangle,
      sub: (netGex ?? 0) < 0 ? "dealer short gamma" : "dealer long gamma",
    },
  ];

  return (
    <section className="mb-5">
      {error && (
        <div className="mb-3 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning-muted)] px-3 py-2 text-data-xs font-mono text-[var(--color-warning)]">
          API fallback active: {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg p-3.5 group hover:border-[var(--border-default)]/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-data-xs font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                    {kpi.label}
                  </span>
                  {loading ? (
                    <span className="mt-1.5 block h-6 w-20 animate-pulse rounded bg-[var(--border-default)]" />
                  ) : (
                    <span className={`mt-1 block font-mono text-data-lg font-semibold tabular-nums ${kpi.color}`}>
                      {kpi.value}
                    </span>
                  )}
                  <span className="mt-0.5 block text-data-xs font-mono text-[var(--text-muted)] truncate">
                    {loading ? "syncing..." : kpi.sub}
                  </span>
                </div>
                <div className="p-1.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-muted)] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                  <Icon size={14} strokeWidth={1.5} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
