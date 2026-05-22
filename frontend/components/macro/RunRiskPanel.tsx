import React from 'react';
import RefreshStatus from './RefreshStatus';

export const RunRiskPanel: React.FC<{ status: any, onRefreshDaily: any, onRefreshFull: any }> = ({ 
  status, 
  onRefreshDaily, 
  onRefreshFull 
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">风控执行面板 (Run Risk Panel)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 bg-slate-900/50 rounded border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">当前市场风险等级</div>
              <div className="text-3xl font-black text-yellow-500">MODERATE RISK (67.2)</div>
              <div className="text-xs text-slate-500 mt-2">
                策略建议: 维持 80% 权益仓位，增加对冲保护。综合指数基于 partial refresh 计算。
              </div>
            </div>
            
            <div className="flex gap-4">
              <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors">
                执行策略建议
              </button>
              <button className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition-colors">
                手动调整参数
              </button>
            </div>
          </div>
          
          <div>
            <RefreshStatus 
              status={status}
              onRefreshDaily={onRefreshDaily}
              onRefreshFull={onRefreshFull}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
