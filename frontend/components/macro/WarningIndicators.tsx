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
    if (s > 70) return 'text-[var(--accent-red)]';
    if (s > 55) return 'text-[var(--accent-orange)]';
    if (s > 40) return 'text-[var(--accent-yellow)]';
    return 'text-[var(--accent-green)]';
  };

  return (
    <div className="flex items-center justify-between mb-4 border-b border-[var(--border-default)] pb-2">
      <div className="flex items-center gap-3">
        <span className="text-xl font-mono" aria-hidden="true">{icon}</span>
        <div>
          <h2 className="text-[var(--text-primary)] text-sm font-bold font-sans uppercase tracking-wide">{title}</h2>
          <p className="text-[var(--text-muted)] text-[10px] font-mono mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className={`text-sm font-mono font-bold tabular-nums ${getScoreColor(score)}`}>
        {score} <span className="text-[var(--text-muted)] font-normal">/ 100</span>
      </div>
    </div>
  );
};

const IndicatorCard: React.FC<{ indicator: Indicator }> = ({ indicator }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'red': return 'bg-[var(--accent-red)]';
      case 'orange': return 'bg-[var(--accent-orange)]';
      case 'yellow': return 'bg-[var(--accent-yellow)]';
      default: return 'bg-[var(--accent-green)]';
    }
  };

  const getStalenessInfo = (updatedAt: string) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffHours = (now.getTime() - updated.getTime()) / (1000 * 60 * 60);
    if (diffHours < 2) return { label: '🟢', color: 'text-[var(--accent-green)]' };
    if (diffHours < 25) return { label: '🟡', color: 'text-[var(--accent-yellow)]' };
    return { label: '🔴', color: 'text-[var(--accent-red)]' };
  };

  const staleness = getStalenessInfo(indicator.updated_at);

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4 relative overflow-hidden flex flex-col justify-between transition-colors hover:border-[var(--accent-blue)]/40">
      <div className="flex justify-between items-start mb-1 gap-2">
        <div className="min-w-0">
          <h3 className="text-[var(--text-primary)] text-xs font-bold font-sans truncate">{indicator.name}</h3>
          <p className="text-[var(--text-muted)] text-[9px] font-mono truncate mt-0.5">{indicator.name_en}</p>
        </div>
        <span title="数据新鲜度" aria-label="数据新鲜度">{staleness.label}</span>
      </div>

      <div className="my-2">
        <div className="text-xl font-bold text-[var(--text-primary)] leading-none font-mono tabular-nums">
          {indicator.value_display}
        </div>
      </div>

      <div className="w-full bg-[var(--bg-elevated)] h-1 rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full ${getStatusColor(indicator.status)} transition-all duration-300`}
          style={{ width: `${indicator.severity_pct}%` }}
        />
      </div>

      <div className="flex justify-between items-center mt-2 text-[9px] text-[var(--text-muted)] font-mono">
        <span className="truncate">{indicator.data_source}</span>
        <span className="tabular-nums">{new Date(indicator.updated_at).toLocaleDateString()}</span>
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
    <div className="space-y-6">
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
