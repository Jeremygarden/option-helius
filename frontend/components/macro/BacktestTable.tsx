import React from 'react';

interface BacktestEvent {
  date: string;
  event: string;
  target: number;
  computed: number;
  yr1_return: string;
  max_drawdown: string;
  correct: boolean;
}

const HISTORICAL_BACKTEST: BacktestEvent[] = [
    {"date": "1929-09", "event": "大萧条前夕", "target": 85, "computed": 86.1, "yr1_return": "-38.6%", "max_drawdown": "-86.2%", "correct": true},
    {"date": "1937-02", "event": "1937二次探底前", "target": 72, "computed": 48.9, "yr1_return": "-35.0%", "max_drawdown": "-60.0%", "correct": true},
    {"date": "1946-05", "event": "战后通胀回调", "target": 55, "computed": 55.1, "yr1_return": "-12.1%", "max_drawdown": "-29.6%", "correct": true},
    {"date": "1968-12", "event": "漂亮50泡沫前夕", "target": 68, "computed": 66.0, "yr1_return": "-8.5%", "max_drawdown": "-36.1%", "correct": true},
    {"date": "1972-12", "event": "漂亮50泡沫顶点", "target": 78, "computed": 71.1, "yr1_return": "-14.7%", "max_drawdown": "-48.2%", "correct": true},
    {"date": "1987-08", "event": "黑色星期一前夕", "target": 62, "computed": 71.8, "yr1_return": "-12.8%", "max_drawdown": "-33.5%", "correct": true},
    {"date": "1990-06", "event": "海湾战争前夕", "target": 50, "computed": 47.4, "yr1_return": "-3.1%", "max_drawdown": "-19.9%", "correct": true},
    {"date": "1999-12", "event": "互联网泡沫顶点", "target": 82, "computed": 91.1, "yr1_return": "-9.1%", "max_drawdown": "-49.1%", "correct": true},
    {"date": "2007-10", "event": "次贷危机前夕", "target": 75, "computed": 70.9, "yr1_return": "-37.0%", "max_drawdown": "-56.8%", "correct": true},
    {"date": "2011-04", "event": "欧债危机", "target": 48, "computed": 50.0, "yr1_return": "+2.1%", "max_drawdown": "-19.4%", "correct": false},
    {"date": "2015-08", "event": "中国股灾溢出", "target": 52, "computed": 29.5, "yr1_return": "+1.4%", "max_drawdown": "-14.2%", "correct": false},
    {"date": "2020-02", "event": "新冠崩盘前", "target": 55, "computed": 75.8, "yr1_return": "+18.4%", "max_drawdown": "-33.9%", "correct": true},
    {"date": "2021-12", "event": "后疫情泡沫", "target": 72, "computed": 75.9, "yr1_return": "-18.1%", "max_drawdown": "-25.4%", "correct": true},
    {"date": "2026-now", "event": "当前行情 (2026)", "target": 67, "computed": 76.6, "yr1_return": "-", "max_drawdown": "-", "correct": true},
];

const BacktestTable: React.FC = () => {
  return (
    <div className="mt-8 overflow-hidden rounded-lg border border-slate-700 bg-slate-900/50">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-lg font-medium text-slate-100">历史回测验证 (RunRisk Backtest)</h3>
        <p className="text-xs text-slate-400 mt-1">
          验证模型在过去 100 年重大市场波动中的预警表现。RMSE: 11.5
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-300">
            <tr>
              <th className="px-4 py-2 font-medium">时间</th>
              <th className="px-4 py-2 font-medium">事件</th>
              <th className="px-4 py-2 font-medium">目标值</th>
              <th className="px-4 py-2 font-medium">计算值</th>
              <th className="px-4 py-2 font-medium">误差</th>
              <th className="px-4 py-2 font-medium">1年后回报</th>
              <th className="px-4 py-2 font-medium">最大回撤</th>
              <th className="px-4 py-2 font-medium text-center">正确?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {HISTORICAL_BACKTEST.map((row, idx) => {
              const error = row.computed - row.target;
              const isCurrent = row.date === '2026-now';
              
              let scoreColor = "text-slate-300";
              if (row.target > 70) scoreColor = "text-orange-400 font-bold";
              else if (row.target > 50) scoreColor = "text-yellow-400";

              return (
                <tr key={idx} className={`${isCurrent ? 'bg-blue-900/20' : 'hover:bg-slate-800/50'} transition-colors`}>
                  <td className="px-4 py-2 text-slate-400">{row.date}</td>
                  <td className="px-4 py-2 font-medium text-slate-200">{row.event}</td>
                  <td className={`px-4 py-2 ${scoreColor}`}>{row.target}</td>
                  <td className="px-4 py-2 text-slate-200">{row.computed.toFixed(1)}</td>
                  <td className={`px-4 py-2 ${Math.abs(error) > 15 ? 'text-red-400' : 'text-slate-500'}`}>
                    {error > 0 ? '+' : ''}{error.toFixed(1)}
                  </td>
                  <td className={`px-4 py-2 ${row.yr1_return.startsWith('-') ? 'text-red-400' : row.yr1_return === '-' ? 'text-slate-500' : 'text-green-400'}`}>
                    {row.yr1_return}
                  </td>
                  <td className="px-4 py-2 text-red-400/80">{row.max_drawdown}</td>
                  <td className="px-4 py-2 text-center">
                    {row.correct ? (
                      <span className="text-green-500">✅</span>
                    ) : (
                      <span className="text-red-500">❌</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BacktestTable;
