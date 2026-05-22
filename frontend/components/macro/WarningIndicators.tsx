import React from 'react';

interface Indicator {
  id: string;
  name: string;
  name_en: string;
  value: number;
  value_display: string;
  status: 'red' | 'orange' | 'green';
  weight: number;
  severity_pct: number;
  description: string;
  threshold_text: string;
  data_source: string;
}

interface WarningIndicatorsProps {
  data: {
    composite_score: number;
    composite_label: string;
    composite_description: string;
    red_count: number;
    orange_count: number;
    green_count: number;
    indicators: Indicator[];
  };
}

const WarningIndicators: React.FC<WarningIndicatorsProps> = ({ data }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-400';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case 'red': return 'border-l-red-500';
      case 'orange': return 'border-l-orange-400';
      case 'green': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const renderProgressBar = (score: number) => {
    const bars = 10;
    const filledBars = Math.round(score / 10);
    return (
      <span className="font-mono text-xl tracking-tighter">
        {Array.from({ length: bars }).map((_, i) => (
          <span key={i} className={i < filledBars ? 'text-red-500' : 'text-gray-700'}>
            █
          </span>
        ))}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Composite Score Display */}
      <div className="card p-6 border-l-4 border-l-red-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">综合风险评分 / Composite Risk Score</h3>
            <div className="flex items-center gap-4">
              {renderProgressBar(data.composite_score)}
              <span className="text-2xl font-bold font-mono">{data.composite_score}/100</span>
              <span className="px-2 py-1 bg-red-900/30 text-red-500 text-xs font-bold rounded border border-red-500/30">
                ⚠️ {data.composite_label}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-white mb-2">{data.composite_description}</p>
            <div className="flex gap-3 justify-end">
              <span className="text-xs text-red-500 font-bold">[🔴 危险区 x{data.red_count}]</span>
              <span className="text-xs text-orange-400 font-bold">[🟡 观察区 x{data.orange_count}]</span>
              <span className="text-xs text-green-500 font-bold">[🟢 正常区 x{data.green_count}]</span>
            </div>
          </div>
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.indicators.map((indicator) => (
          <div key={indicator.id} className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-4 relative overflow-hidden">
            {/* Left colored border strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusColor(indicator.status)}`} />
            
            {/* Header row */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getStatusColor(indicator.status)}`} />
                <span className="text-sm text-gray-300 font-medium">{indicator.name}</span>
              </div>
              <span className="text-xl font-bold text-white font-mono">{indicator.value_display}</span>
            </div>
            
            {/* Main progress/severity bar */}
            <div className="h-1.5 bg-[#2d3748] rounded mb-3">
              <div 
                className={`h-full ${getStatusColor(indicator.status)} rounded transition-all duration-500`} 
                style={{ width: `${indicator.severity_pct}%` }} 
              />
            </div>
            
            {/* Description */}
            <p className="text-[11px] text-gray-400 mb-2 leading-relaxed h-12 overflow-hidden">
              {indicator.description}
            </p>
            
            {/* Threshold annotation */}
            <p className={`text-[11px] font-bold mb-3 ${indicator.status === 'red' ? 'text-red-400' : indicator.status === 'orange' ? 'text-orange-400' : 'text-green-400'}`}>
              {indicator.threshold_text}
            </p>
            
            {/* Weight bar at bottom */}
            <div className="flex items-center gap-2 border-t border-[#2d3748] pt-2">
              <span className="text-[10px] text-gray-500 uppercase">权重</span>
              <div className="flex-1 h-1 bg-[#2d3748] rounded">
                <div className="h-full bg-gray-500 rounded" style={{ width: `${indicator.weight * 100}%` }} />
              </div>
              <span className="text-[10px] text-gray-500 font-mono">{(indicator.weight * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WarningIndicators;
