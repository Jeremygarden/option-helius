"use client";

import React, { useState, useEffect } from 'react';
import { StrategyCard } from '@/components/picks/StrategyCard';

export default function PicksPage() {
  const [ticker, setTicker] = useState('NVDA');
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStrategies() {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/strategies/${ticker}`);
        const data = await res.json();
        setStrategies(data);
      } catch (err) {
        console.error("Failed to fetch strategies", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStrategies();
  }, [ticker]);

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">精选策略 / Premium Options Picks</h1>
          <p className="text-gray-400 text-sm mt-1">Multi-signal engine: IV Rank + GEX + Skew + Trend</p>
        </div>
        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
          {['NVDA', 'SPY', 'QQQ', 'TSLA'].map(t => (
            <button
              key={t}
              onClick={() => setTicker(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                ticker === t ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <section>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-lg font-bold">策略雷达 / Strategy Leaderboard</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-gray-800 to-transparent"></div>
        </div>
        
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-500 italic">
            Engine calculating optimal strikes...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {strategies.map((strat) => (
              <div 
                key={strat.strategy} 
                className="bg-gray-900/40 border border-gray-800 p-3 rounded-lg flex flex-col items-center text-center hover:border-blue-500/50 transition-colors cursor-pointer group"
              >
                <div className="text-[10px] text-gray-500 mb-1 uppercase font-mono">Score</div>
                <div className={`text-xl font-bold mb-1 ${strat.score > 80 ? 'text-green-400' : strat.score > 60 ? 'text-blue-400' : 'text-gray-400'}`}>
                  {strat.score}
                </div>
                <div className="text-xs font-medium text-white group-hover:text-blue-400 transition-colors">{strat.strategy_cn}</div>
                <div className="text-[9px] text-gray-600 truncate w-full">{strat.strategy}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-lg font-bold">推荐组合 / Recommended Deployments</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-gray-800 to-transparent"></div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-96 bg-gray-900/50 animate-pulse rounded-xl border border-gray-800"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.slice(0, 3).map((strat) => (
              <StrategyCard key={strat.strategy} strategy={strat} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-6">
        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Engine Logic Notes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-xs text-gray-400 leading-relaxed">
          <p><strong className="text-gray-300">IV Rank ({ticker}):</strong> Current environment favors {strategies[0]?.strategy.includes('Sell') || strategies[0]?.strategy.includes('Iron') ? 'selling premium' : 'buying protection/leverage'}.</p>
          <p><strong className="text-gray-300">GEX Impact:</strong> {strategies[0]?.gex_note}</p>
          <p><strong className="text-gray-300">Skew Signal:</strong> {strategies[0]?.skew_note}</p>
          <p><strong className="text-gray-300">Safety Policy:</strong> Minimum 1.5x implied move buffer for sell-side strategies.</p>
        </div>
      </section>
    </div>
  );
}
