"use client";

import React from "react";

/* ─── Types ────────────────────────────────────────────────────────────── */

interface StructureLeg {
  strike: number;
  expiry: string;
  delta: number;
}

interface Strategy {
  rank: number;
  strategy: string;
  strategy_cn: string;
  score: number;
  highlight: boolean;
  signal_badge: string;
  why_now: string;
  suggested_structure: {
    sell_call?: StructureLeg;
    buy_call?: StructureLeg;
    sell_put?: StructureLeg;
    buy_put?: StructureLeg;
  };
  max_profit: number;
  max_loss: number;
  prob_profit: number;
  annualized_return: number;
  safety_margin: string;
  risks: string[];
  gex_note: string;
  skew_note: string;
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

/** Derive a strategy type badge from the strategy name */
function getTypeBadge(strategy: string): { label: string; bg: string; color: string } {
  const s = strategy.toLowerCase();
  if (s.includes("put") && (s.includes("sell") || s.includes("short")))
    return { label: "SELL PUT", bg: "rgba(63,185,80,0.15)", color: "#3fb950" };
  if (s.includes("call spread") || s.includes("call_spread"))
    return { label: "CALL SPREAD", bg: "rgba(88,166,255,0.15)", color: "#58a6ff" };
  if (s.includes("condor"))
    return { label: "IRON CONDOR", bg: "rgba(240,136,62,0.15)", color: "#f0883e" };
  if (s.includes("call"))
    return { label: "CALL", bg: "rgba(63,185,80,0.15)", color: "#3fb950" };
  if (s.includes("put"))
    return { label: "PUT", bg: "rgba(248,81,73,0.15)", color: "#f85149" };
  return { label: "SPREAD", bg: "rgba(88,166,255,0.15)", color: "#58a6ff" };
}

/** Format a number for display */
function fmt(v: number, digits = 2) {
  if (typeof v !== "number" || isNaN(v)) return "—";
  return v.toFixed(digits);
}

/* ─── Component ────────────────────────────────────────────────────────── */

export const StrategyCard = ({ strategy }: { strategy: Strategy }) => {
  const isTop = strategy.highlight;
  const badge = getTypeBadge(strategy.strategy);
  const structureEntries = Object.entries(strategy.suggested_structure);

  // Build a readable contract code: e.g. "SELL PUT 130 | 2026-01-16 | Δ-0.22"
  const contractCode = structureEntries.length > 0
    ? structureEntries.map(([legName, leg]) => {
        const parts = legName.replace("_", " ").toUpperCase();
        return `${parts} ${leg.strike} | ${leg.expiry} | Δ${leg.delta}`;
      }).join("  /  ")
    : strategy.strategy;

  // Stats for 2-col grid
  const stats: { label: string; value: string; color?: string }[] = [
    { label: "Max Profit",    value: `$${strategy.max_profit}`,                    color: "#3fb950" },
    { label: "Max Loss",      value: `$${strategy.max_loss}`,                      color: "#f85149" },
    { label: "Win Rate",      value: `${(strategy.prob_profit * 100).toFixed(1)}%`, color: "#58a6ff" },
    { label: "Ann. Return",   value: `${strategy.annualized_return}%`,             color: "#d29922" },
    { label: "Safety Margin", value: strategy.safety_margin,                       color: "#8b949e" },
    { label: "Score",         value: `${strategy.score}/100`,                      color: strategy.score > 80 ? "#3fb950" : "#58a6ff" },
  ];

  return (
    <div
      className={[
        "relative rounded-lg border transition-all duration-150",
        "hover:-translate-y-px",
        isTop
          ? "border-l-4 border-l-[#3fb950]"
          : "border-l-4 border-l-transparent",
      ].join(" ")}
      style={{
        background: "var(--bg-surface)",
        borderColor: isTop ? undefined : "var(--border-default)",
        // override border-l for highlight cards
        ...(isTop ? { borderLeftColor: "#3fb950" } : {}),
      }}
    >
      {/* ── Top row: rank badge left, type badge right ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-0">
        {/* Rank badge */}
        <div
          className="flex items-center justify-center w-7 h-7 rounded-md text-xs font-mono font-bold"
          style={{
            background: isTop ? "rgba(63,185,80,0.15)" : "var(--bg-elevated)",
            color: isTop ? "#3fb950" : "var(--text-muted)",
            border: `1px solid ${isTop ? "rgba(63,185,80,0.3)" : "var(--border-default)"}`,
          }}
        >
          #{strategy.rank}
        </div>

        {/* Type badge */}
        <span
          className="px-2 py-0.5 rounded text-[11px] font-mono font-bold"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      {/* ── Strategy name + signal badge ── */}
      <div className="px-4 pt-3 pb-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3
            className="text-sm font-semibold leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {strategy.strategy_cn}
          </h3>
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {strategy.strategy}
          </span>
          {strategy.signal_badge && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded font-mono"
              style={{
                background: "rgba(88,166,255,0.12)",
                color: "#58a6ff",
              }}
            >
              {strategy.signal_badge}
            </span>
          )}
        </div>
      </div>

      {/* ── Contract code (monospace, prominent) ── */}
      <div className="px-4 pt-2 pb-0">
        <p
          className="font-mono text-sm font-bold leading-relaxed break-all"
          style={{ color: "var(--text-primary)" }}
        >
          {contractCode}
        </p>
      </div>

      {/* ── Why now description ── */}
      <div className="px-4 pt-2 pb-0">
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {strategy.why_now}
        </p>
      </div>

      {/* ── Stats 2-col grid ── */}
      <div className="px-4 pt-3 pb-0 grid grid-cols-2 gap-x-4 gap-y-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span
              className="text-[11px] uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              {s.label}
            </span>
            <span
              className="text-[12px] font-mono font-semibold tabular-nums"
              style={{ color: s.color ?? "var(--text-primary)" }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Risk tags ── */}
      {strategy.risks.length > 0 && (
        <div className="px-4 pt-3 pb-0 flex flex-wrap gap-1.5">
          {strategy.risks.map((risk, idx) => (
            <span
              key={idx}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
              style={{
                background: "rgba(248,81,73,0.08)",
                color: "#f85149",
                borderColor: "rgba(248,81,73,0.2)",
              }}
            >
              {risk}
            </span>
          ))}
        </div>
      )}

      {/* ── Footer notes ── */}
      <div
        className="px-4 pt-3 pb-4 mt-2 border-t space-y-1"
        style={{ borderColor: "var(--border-muted)" }}
      >
        <p
          className="text-[11px] font-mono flex items-center gap-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: "#58a6ff" }}
          />
          {strategy.gex_note}
        </p>
        <p
          className="text-[11px] font-mono flex items-center gap-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: "#a371f7" }}
          />
          {strategy.skew_note}
        </p>
      </div>
    </div>
  );
};
