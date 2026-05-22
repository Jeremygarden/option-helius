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
    <div className={`relative p-6 rounded-xl border transition-all ${
      isTop3 
        ? 'bg-gradient-to-br from-gray-900 to-blue-900/20 border-blue-500/50 shadow-lg shadow-blue-500/10' 
        : 'bg-gray-900/50 border-gray-800'
    }`}>
      {isTop3 && (
        <div className="absolute -top-3 -right-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
          TOP CHOICE
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {strategy.strategy_cn}
            <span className="text-sm font-normal text-gray-400">({strategy.strategy})</span>
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              strategy.score > 80 ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              评分: {strategy.score}
            </span>
            <span className="text-sm">{strategy.signal_badge}</span>
          </div>
        </div>
      </div>

      <p className="text-gray-300 text-sm mb-6 leading-relaxed">
        {strategy.why_now}
      </p>

      <div className="bg-black/40 rounded-lg p-4 mb-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">建议结构 (Suggested Structure)</h4>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(strategy.suggested_structure).map(([legName, leg]) => (
            <div key={legName} className="flex justify-between text-sm py-1 border-b border-gray-800 last:border-0">
              <span className="capitalize text-gray-400">{legName.replace('_', ' ')}</span>
              <span className="text-white font-mono">
                {leg.strike} | {leg.expiry} | Δ {leg.delta}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/30 p-3 rounded-lg text-center">
          <div className="text-xs text-gray-500 mb-1">最大利润</div>
          <div className="text-green-400 font-bold">${strategy.max_profit}</div>
        </div>
        <div className="bg-gray-800/30 p-3 rounded-lg text-center">
          <div className="text-xs text-gray-500 mb-1">最大风险</div>
          <div className="text-red-400 font-bold">${strategy.max_loss}</div>
        </div>
        <div className="bg-gray-800/30 p-3 rounded-lg text-center">
          <div className="text-xs text-gray-500 mb-1">胜率</div>
          <div className="text-blue-400 font-bold">{(strategy.prob_profit * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-gray-800/30 p-3 rounded-lg text-center">
          <div className="text-xs text-gray-500 mb-1">年化收益</div>
          <div className="text-yellow-500 font-bold">{strategy.annualized_return}%</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {strategy.risks.map((risk, idx) => (
          <span key={idx} className="bg-red-900/20 text-red-400 text-[10px] px-2 py-0.5 rounded border border-red-500/20">
            {risk}
          </span>
        ))}
      </div>

      <div className="space-y-1">
        <div className="text-[10px] text-gray-500 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-blue-500"></span>
          {strategy.gex_note}
        </div>
        <div className="text-[10px] text-gray-500 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-purple-500"></span>
          {strategy.skew_note}
        </div>
      </div>
    </div>
  );
};
