import React from 'react';

interface RefreshStatusProps {
  status: Record<string, {
    last_updated: string | null;
    is_stale: boolean;
    tier: string;
  }>;
  onRefreshDaily: () => void;
  onRefreshFull: () => void;
}

const RefreshStatus: React.FC<RefreshStatusProps> = ({ status, onRefreshDaily, onRefreshFull }) => {
  const getNextRefresh = (tier: string) => {
    if (tier === 'daily') return '今日 09:30 UTC';
    if (tier === 'weekly') return '下周一 01:00 UTC';
    if (tier === 'monthly') return '下月1日 00:30 UTC';
    return '季度更新';
  };

  const dailyStatus = Object.values(status).filter(s => s.tier === 'daily');
  const allDailyUpdated = dailyStatus.every(s => !s.is_stale && s.last_updated);
  
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-300">
      <div className="mb-3 font-semibold text-slate-100 flex items-center justify-between">
        <span>数据刷新状态</span>
        <span className="text-xs font-normal text-slate-500">综合指数: 每周刷新 | 下次刷新: 周一 09:00</span>
      </div>
      
      <div className="space-y-4 mb-4">
        <div className="flex justify-between items-center">
          <span>日频指标:</span>
          <span className={allDailyUpdated ? "text-[var(--accent-green)]" : "text-yellow-400"}>
            {allDailyUpdated ? "✅ 今日已更新" : "⚠️ 部分指标待更新"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>月频指标:</span>
          <span className="text-[var(--accent-green)]">✅ 本月已更新</span>
        </div>
        <div className="flex justify-between items-center text-slate-500">
          <span>季频指标:</span>
          <span>🟡 上次: 04-01, 距下次更新: 37天</span>
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={onRefreshDaily}
          className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs transition-colors"
        >
          🔄 手动刷新日频指标
        </button>
        <button 
          onClick={onRefreshFull}
          className="flex-1 py-1.5 px-3 bg-red-900/30 hover:bg-red-800/40 border border-red-700/50 text-[var(--accent-red)] rounded text-xs transition-colors"
        >
          ⚡ 强制全量刷新 (管理员)
        </button>
      </div>
    </div>
  );
};

export default RefreshStatus;
