import React from 'react';

interface RunRiskLevel {
  range: string;
  min: number;
  max: number;
  signal: string;
  color: string;
  accuracy: string;
  position: string;
  is_current: boolean;
}

interface RunRiskData {
  composite_score: number;
  raw_weighted_score: number;
  max_raw_score: number;
  current_position_pct: number;
  signal: string;
  signal_label: string;
  action_label: string;
  recommended_position: string;
  evaluation_text: string;
  action_items: string[];
  levels: RunRiskLevel[];
}

export default function RunRiskPanel({ data }: { data: RunRiskData }) {
  if (!data) return null;

  // Gauge calculation
  const score = data.composite_score;
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden mb-8">
      {/* Header */}
      <div className="p-6 border-b border-[#2d3748]">
        <h2 className="text-xl font-bold text-white mb-2">跑路风险预估</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          基于8个核心市场指标的加权综合模型，衡量当前市场环境与历史上重大顶部 
          (1929, 1973, 2000, 2007)的相似程度。指数越高，意味着当前市场越接近历史
          泡沫特征，应越谨慎对待持仓。
        </p>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Left Side: Score & Gauge */}
        <div className="lg:w-1/3 p-8 border-b lg:border-b-0 lg:border-r border-[#2d3748] flex flex-col items-center justify-center">
          <span className="text-gray-400 text-sm font-medium mb-6 uppercase tracking-wider">综合跑路指数</span>
          
          <div className="relative w-48 h-24 mb-4">
            {/* SVG Gauge */}
            <svg viewBox="0 0 100 50" className="w-full h-full">
              {/* Background Arc */}
              <path 
                d="M 10 45 A 40 40 0 0 1 90 45" 
                fill="none" 
                stroke="#2d3748" 
                strokeWidth="8" 
                strokeLinecap="round"
              />
              {/* Colored Zones */}
              <path d="M 10 45 A 40 40 0 0 1 30 15" fill="none" stroke="#3fb950" strokeWidth="8" />
              <path d="M 30 15 A 40 40 0 0 1 50 10" fill="none" stroke="#d29922" strokeWidth="8" />
              <path d="M 50 10 A 40 40 0 0 1 70 15" fill="none" stroke="#f0883e" strokeWidth="8" />
              <path d="M 70 15 A 40 40 0 0 1 85 30" fill="none" stroke="#f85149" strokeWidth="8" />
              <path d="M 85 30 A 40 40 0 0 1 90 45" fill="none" stroke="#6e7681" strokeWidth="8" />
              
              {/* Needle */}
              <line 
                x1="50" y1="45" 
                x2="50" y2="10" 
                stroke="white" 
                strokeWidth="2" 
                transform={`rotate(${rotation}, 50, 45)`}
              />
              <circle cx="50" cy="45" r="3" fill="white" />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
              <div className="text-7xl font-bold leading-none" style={{ color: '#f0883e' }}>{score}</div>
              <div className="text-gray-500 text-sm mt-1">/100</div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-8 p-3 bg-orange-900/30 border border-orange-500/50 rounded-lg w-full max-w-[240px]">
            <span className="text-orange-400 text-lg">⚠️</span>
            <div>
              <span className="text-orange-400 font-bold">{data.signal_label} · {data.action_label}</span>
              <div className="text-orange-400/70 text-sm">建议仓位: {data.recommended_position}</div>
            </div>
          </div>
        </div>

        {/* Right Side: Evaluation & Metrics */}
        <div className="lg:w-2/3 p-8 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">当前评估</span>
          </div>
          
          <div className="bg-orange-950/40 border border-orange-500/40 rounded-lg p-4 mb-6">
            <p className="text-orange-200 text-sm leading-relaxed">
              {data.evaluation_text}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center py-2 border-b border-[#2d3748]">
              <span className="text-gray-400 text-sm">加权原始分</span>
              <span className="text-white font-mono">{data.raw_weighted_score.toFixed(2)} / {data.max_raw_score.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#2d3748]">
              <span className="text-gray-400 text-sm">标准化指数</span>
              <span className="text-white font-mono">{score}/100</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#2d3748]">
              <span className="text-gray-400 text-sm">当前仓位</span>
              <span className="text-white font-mono">{data.current_position_pct}%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-orange-400 text-sm">建议仓位</span>
              <span className="text-orange-400 font-mono font-bold">{data.recommended_position}</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#2d3748]">
            <h4 className="text-gray-300 text-sm font-medium mb-3">行动清单</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {data.action_items.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2 py-1">
                  <span className="text-orange-400 mt-0.5">▶</span>
                  <span className="text-gray-300 text-xs">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-[#111622] p-4 border-t border-[#2d3748]">
        <div className="px-4 py-2 mb-2">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">跑路触发条件速查</h3>
        </div>
        <div className="grid grid-cols-4 gap-4 px-4 py-2 text-gray-500 text-xs uppercase tracking-wider border-b border-[#2d3748] mb-2">
          <span>指数区间</span>
          <span>信号</span>
          <span>历史准确率</span>
          <span>建议仓位</span>
        </div>
        <div className="space-y-1">
          {data.levels.map((level, idx) => (
            <div 
              key={idx} 
              className={`grid grid-cols-4 gap-4 px-4 py-3 rounded-lg transition-colors ${
                level.is_current ? 'bg-orange-900/20 border border-orange-500/30' : ''
              }`}
            >
              <span className="text-gray-300 font-mono text-sm">{level.range}</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: level.color }} />
                <span style={{ color: level.color }} className="font-medium text-sm">{level.signal}</span>
              </div>
              <span className="text-gray-400 text-sm">{level.accuracy}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-300 font-medium text-sm">{level.position}</span>
                {level.is_current && (
                  <span className="flex items-center text-orange-400 text-[10px] font-bold ml-1">
                    <span className="mr-1">←</span> 你在这里
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
