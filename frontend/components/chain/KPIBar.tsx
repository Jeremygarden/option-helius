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
    { label: "预期波动 / Expected Move", value: summary?.expected_move || (summary?.expected_move_dollar ? `±${formatMoney(summary.expected_move_dollar)}` : "—"), color: "text-[#58a6ff]", icon: Activity, sub: summary?.spot ? `Spot ${formatMoney(summary.spot)}` : "front straddle" },
    { label: "MAX PAIN", value: formatMoney(summary?.max_pain, { digits: 2 }), color: "text-[#f0883e]", icon: CircleDollarSign, sub: summary?.expiry || "selected expiry" },
    { label: "PUT/CALL VOLUME", value: formatNumber(summary?.pcr_volume, 3), color: (summary?.pcr_volume ?? 0) > 1 ? "text-[#f85149]" : "text-[#3fb950]", icon: Gauge, sub: `${callVol.toLocaleString()}C / ${putVol.toLocaleString()}P` },
    { label: "PUT/CALL OI", value: formatNumber(summary?.pcr_oi, 3), color: (summary?.pcr_oi ?? 0) > 1 ? "text-[#f85149]" : "text-[#3fb950]", icon: RadioTower, sub: callOi ? `${Math.round(callOi).toLocaleString()}C / ${Math.round(putOi).toLocaleString()}P` : "open interest ratio" },
    { label: "净GAMMA曝险 / Net GEX", value: netGex !== undefined ? formatMoney(netGex, { signed: true, compact: true }) : typeof summary?.net_gex === "string" ? summary.net_gex : "—", color: (netGex ?? 0) < 0 ? "text-[#f85149]" : "text-[#3fb950]", icon: AlertTriangle, sub: (netGex ?? 0) < 0 ? "dealer short gamma" : "dealer long gamma" },
  ];

  return (
    <section className="mb-5">
      {error ? <div className="mb-3 rounded-md border border-[#f0883e]/40 bg-[#f0883e]/10 px-3 py-2 text-xs text-[#f0b72f]">API fallback active: {error}. Showing resilient terminal estimates.</div> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return <div key={kpi.label} className="card group relative overflow-hidden p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]"><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#58a6ff]/60 to-transparent opacity-50" /><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="block truncate text-[10px] font-black uppercase tracking-[0.16em] text-[#7d8590]">{kpi.label}</span>{loading ? <span className="mt-2 block h-7 w-24 animate-pulse rounded bg-[#30363d]" /> : <span className={`mt-1 block font-mono text-xl font-black tabular-nums ${kpi.color}`}>{kpi.value}</span>}<span className="mt-1 block truncate text-[11px] text-[#7d8590]">{loading ? "syncing market data..." : kpi.sub}</span></div><div className="rounded-md border border-[#30363d] bg-[#0d1117] p-2 text-[#7d8590] group-hover:border-[#58a6ff]/50 group-hover:text-[#58a6ff]"><Icon size={16} /></div></div></div>;
        })}
      </div>
    </section>
  );
}
