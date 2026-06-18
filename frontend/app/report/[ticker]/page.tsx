'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

// Use env var for API URL; fallback to localhost for local dev
// In Docker, NEXT_PUBLIC_API_URL=http://backend:8000 but browser can't resolve that,
// so we use relative /api paths that Next.js rewrites to the backend.
const API_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

const ReportPage = () => {
  const { ticker } = useParams();
  const [activeTab, setActiveTab] = useState('概览');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/report/${ticker}`)
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [ticker]);

  if (loading) return <div className="p-8 text-green-500 font-mono">LOADING_SYSTEM_DATA...</div>;
  if (error) return <div className="p-8 text-red-500 font-mono">ERROR: {error}</div>;
  if (!data) return <div className="p-8 text-yellow-500 font-mono">NO_DATA_RETURNED</div>;

  return (
    <div className="flex h-screen bg-[var(--bg-base)] text-[var(--accent-green)] font-mono overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden border-l border-[var(--border-default)]">
        <div className="p-4 border-b border-[var(--border-default)] flex justify-between items-center bg-[var(--bg-surface)]">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">[{data?.ticker}] {data?.summary?.name}</h1>
            <span className="text-xl">${data?.summary?.price}</span>
            <span className="text-green-500">▲+{data?.summary?.change_pct}%</span>
          </div>
          <div className="px-3 py-1 border border-green-500 rounded text-xs">
            REPORT_MODE: ACTIVE
          </div>
        </div>

        <div className="flex gap-4 p-4 bg-[var(--bg-base)] border-b border-[var(--border-default)]">
          {['概览', '期权链', 'Greeks', '情景测试', 'AI分析'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1 border ${activeTab === tab ? 'bg-green-500 text-black border-green-500' : 'border-green-900/50 hover:border-green-500'}`}
            >
              [Tab: {tab}]
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          {activeTab === '概览' && <Overview data={data} />}
          {activeTab === '期权链' && <Chain ticker={ticker as string} />}
          {activeTab === 'Greeks' && <Greeks ticker={ticker as string} />}
          {activeTab === '情景测试' && <Scenarios data={data} />}
          {activeTab === 'AI分析' && <AIAnalysis ticker={ticker as string} />}
        </div>
      </div>
    </div>
  );
};

const Overview = ({ data }: { data: any }) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="border border-[var(--border-default)] p-4 bg-[var(--bg-surface)]">
      <h3 className="text-lg border-b border-[var(--border-default)] mb-2 pb-1">MARKET_INDICATORS</h3>
      <div className="space-y-4">
        <div className="flex justify-between">
          <span>IV Rank:</span>
          <span className="text-orange-500 font-bold">{data?.summary?.iv_rank} 🔥 HIGH</span>
        </div>
        <div className="flex justify-between">
          <span>Implied Move (Earnings):</span>
          <span className="text-yellow-500">±{data?.summary?.implied_move}%</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Next Earnings:</span>
          <span>{data?.summary?.earnings_date}</span>
        </div>
      </div>
    </div>
    <div className="border border-[var(--border-default)] p-4 bg-[var(--bg-surface)]">
      <h3 className="text-lg border-b border-[var(--border-default)] mb-2 pb-1">MACRO_CONTEXT</h3>
      <div className="space-y-4">
        <div className="flex justify-between">
          <span>VIX Level:</span>
          <span>{data?.macro_context?.vix}</span>
        </div>
        <div className="flex justify-between">
          <span>Fed Rate:</span>
          <span>{data?.macro_context?.fed_rate}</span>
        </div>
      </div>
    </div>
    <div className="col-span-2 border border-[var(--border-default)] p-4 bg-[var(--bg-surface)]">
      <h3 className="text-lg border-b border-[var(--border-default)] mb-2 pb-1">FAIR_VALUE_SUMMARY (BSM vs Market)</h3>
      <div className="text-sm text-gray-400">
        System analysis shows that current premiums are slightly <span className="text-orange-400">EXPENSIVE</span> on the Put side.
        Call premiums are trading near <span className="text-[var(--accent-green)]">FAIR</span> value.
      </div>
    </div>
  </div>
);

const Chain = ({ ticker }: { ticker: string }) => (
  <div className="h-full border border-[var(--border-default)]">
     <div className="p-4 bg-[var(--bg-surface)] h-full flex items-center justify-center text-gray-500">
        [Existing Options Chain Terminal Integration Placeholder]
     </div>
  </div>
);

const Greeks = ({ ticker }: { ticker: string }) => {
  const [position, setPosition] = useState('Sell 1 NVDA Aug 850P @ $12.50');
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input 
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="bg-[var(--bg-base)] border border-green-500 p-4 flex-1 text-green-500 focus:outline-none"
        />
        <button className="bg-green-500 text-black px-4 font-bold hover:bg-green-400">[CALC]</button>
      </div>
      <table className="w-full border-collapse border border-[var(--border-default)] text-sm">
        <thead>
          <tr className="bg-green-900/20">
            <th className="border border-[var(--border-default)] p-4">Position</th>
            <th className="border border-[var(--border-default)] p-4 text-blue-400">Delta</th>
            <th className="border border-[var(--border-default)] p-4 text-purple-400">Gamma</th>
            <th className="border border-[var(--border-default)] p-4 text-yellow-400">Theta</th>
            <th className="border border-[var(--border-default)] p-4 text-[var(--accent-red)]">Vega</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[var(--border-default)] p-4">{position}</td>
            <td className="border border-[var(--border-default)] p-4 text-blue-400">0.342</td>
            <td className="border border-[var(--border-default)] p-4 text-purple-400">0.0012</td>
            <td className="border border-[var(--border-default)] p-4 text-yellow-400">-4.52</td>
            <td className="border border-[var(--border-default)] p-4 text-[var(--accent-red)]">12.5</td>
          </tr>
        </tbody>
      </table>
      <div className="h-48 border border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center justify-center text-xs text-gray-500">
        [Greeks Heatmap: Strike vs DTE vs Gamma]
      </div>
    </div>
  );
};

const Scenarios = ({ data }: { data: any }) => {
  const scenarios = data?.scenarios || [];
  const [selected, setSelected] = useState(scenarios[0] || null);
  const [customParams, setCustomParams] = useState({ ds: -15, dv: 0.8, dt: 1, dr: 0 });
  const [isCustom, setIsCustom] = useState(false);
  const [customResult, setCustomResult] = useState<any>(null);

  if (!scenarios.length) return <div className="p-4 text-yellow-500">No scenario data available.</div>;

  const handleCustomChange = (field: string, val: number) => {
    const next = { ...customParams, [field]: val };
    setCustomParams(next);
    fetch(`${API_BASE}/api/report/${data.ticker}/scenarios/custom?ds=${next.ds}&dv=${next.dv}&dt=${next.dt}&dr=${next.dr}`)
      .then(res => res.json())
      .then(setCustomResult)
      .catch(err => console.error('Custom scenario error:', err));
  };

  const current = isCustom ? (customResult || data.scenarios[0]) : selected;

  return (
    <div className="flex gap-4 h-full">
      {/* Sidebar: Scenario Selection */}
      <div className="w-1/3 space-y-4 border-r border-[var(--border-default)] pr-4">
        <div className="text-xs text-gray-500 mb-4 uppercase">Scenario Library</div>
        {scenarios.map((sc: any, i: number) => (
          <div 
            key={i}
            onClick={() => { setSelected(sc); setIsCustom(false); }}
            className={`p-4 border cursor-pointer transition-all ${!isCustom && selected?.name === sc.name ? 'border-green-500 bg-green-500/10' : 'border-[var(--border-default)] hover:border-green-700'}`}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold">{sc.name}</span>
              <span className={`text-xs ${sc.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {sc.total_pnl >= 0 ? '+' : ''}${sc.total_pnl}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1">{sc.trigger}</div>
          </div>
        ))}
        
        <div className="h-px bg-green-900/30 my-4" />
        
        <div 
          onClick={() => { setIsCustom(true); handleCustomChange('ds', customParams.ds); }}
          className={`p-4 border cursor-pointer ${isCustom ? 'border-green-500 bg-green-500/10' : 'border-[var(--border-default)]'}`}
        >
          <div className="font-bold mb-3">自定义情景 (Custom)</div>
          <div className="space-y-4 text-xs">
             <div>
                <div className="flex justify-between mb-1">
                   <span>标的变动: {customParams.ds}%</span>
                </div>
                <input type="range" min="-50" max="50" step="1" value={customParams.ds} onChange={e => handleCustomChange('ds', parseInt(e.target.value))} className="w-full accent-green-500" />
             </div>
             <div>
                <div className="flex justify-between mb-1">
                   <span>IV变动: +{Math.round(customParams.dv * 100)}pts</span>
                </div>
                <input type="range" min="-1" max="2" step="0.01" value={customParams.dv} onChange={e => handleCustomChange('dv', parseFloat(e.target.value))} className="w-full accent-orange-500" />
             </div>
             <div>
                <div className="flex justify-between mb-1">
                   <span>时间流逝: {customParams.dt} 天</span>
                </div>
                <input type="range" min="0" max="90" step="1" value={customParams.dt} onChange={e => handleCustomChange('dt', parseInt(e.target.value))} className="w-full accent-blue-500" />
             </div>
          </div>
        </div>
      </div>

      {/* Main Panel: Results */}
      <div className="flex-1 space-y-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 rounded">
          <div className="flex justify-between items-start mb-6">
             <div>
                <div className="text-gray-500 text-xs mb-1">RESULT_PANEL // {isCustom ? 'CUSTOM_SIMULATION' : current.name}</div>
                <div className="text-2xl font-bold flex items-baseline gap-4">
                  总P&L: <span className={current.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {current.total_pnl >= 0 ? '+' : ''}${current.total_pnl.toLocaleString()}
                  </span>
                  <span className="text-sm font-normal text-gray-500">
                    ({current.pnl_pct_of_max_risk}%)
                  </span>
                </div>
             </div>
             <div className={`px-4 py-2 border rounded font-bold ${current.survival ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500 animate-pulse'}`}>
                {current.survival ? 'STATUS: SURVIVED' : 'STATUS: MARGIN_CALL'}
             </div>
          </div>

          <div className="space-y-4">
             <div className="text-xs text-gray-500 uppercase tracking-widest">P&L Breakdown (Taylor Series)</div>
             {[
               { label: 'Delta贡献', val: current.breakdown.delta_pnl, color: 'bg-blue-500' },
               { label: 'Vega贡献', val: current.breakdown.vega_pnl, color: 'bg-orange-500' },
               { label: 'Gamma贡献', val: current.breakdown.gamma_pnl, color: 'bg-purple-500' },
               { label: 'Theta贡献', val: current.breakdown.theta_pnl, color: 'bg-yellow-500' },
               { label: 'Rho贡献', val: current.breakdown.rho_pnl, color: 'bg-gray-500' },
             ].map((item, idx) => {
                const totalAbs = Object.values(current.breakdown).reduce((a: any, b: any) => Math.abs(a) + Math.abs(b), 0) as number;
                const width = totalAbs > 0 ? (Math.abs(item.val) / totalAbs * 100) : 0;
                return (
                  <div key={idx} className="space-y-4">
                    <div className="flex justify-between text-xs">
                      <span>{item.label}: <span className={item.val >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>{item.val >= 0 ? '+' : ''}${item.val}</span></span>
                      {current.dominant_risk.toLowerCase().includes(item.label.slice(0, 4).toLowerCase()) && <span className="text-orange-500 text-[10px]">← 主要风险因子</span>}
                    </div>
                    <div className="h-2 bg-green-900/10 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${width}%` }}></div>
                    </div>
                  </div>
                );
             })}
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--border-default)]">
             <div className="text-xs text-gray-500 mb-3 uppercase"> 对冲建议 (Hedge Recommendations) </div>
             <div className="grid grid-cols-2 gap-4">
                {current.hedges?.map((h: any, i: number) => (
                  <div key={i} className="p-4 border border-[var(--border-default)] bg-[var(--bg-base)]/40 rounded">
                     <div className="text-sm font-bold text-[var(--accent-green)] mb-1">{h.hedge}</div>
                     <div className="flex justify-between text-[10px] text-gray-500">
                        <span>Cost: {h.cost_estimate}</span>
                        <span className="text-blue-400">Effect: {h.effectiveness}</span>
                     </div>
                  </div>
                )) || <div className="text-gray-500 text-xs italic">No specific hedge needed.</div>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AIAnalysis = ({ ticker }: { ticker: string }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/analyze/ai/${ticker}?strategy=Sell Put&strike=850&expiry=2025-08-20`)
      .then(res => res.json())
      .then(d => {
        setAnalysis(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('AI analysis error:', err);
        setLoading(false);
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 p-4 border border-[var(--border-default)] bg-[var(--bg-surface)]">
         <select className="bg-[var(--bg-base)] border border-green-900/50 p-4 text-green-500">
            <option>Sell Put</option>
            <option>Buy Call</option>
            <option>Iron Condor</option>
         </select>
         <button 
           onClick={runAnalysis}
           className="bg-green-500 text-black px-8 font-bold hover:bg-green-400"
         >
           [分析 / ANALYZE]
         </button>
      </div>

      {loading && <div className="animate-pulse text-green-500">AI_THINKING...</div>}

      {analysis && (
        <div className="border border-green-500 p-4 bg-[var(--bg-base)] space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 text-[8px] opacity-20">SYSTEM_AI_STRAT_v4.2</div>
          <div className="text-[var(--accent-green)]">{analysis.validity}</div>
          <div className="text-orange-400">{analysis.risks}</div>
          <div className="text-blue-400">{analysis.market_exp}</div>
          <div className="text-yellow-400">{analysis.key_levels}</div>
          <div className="text-[var(--accent-red)]">{analysis.hedging}</div>
          <div className="mt-4 pt-4 border-t border-green-900/50 font-bold">
            {analysis.conclusion}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPage;
