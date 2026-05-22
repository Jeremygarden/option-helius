import React from 'react';

interface Indicator {
  id: string;
  name: string;
  name_en: string;
  value: number;
  value_display: string;
  status: 'red' | 'orange' | 'yellow' | 'green';
  severity_pct: number;
  data_source: string;
  updated_at: string;
}

interface Category {
  name: string;
  score: number;
  indicators: Indicator[];
}

interface MacroData {
  summary: {
    score: number;
    signal: string;
    category_scores: Record<string, number>;
  };
  categories: Record<string, Category>;
}

const SectionHeader: React.FC<{ icon: string; title: string; subtitle: string; score: number }> = ({ icon, title, subtitle, score }) => {
  const getScoreColor = (s: number) => {
    if (s > 70) return 'text-red-500';
    if (s > 55) return 'text-orange-500';
    if (s > 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <div>
          <h2 className="text-white font-bold">{title}</h2>
          <p className="text-slate-400 text-[10px]">{subtitle}</p>
        </div>
      </div>
      <div className={`text-sm font-mono font-bold ${getScoreColor(score)}`}>
        {score} / 100
      </div>
    </div>
  );
};

const IndicatorCard: React.FC<{ indicator: Indicator }> = ({ indicator }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getStalenessInfo = (updatedAt: string) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffHours = (now.getTime() - updated.getTime()) / (1000 * 60 * 60);
    if (diffHours < 2) return { label: '🟢', color: 'text-green-500' };
    if (diffHours < 25) return { label: '🟡', color: 'text-yellow-500' };
    return { label: '🔴', color: 'text-red-500' };
  };

  const staleness = getStalenessInfo(indicator.updated_at);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 relative overflow-hidden flex flex-col justify-between">
      <div className="flex justify-between items-start mb-1">
        <div>
          <h3 className="text-slate-200 text-xs font-bold">{indicator.name}</h3>
          <p className="text-slate-500 text-[9px] font-mono">{indicator.name_en}</p>
        </div>
        <span title="数据新鲜度">{staleness.label}</span>
      </div>
      
      <div className="my-2">
        <div className="text-xl font-bold text-white leading-none">
          {indicator.value_display}
        </div>
      </div>

      <div className="w-full bg-slate-700 h-1 rounded-full mt-1 overflow-hidden">
        <div 
          className={`h-full ${getStatusColor(indicator.status)}`} 
          style={{ width: `${indicator.severity_pct}%` }}
        />
      </div>

      <div className="flex justify-between items-center mt-2 text-[9px] text-slate-500">
        <span>{indicator.data_source}</span>
        <span>{new Date(indicator.updated_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export const WarningIndicators: React.FC<{ data: MacroData }> = ({ data }) => {
  if (!data || !data.categories) return null;

  const categoryConfigs: Record<string, { icon: string; subtitle: string }> = {
    volatility: { icon: "📊", subtitle: "市场恐慌与期权定价" },
    sentiment: { icon: "😱", subtitle: "市场情绪与逆向指标" },
    cross_asset: { icon: "🌐", subtitle: "跨市场关联与信用利差" },
    breadth: { icon: "📐", subtitle: "市场参与度与广度" },
    valuation: { icon: "💰", subtitle: "历史估值与回报潜力" },
    positioning: { icon: "🏦", subtitle: "仓位配置与趋势强度" }
  };

  return (
    <div className="space-y-8">
      {Object.entries(data.categories).map(([key, cat]) => (
        <div key={key}>
          <SectionHeader 
            icon={categoryConfigs[key]?.icon || "🔹"} 
            title={cat.name} 
            subtitle={categoryConfigs[key]?.subtitle || ""}
            score={cat.score}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cat.indicators.map(ind => (
              <IndicatorCard key={ind.id} indicator={ind} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
