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
    <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4 text-sm text-[var(--text-secondary)] shadow-sm">
      <div className="mb-3 font-bold text-[var(--text-primary)] flex items-center justify-between text-xs uppercase tracking-wide">
        <span>数据刷新状态</span>
        <span className="text-[11px] font-normal text-[var(--text-muted)] normal-case tracking-normal">
          综合指数: 每周刷新 | 下次: 周一 09:00
        </span>
      </div>

      <div className="space-y-2.5 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)]">日频指标:</span>
          <span className={allDailyUpdated ? "text-[var(--accent-green)] font-medium" : "text-[var(--accent-yellow)] font-medium"}>
            {allDailyUpdated ? "✅ 今日已更新" : "⚠️ 部分指标待更新"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)]">月频指标:</span>
          <span className="text-[var(--accent-green)] font-medium">✅ 本月已更新</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-muted)]">季频指标:</span>
          <span className="text-[var(--text-muted)]">🟡 上次: 04-01, 距下次更新: 37天</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRefreshDaily}
          className="flex-1 py-2 px-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg text-xs font-medium text-[var(--text-secondary)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/40 focus-visible:outline-none active:scale-[0.98]"
        >
          🔄 手动刷新日频指标
        </button>
        <button
          onClick={onRefreshFull}
          className="flex-1 py-2 px-3 bg-[var(--accent-red)]/10 hover:bg-[var(--accent-red)]/20 border border-[var(--accent-red)]/40 text-[var(--accent-red)] rounded-lg text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-red)]/40 focus-visible:outline-none active:scale-[0.98]"
        >
          ⚡ 强制全量刷新 (管理员)
        </button>
      </div>
    </div>
  );
};

export default RefreshStatus;
