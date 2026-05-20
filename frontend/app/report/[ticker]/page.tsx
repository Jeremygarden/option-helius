'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

const ReportPage = () => {
  const { ticker } = useParams();
  const [activeTab, setActiveTab] = useState('概览');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:8000/api/report/${ticker}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, [ticker]);

  if (loading) return <div className="p-8 text-green-500 font-mono">LOADING_SYSTEM_DATA...</div>;

  return (
    <div className="flex h-screen bg-black text-green-400 font-mono overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden border-l border-green-900/30">
        <div className="p-4 border-b border-green-900/30 flex justify-between items-center bg-green-900/5">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">[{data?.ticker}] {data?.summary?.name}</h1>
            <span className="text-xl">${data?.summary?.price}</span>
            <span className="text-green-500">▲+{data?.summary?.change_pct}%</span>
          </div>
          <div className="px-3 py-1 border border-green-500 rounded text-xs">
            REPORT_MODE: ACTIVE
          </div>
        </div>

        <div className="flex gap-2 p-2 bg-black border-b border-green-900/30">
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
          {activeTab === '情景测试' && <Scenarios ticker={ticker as string} />}
          {activeTab === 'AI分析' && <AIAnalysis ticker={ticker as string} />}
        </div>
      </div>
    </div>
  );
};

const Overview = ({ data }: { data: any }) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="border border-green-900/30 p-4 bg-green-900/5">
      <h3 className="text-lg border-b border-green-900/30 mb-2 pb-1">MARKET_INDICATORS</h3>
      <div className="space-y-2">
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
    <div className="border border-green-900/30 p-4 bg-green-900/5">
      <h3 className="text-lg border-b border-green-900/30 mb-2 pb-1">MACRO_CONTEXT</h3>
      <div className="space-y-2">
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
    <div className="col-span-2 border border-green-900/30 p-4 bg-green-900/5">
      <h3 className="text-lg border-b border-green-900/30 mb-2 pb-1">FAIR_VALUE_SUMMARY (BSM vs Market)</h3>
      <div className="text-sm text-gray-400">
        System analysis shows that current premiums are slightly <span className="text-orange-400">EXPENSIVE</span> on the Put side.
        Call premiums are trading near <span className="text-green-400">FAIR</span> value.
      </div>
    </div>
  </div>
);

const Chain = ({ ticker }: { ticker: string }) => (
  <div className="h-full border border-green-900/30">
     <div className="p-4 bg-green-900/5 h-full flex items-center justify-center text-gray-500">
        [Existing Options Chain Terminal Integration Placeholder]
     </div>
  </div>
);

const Greeks = ({ ticker }: { ticker: string }) => {
  const [position, setPosition] = useState('Sell 1 NVDA Aug 850P @ $12.50');
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input 
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="bg-black border border-green-500 p-2 flex-1 text-green-500 focus:outline-none"
        />
        <button className="bg-green-500 text-black px-4 font-bold hover:bg-green-400">[CALC]</button>
      </div>
      <table className="w-full border-collapse border border-green-900/30 text-sm">
        <thead>
          <tr className="bg-green-900/20">
            <th className="border border-green-900/30 p-2">Position</th>
            <th className="border border-green-900/30 p-2 text-blue-400">Delta</th>
            <th className="border border-green-900/30 p-2 text-purple-400">Gamma</th>
            <th className="border border-green-900/30 p-2 text-yellow-400">Theta</th>
            <th className="border border-green-900/30 p-2 text-red-400">Vega</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-green-900/30 p-2">{position}</td>
            <td className="border border-green-900/30 p-2 text-blue-400">0.342</td>
            <td className="border border-green-900/30 p-2 text-purple-400">0.0012</td>
            <td className="border border-green-900/30 p-2 text-yellow-400">-4.52</td>
            <td className="border border-green-900/30 p-2 text-red-400">12.5</td>
          </tr>
        </tbody>
      </table>
      <div className="h-48 border border-green-900/30 bg-green-900/5 flex items-center justify-center text-xs text-gray-500">
        [Greeks Heatmap: Strike vs DTE vs Gamma]
      </div>
    </div>
  );
};

const Scenarios = ({ ticker }: { ticker: string }) => {
  const [scenarios, setScenarios] = useState<any[]>([]);

  useEffect(() => {
    fetch(`http://localhost:8000/api/analyze/scenarios/${ticker}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{strike: 850, dte: 30, vol: 0.45, type: 'put', size: -1}])
    }).then(res => res.json()).then(setScenarios).catch(err => console.error(err));
  }, [ticker]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-green-900/30 text-sm">
        <thead>
          <tr className="bg-green-900/20">
            <th className="border border-green-900/30 p-2 text-left">情景</th>
            <th className="border border-green-900/30 p-2 text-left">触发条件</th>
            <th className="border border-green-900/30 p-2 text-right">P&L影响</th>
            <th className="border border-green-900/30 p-2 text-right">Greeks变化</th>
            <th className="border border-green-900/30 p-2 text-center">建议对冲</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((sc, i) => (
            <tr key={i} className="hover:bg-green-900/10">
              <td className="border border-green-900/30 p-2">{sc.scenario}</td>
              <td className="border border-green-900/30 p-2 text-gray-400">{sc.trigger}</td>
              <td className={`border border-green-900/30 p-2 text-right ${sc.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {sc.pnl >= 0 ? '+' : ''}${sc.pnl.toLocaleString()}
              </td>
              <td className="border border-green-900/30 p-2 text-right text-blue-400">Delta: {sc.delta_change}</td>
              <td className="border border-green-900/30 p-2 text-center">
                <span className="px-2 py-0.5 border border-green-500 text-xs rounded">{sc.advice}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AIAnalysis = ({ ticker }: { ticker: string }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = () => {
    setLoading(true);
    fetch(`http://localhost:8000/api/analyze/ai/${ticker}?strategy=Sell Put&strike=850&expiry=2025-08-20`)
      .then(res => res.json())
      .then(d => {
        setAnalysis(d);
        setLoading(false);
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 p-4 border border-green-900/30 bg-green-900/5">
         <select className="bg-black border border-green-900/50 p-2 text-green-500">
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
        <div className="border border-green-500 p-6 bg-black space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-[8px] opacity-20">SYSTEM_AI_STRAT_v4.2</div>
          <div className="text-green-400">{analysis.validity}</div>
          <div className="text-orange-400">{analysis.risks}</div>
          <div className="text-blue-400">{analysis.market_exp}</div>
          <div className="text-yellow-400">{analysis.key_levels}</div>
          <div className="text-red-400">{analysis.hedging}</div>
          <div className="mt-4 pt-4 border-t border-green-900/50 font-bold">
            {analysis.conclusion}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPage;
