'use client';

import React, { useState, useEffect } from 'react';
import RunRiskPanel from '@/components/macro/RunRiskPanel';
import BacktestTable from '@/components/macro/BacktestTable';

export default function MacroPage() {
  const [macroData, setMacroData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would be an API call
    // For now, we'll use a local mock or the backend data if available
      useEffect(() => {
    const fetchData = async () => {
      try {
        const [indicatorsResp, compositeResp] = await Promise.all([
          fetch("/api/macro/indicators"),
          fetch("/api/macro/composite")
        ]);
        
        const indicators = await indicatorsResp.json();
        const composite = await compositeResp.json();
        
        // Transform the 18 indicators into the structure expected by components
        // The components might need specific mapping which we will refine in the next round
        setMacroData({
          run_risk: {
            composite_score: composite.score,
            ...composite
          },
          warning_indicators: {
            composite_score: composite.score,
            indicators: Object.entries(indicators).map(([id, data]: [string, any]) => ({
              id,
              ...data,
              // Add frontend-specific display helpers
              value_display: typeof data.value === 'number' ? data.value.toFixed(2) : data.value,
            }))
          }
        });
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch macro data", error);
        setLoading(false);
      }
    };

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch macro data", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold font-sans">宏观概览
          <span className="text-[var(--accent-blue)] text-base font-normal ml-2">Macro Dashboard</span>
        </h1>
      </div>

      {macroData?.run_risk && (
        <RunRiskPanel />
      )}

      <BacktestTable />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "VIX INDEX", value: "14.50", change: "-2.1%", color: "text-accent-green" },
          { label: "US 10Y YIELD", value: "4.25%", change: "+0.5%", color: "text-accent-red" },
          { label: "DXY INDEX", value: "104.2", change: "+0.1%", color: "text-[var(--accent-blue)]" },
          { label: "GOLD", value: "$2350", change: "+1.2%", color: "text-accent-green" },
        ].map((item) => (
          <div key={item.label} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4">
            <span className="text-[10px] text-[var(--accent-blue)] uppercase font-bold tracking-wide font-mono">{item.label}</span>
            <div className="flex items-baseline gap-4 mt-1">
              <span className="text-xl font-bold font-mono font-mono">{item.value}</span>
              <span className={`text-xs font-bold font-mono transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none ${item.color}`}>{item.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4">
           <h3 className="text-sm font-semibold mb-4 font-sans">收益率曲线 / Yield Curve (1M - 30Y)</h3>
           <div className="h-64 border-l border-b border-[var(--border-default)] relative rounded">
              <div className="absolute inset-0 flex items-center justify-center text-[var(--accent-blue)] text-4xl font-bold uppercase rotate-12">
                 Coming Soon
              </div>
           </div>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4">
           <h3 className="text-sm font-semibold mb-4 font-sans">当前市场状态 / Market Regime</h3>
           <div className="flex flex-col gap-4 mt-8">
              <div className="flex flex-col items-center">
                 <div className="w-32 h-32 rounded-full border-4 border-accent-teal flex items-center justify-center text-accent-teal font-bold text-center p-4 transition-all">
                    Low Vol Expansion
                 </div>
                 <span className="mt-4 text-sm font-medium">Risk-On Mode</span>
              </div>
              <div className="space-y-4 mt-4">
                 <div className="flex justify-between text-xs">
                    <span className="text-[var(--accent-blue)]">Bullish Prob.</span>
                    <span className="text-accent-green font-mono">78%</span>
                 </div>
                 <div className="w-full h-1 bg-[var(--accent-blue)] rounded-full overflow-hidden">
                    <div className="h-full bg-accent-teal transition-all" style={{ width: '78%' }} />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
