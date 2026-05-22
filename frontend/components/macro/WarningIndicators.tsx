import React from 'react';

interface IndicatorCardProps {
  id: string;
  name: string;
  value: number | string;
  updatedAt: string | null;
  tier: string;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({ id, name, value, updatedAt, tier }) => {
  const getStalenessBadge = (updatedAt: string | null) => {
    if (!updatedAt) return { label: '无数据', color: 'bg-slate-500' };
    
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffHours = (now.getTime() - updated.getTime()) / (1000 * 60 * 60);

    if (diffHours < 2) return { label: '刚刚更新', color: 'bg-green-500' };
    if (diffHours < 24) return { label: '今日数据', color: 'bg-yellow-500' };
    if (diffHours < 24 * 7) return { label: `数据较旧 (${Math.floor(diffHours/24)}天)`, color: 'bg-orange-500' };
    return { label: '数据过期', color: 'bg-red-500' };
  };

  const badge = getStalenessBadge(updatedAt);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 relative overflow-hidden">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">{name}</h3>
        <span className={`text-[10px] px-1.5 py-0.5 rounded text-white font-bold ${badge.color}`}>
          {badge.label}
        </span>
      </div>
      
      <div className="text-2xl font-bold text-white mb-1">
        {value}
      </div>
      
      <div className="text-[10px] text-slate-500 italic">
        更新于: {updatedAt ? new Date(updatedAt).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
};

export const WarningIndicators: React.FC<{ indicators: any[] }> = ({ indicators }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {indicators.map(ind => (
        <IndicatorCard 
          key={ind.id}
          id={ind.id}
          name={ind.name}
          value={ind.value}
          updatedAt={ind.updated_at}
          tier={ind.tier}
        />
      ))}
    </div>
  );
};
