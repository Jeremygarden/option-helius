'use client';
import React, { useState, useMemo } from 'react';

interface BacktestEvent {
  date: string;
  event: string;
  max_dd: number;
  return_1y: number;
  model_a: number;
  model_b: number;
  model_c: number;
  model_d: number;
}

const BacktestTable: React.FC<{ data?: BacktestEvent[] }> = ({ data = [] }) => {
  const [showFalsePositivesOnly, setShowFalsePositivesOnly] = useState(false);

  const orangeThreshold = 55;
  const redThresholdB = 70;
  const redThresholdD = 65;

  const isCorrect = (score: number, event: BacktestEvent, redThreshold: number) => {
    const alert = score > orangeThreshold;
    const realCrash = event.max_dd < -20;
    if (alert && realCrash) return true;
    if (!alert && (!realCrash || event.return_1y > 0)) return true;
    return false;
  };

  const isFalsePositive = (score: number, event: BacktestEvent) => {
    return score > orangeThreshold && event.return_1y > 0 && event.max_dd > -20;
  };

  const filteredData = useMemo(() => {
    if (!showFalsePositivesOnly) return data;
    return data.filter(row => row.date === '2011-04' || row.date === '2015-08');
  }, [data, showFalsePositivesOnly]);

  const stats = useMemo(() => {
    if (!data || !data.length) return null;
    const calc = (modelKey: 'model_a' | 'model_b' | 'model_c' | 'model_d', redThr: number) => {
      const correct = data.filter(row => isCorrect(row[modelKey], row, redThr)).length;
      return ((correct / data.length) * 100).toFixed(1) + '%';
    };
    return {
      model_a: calc('model_a', 70),
      model_b: calc('model_b', 70),
      model_c: calc('model_c', 70),
      model_d: calc('model_d', 65),
    };
  }, [data]);

  const getScoreStyle = (score: number, redThr: number) => {
    if (score > redThr) return "bg-red-500/20 text-[var(--accent-red)] font-bold border border-red-500/30";
    if (score > orangeThreshold) return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
    return "bg-green-500/10 text-[var(--accent-green)] border border-green-500/20";
  };

  return (
    <div className="mt-8 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="px-4 py-3 border-b border-[var(--border-default)] flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide font-sans">4模型历史回测对比 (Multi-Model Backtest)</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            对比不同指标权重与阈值组合在过去 100 年重大市场波动中的预警表现。
          </p>
        </div>
        <button 
          onClick={() => setShowFalsePositivesOnly(!showFalsePositivesOnly)}
          className={`px-3 py-1 rounded text-xs transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/40 outline-none ${showFalsePositivesOnly ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'}`}
        >
          {showFalsePositivesOnly ? '显示全部事件' : '仅显示误报分析 (2011/2015)'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-2 font-medium">时间</th>
              <th className="px-4 py-2 font-medium">事件</th>
              <th className="px-4 py-2 font-medium">Model A (8)</th>
              <th className="px-4 py-2 font-medium">Model B (18)</th>
              <th className="px-4 py-2 font-medium">Model C (5F)</th>
              <th className="px-4 py-2 font-medium">Model D (Opt)</th>
              <th className="px-4 py-2 font-medium">真实最大回撤</th>
              <th className="px-4 py-2 font-medium">1年后回报</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-muted)]">
            {filteredData.map((row, idx) => (
              <tr key={idx} className="hover:bg-[var(--bg-elevated)]/40 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/40 outline-none">
                <td className="px-4 py-2 text-[var(--text-muted)] tabular-nums font-mono text-xs">{row.date}</td>
                <td className="px-4 py-2 font-medium text-[var(--text-primary)] text-xs">{row.event}</td>
                
                {/* Model A */}
                <td className="px-4 py-2">
                  <div className={`px-2 py-0.5 rounded text-left text-xs inline-block min-w-[60px] ${getScoreStyle(row.model_a, 70)}`}>
                    {row.model_a.toFixed(1)} {isCorrect(row.model_a, row, 70) ? '✅' : '❌'}
                  </div>
                </td>

                {/* Model B */}
                <td className="px-4 py-2">
                  <div className={`px-2 py-0.5 rounded text-left text-xs inline-block min-w-[60px] ${getScoreStyle(row.model_b, 70)}`}>
                    {row.model_b.toFixed(1)} {isCorrect(row.model_b, row, 70) ? '✅' : '❌'}
                  </div>
                </td>

                {/* Model C */}
                <td className="px-4 py-2">
                  <div className={`px-2 py-0.5 rounded text-left text-xs inline-block min-w-[60px] ${getScoreStyle(row.model_c, 70)}`}>
                    {row.model_c.toFixed(1)} {isCorrect(row.model_c, row, 70) ? '✅' : '❌'}
                  </div>
                </td>

                {/* Model D */}
                <td className="px-4 py-2">
                  <div className={`px-2 py-0.5 rounded text-left text-xs inline-block min-w-[60px] ${getScoreStyle(row.model_d, 65)}`}>
                    {row.model_d.toFixed(1)} {isCorrect(row.model_d, row, 65) ? '✅' : '❌'}
                  </div>
                </td>

                <td className="px-4 py-2 text-[var(--accent-red)]/80">{row.max_dd}%</td>
                <td className={`px-4 py-2 ${row.return_1y < 0 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'}`}>
                  {row.return_1y > 0 ? '+' : ''}{row.return_1y}%
                </td>
              </tr>
            ))}
          </tbody>
          {stats && (
            <tfoot className="bg-[var(--bg-elevated)]/60 font-bold border-t border-[var(--border-default)]">
              <tr>
                <td className="px-4 py-3 text-[var(--text-secondary)] uppercase tracking-wide text-xs" colSpan={2}>模型准确率 (Accuracy)</td>
                <td className="px-4 py-3 text-[var(--accent-blue)] tabular-nums font-mono">{stats.model_a}</td>
                <td className="px-4 py-3 text-[var(--accent-blue)] tabular-nums font-mono">{stats.model_b}</td>
                <td className="px-4 py-3 text-[var(--accent-blue)] tabular-nums font-mono">{stats.model_c}</td>
                <td className="px-4 py-3 text-[var(--accent-green)] tabular-nums font-mono">{stats.model_d}</td>
                <td className="px-4 py-3" colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default BacktestTable;
