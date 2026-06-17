"use client";

import React from 'react';

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

export const StrategyCard = ({ strategy }: { strategy: Strategy }) => {
  const isTop3 = strategy.highlight;

  return (
    <div className={`relative p-5 rounded-lg border transition-all ${
      isTop3
        ? 'bg-[var(--bg-secondary)] border-[var(--accent-blue)]/30 shadow-[0_0_20px_rgba(88,166,255,0.05)]'
        : 'bg-[var(--bg-secondary)] border-[var(--border-default)] hover:border-[var(--border-default)]/80'
    }`}>
      {/* Top Choice Badge */}
      {isTop3 && (
        <div className="absolute top-3 right-3 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] px-2 py-0.5 rounded text-data-xs font-mono font-semibold border border-[var(--accent-blue)]/20">
          TOP
        </div>
      )}

      {/* Header */}
      <div className="mb-3">
        <h3 className="text-ui-lg text-[var(--text-primary)]">
          {strategy.strategy_cn}
          <span className="ml-2 text-data-sm font-mono text-[var(--text-muted)]">
            {strategy.strategy}
          </span>
        </h3>
        <div className="mt-1.5 flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-data-xs font-mono font-semibold ${
            strategy.score > 80
              ? 'bg-[var(--color-bullish-muted)] text-[var(--color-bullish)]'
              : 'bg-[var(--color-neutral-muted)] text-[var(--color-neutral)]'
          }`}>
            {strategy.score}
          </span>
          <span className="text-data-sm">{strategy.signal_badge}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-data-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
        {strategy.why_now}
      </p>

      {/* Structure Table */}
      <div className="bg-[var(--bg-primary)] rounded-md p-3 mb-4 border border-[var(--border-muted)]">
        <h4 className="text-data-xs font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Structure
        </h4>
        <div className="space-y-1">
          {Object.entries(strategy.suggested_structure).map(([legName, leg]) => (
            <div key={legName} className="flex justify-between items-center py-1 text-data-sm font-mono border-b border-[var(--border-muted)] last:border-0">
              <span className="text-[var(--text-secondary)] capitalize">
                {legName.replace('_', ' ')}
              </span>
              <span className="text-[var(--text-primary)] font-medium tabular-nums">
                {leg.strike} | {leg.expiry} | {'\u0394'}{leg.delta}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 rounded-md bg-[var(--bg-primary)] border border-[var(--border-muted)]">
          <div className="text-data-xs font-mono text-[var(--text-muted)] mb-1">Max P</div>
          <div className="text-data-md font-mono font-semibold text-[var(--color-bullish)] tabular-nums">
            ${strategy.max_profit}
          </div>
        </div>
        <div className="text-center p-2 rounded-md bg-[var(--bg-primary)] border border-[var(--border-muted)]">
          <div className="text-data-xs font-mono text-[var(--text-muted)] mb-1">Max L</div>
          <div className="text-data-md font-mono font-semibold text-[var(--color-bearish)] tabular-nums">
            ${strategy.max_loss}
          </div>
        </div>
        <div className="text-center p-2 rounded-md bg-[var(--bg-primary)] border border-[var(--border-muted)]">
          <div className="text-data-xs font-mono text-[var(--text-muted)] mb-1">Win%</div>
          <div className="text-data-md font-mono font-semibold text-[var(--color-neutral)] tabular-nums">
            {(strategy.prob_profit * 100).toFixed(1)}%
          </div>
        </div>
        <div className="text-center p-2 rounded-md bg-[var(--bg-primary)] border border-[var(--border-muted)]">
          <div className="text-data-xs font-mono text-[var(--text-muted)] mb-1">Ann.</div>
          <div className="text-data-md font-mono font-semibold text-[var(--color-warning)] tabular-nums">
            {strategy.annualized_return}%
          </div>
        </div>
      </div>

      {/* Risk Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {strategy.risks.map((risk, idx) => (
          <span key={idx} className="bg-[var(--color-bearish-muted)] text-[var(--color-bearish)] text-data-xs font-mono px-1.5 py-0.5 rounded border border-[var(--color-bearish)]/20">
            {risk}
          </span>
        ))}
      </div>

      {/* Notes */}
      <div className="space-y-1 pt-2 border-t border-[var(--border-muted)]">
        <p className="text-data-xs font-mono text-[var(--text-muted)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] flex-shrink-0" />
          {strategy.gex_note}
        </p>
        <p className="text-data-xs font-mono text-[var(--text-muted)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-purple)] flex-shrink-0" />
          {strategy.skew_note}
        </p>
      </div>
    </div>
  );
};
