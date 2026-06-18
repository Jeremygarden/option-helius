'use client';

import React, { useState } from 'react';
import { useUserPrefs, WatchlistItem, Position, PositionLeg, AlertThreshold } from '@/hooks/useUserPrefs';
import { 
  User, 
  Settings, 
  Bell, 
  Plus, 
  X, 
  Trash2, 
  Save, 
  RefreshCw, 
  ExternalLink,
  Search,
  ChevronDown,
  LayoutGrid,
  Zap,
  Briefcase
} from 'lucide-react';

const TABS = [
  { id: 'watchlist', label: '自选股', icon: Search },
  { id: 'positions', label: '个人持仓', icon: Briefcase },
  { id: 'thresholds', label: '预警设置', icon: Zap },
  { id: 'notifications', label: '推送提醒', icon: Bell },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('watchlist');
  const { prefs, updatePrefs, updateAlertThreshold, updateNotificationSettings } = useUserPrefs();
  const [isSaving, setIsSaving] = useState(false);

  const saveAll = async () => {
    setIsSaving(true);
    // Simulate API call for backend sync if needed
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] text-[var(--accent-blue)] p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-4">
            <User className="text-[var(--accent-blue)]" size={32} />
            个人中心
          </h1>
          <p className="text-[var(--accent-blue)] mt-2">管理您的自选标的、持仓数据以及预警推送偏好</p>
        </div>
        <button 
          onClick={saveAll}
          disabled={isSaving}
          className="flex items-center gap-4 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)] text-white px-6 py-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          保存所有设置
        </button>
      </div>

      <div className="flex border-b border-[var(--border-default)] mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-4 px-6 py-4 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none border-b-2 ${
              activeTab === tab.id 
                ? 'border-[var(--accent-blue)] text-white' 
                : 'border-transparent text-[var(--accent-blue)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue)]'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {activeTab === 'watchlist' && <WatchlistTab prefs={prefs} updatePrefs={updatePrefs} />}
        {activeTab === 'positions' && <PositionsTab prefs={prefs} updatePrefs={updatePrefs} />}
        {activeTab === 'thresholds' && <ThresholdsTab prefs={prefs} updateAlertThreshold={updateAlertThreshold} />}
        {activeTab === 'notifications' && <NotificationsTab prefs={prefs} updateNotificationSettings={updateNotificationSettings} />}
      </div>
    </div>
  );
}

// --- TAB 1: Watchlist ---
function WatchlistTab({ prefs, updatePrefs }: { prefs: any, updatePrefs: any }) {
  const [newTicker, setNewTicker] = useState('');

  const addTicker = () => {
    const ticker = newTicker.toUpperCase().trim();
    if (!ticker || prefs.watchlist.some((item: any) => item.ticker === ticker)) return;
    if (prefs.watchlist.length >= 20) {
      alert('自选股上限为20个');
      return;
    }
    
    const newItem: WatchlistItem = {
      ticker,
      name: ticker, // In real app, fetch name
      added_at: new Date().toISOString(),
    };
    
    updatePrefs({ watchlist: [newItem, ...prefs.watchlist] });
    setNewTicker('');
  };

  const removeTicker = (ticker: string) => {
    updatePrefs({ watchlist: prefs.watchlist.filter((item: any) => item.ticker !== ticker) });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-4">
          <Plus size={20} className="text-[var(--accent-blue)]" />
          添加标的
        </h3>
        <div className="flex gap-4">
          <input 
            type="text" 
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTicker()}
            placeholder="输入代码 (如: NVDA)"
            className="flex-1 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-4 py-2 focus:border-[var(--accent-blue)] outline-none text-white"
          />
          <button 
            onClick={addTicker}
            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)] border border-[var(--border-default)] text-[var(--accent-blue)] px-4 py-2 rounded-lg font-medium"
          >
            添加
          </button>
        </div>
        <p className="text-xs text-[var(--accent-blue)] mt-4 italic">
          * 最多添加 20 个标的。这些标的将出现在您的仪表盘和策略推荐中。
        </p>
      </div>

      <div className="lg:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prefs.watchlist.map((item: WatchlistItem) => (
            <div key={item.ticker} className="group relative bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--accent-blue)] rounded-lg p-4 transition-all">
              <button 
                onClick={() => removeTicker(item.ticker)}
                className="absolute top-4 right-4 text-[var(--accent-blue)] hover:text-[var(--accent-blue)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={18} />
              </button>
              
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-xl font-bold text-white">{item.ticker}</h4>
                  <span className="text-xs text-[var(--accent-blue)]">{item.name}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-[var(--accent-blue)]">IV Rank:</span>
                  <span className="text-[var(--accent-blue)] font-semibold">78 🔥</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[var(--accent-blue)]">Trend:</span>
                  <span className="text-[var(--accent-blue)] font-semibold">▲ +8.2%</span>
                </div>
              </div>
              
              <div className="bg-[var(--bg-base)] rounded p-4 text-xs flex justify-between items-center">
                <span className="text-[var(--accent-blue)]">策略推荐: <span className="text-[var(--accent-blue)]">铁鹰 (87分)</span></span>
                <ExternalLink size={14} className="text-[var(--accent-blue)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- TAB 2: Positions ---
function PositionsTab({ prefs, updatePrefs }: { prefs: any, updatePrefs: any }) {
  const [showForm, setShowForm] = useState(false);
  const [newPos, setNewPos] = useState<Partial<Position>>({
    ticker: '',
    strategy: 'sell_put',
    legs: [{ type: 'put', action: 'sell', strike: 0, expiry: '', quantity: 1, premium: 0 }],
    source: 'manual'
  });

  const savePosition = () => {
    if (!newPos.ticker) return;
    const position: Position = {
      id: Math.random().toString(36).substr(2, 9),
      ticker: newPos.ticker.toUpperCase(),
      strategy: newPos.strategy || 'sell_put',
      strategy_cn: '卖出看跌期权', // In real app, map this
      legs: newPos.legs as PositionLeg[],
      opened_at: new Date().toISOString(),
      source: 'manual',
      ...newPos
    };
    updatePrefs({ positions: [...prefs.positions, position] });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">当前持仓</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-4"
        >
          <Plus size={18} />
          添加持仓
        </button>
      </div>

      {showForm && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-medium text-white">添加手动持仓</h4>
            <button onClick={() => setShowForm(false)} className="text-[var(--accent-blue)] hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none hover:opacity-80 active:scale-95">
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[var(--accent-blue)] mb-2">标的资产</label>
              <input 
                type="text" 
                placeholder="NVDA"
                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-4 py-2 focus:border-[var(--accent-blue)] outline-none text-white"
                onChange={(e) => setNewPos({...newPos, ticker: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--accent-blue)] mb-2">交易策略</label>
              <select className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-4 py-2 focus:border-[var(--accent-blue)] outline-none text-white">
                <option value="sell_put">Sell Put (卖出看跌)</option>
                <option value="iron_condor">Iron Condor (铁鹰)</option>
                <option value="bull_put">Bull Put Spread (牛市看跌价差)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h5 className="text-sm font-medium text-[var(--accent-blue)] border-b border-[var(--border-default)] pb-2">腿部明细 (Legs)</h5>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <select className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-2 text-sm text-white">
                <option>Put</option>
                <option>Call</option>
              </select>
              <select className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-2 text-sm text-white">
                <option>Sell</option>
                <option>Buy</option>
              </select>
              <input type="number" placeholder="行权价" className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-2 text-sm text-white" />
              <input type="date" className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-2 text-sm text-white" />
              <input type="number" placeholder="数量" className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-2 text-sm text-white" />
              <input type="number" placeholder="权利金" className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-2 text-sm text-white" />
            </div>
            <button className="text-[var(--accent-blue)] hover:underline text-sm flex items-center gap-4 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none hover:opacity-80 active:scale-95">
              <Plus size={14} /> 添加另一腿
            </button>
          </div>

          <div className="flex justify-end gap-4">
            <button onClick={() => setShowForm(false)} className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)] border border-[var(--border-default)] text-[var(--accent-blue)] px-6 py-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none hover:opacity-80 active:scale-95">
              取消
            </button>
            <button onClick={savePosition} className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)] text-white px-6 py-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none hover:opacity-80 active:scale-95">
              保存持仓
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {prefs.positions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-[var(--border-default)] rounded-lg">
            <p className="text-[var(--accent-blue)]">暂无持仓数据。手动添加或配置 IBKR 导入。</p>
          </div>
        ) : (
          prefs.positions.map((pos: Position) => (
            <div key={pos.id} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4">
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <div className="flex items-center gap-4">
                     <span className="text-2xl font-bold text-white">{pos.ticker}</span>
                     <span className="bg-[var(--accent-blue)] text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold">{pos.strategy.replace('_', ' ')}</span>
                   </div>
                   <p className="text-sm text-[var(--accent-blue)] mt-1">已持有: 12天</p>
                 </div>
                 <div className="flex gap-4">
                   <button className="p-4 text-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none hover:opacity-80 active:scale-95"><LayoutGrid size={18} /></button>
                   <button className="p-4 text-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none hover:opacity-80 active:scale-95"><Trash2 size={18} /></button>
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[var(--border-default)] pt-4">
                 <div className="space-y-4">
                   {pos.legs.map((leg, idx) => (
                     <p key={idx} className="text-sm text-[var(--accent-blue)]">
                       {leg.action.toUpperCase()} {leg.quantity} {pos.ticker} {leg.expiry} {leg.strike}{leg.type.toUpperCase()} @ ${leg.premium}
                     </p>
                   ))}
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--accent-blue)]">未实现盈亏</p>
                      <p className="text-lg font-bold text-[var(--accent-blue)]">+$430 (+34.4%)</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--accent-blue)]">Delta / Theta</p>
                      <p className="text-lg font-bold text-white">-0.22 / +$18</p>
                    </div>
                 </div>
               </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-[var(--bg-base)] border border-[var(--border-default)] border-dashed rounded-lg p-8 text-center opacity-70">
        <h4 className="text-white font-semibold flex items-center justify-center gap-4 mb-2">
          🔌 连接 IBKR 导入真实持仓
        </h4>
        <p className="text-sm text-[var(--accent-blue)] mb-6">Phase 2 功能 — 需要配置 IBKR Gateway (即将在之后更新中开放)</p>
        <button disabled className="bg-[var(--accent-blue)] text-[var(--accent-blue)] border border-[var(--border-default)] px-6 py-2 rounded-lg font-medium cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none hover:opacity-80 active:scale-95">
          配置 IBKR (即将开放)
        </button>
      </div>
    </div>
  );
}

// --- TAB 3: Thresholds ---
const INDICATORS = [
  { id: 'CAPE', name: 'CAPE 估值 (Shiller P/E)', unit: 'x', direction: 'above', default_orange: 25, default_red: 30, min: 10, max: 45 },
  { id: 'AIAE', name: 'AIAE 恐惧贪婪指标', unit: '', direction: 'above', default_orange: 0.40, default_red: 0.46, min: 0.3, max: 0.6 },
  { id: 'M7', name: 'M7 集中度 (Mag 7 Weight)', unit: '%', direction: 'above', default_orange: 22, default_red: 28, min: 15, max: 35 },
  { id: 'VIX', name: 'VIX 波动率 (Complacency)', unit: '', direction: 'below', default_orange: 15, default_red: 12, min: 10, max: 30 },
  { id: 'Yield Curve', name: '利差 (Yield Curve 10Y-2Y)', unit: 'bps', direction: 'below', default_orange: 50, default_red: 0, min: -50, max: 150 },
  { id: 'PE Gap', name: 'PE Gap (ERP Proxy)', unit: '%', direction: 'above', default_orange: 20, default_red: 28, min: 10, max: 40 },
  { id: 'Trend', name: '趋势乖离 (Overbought)', unit: '%', direction: 'above', default_orange: 15, default_red: 20, min: 0, max: 30 },
  { id: 'ERP', name: '股权风险溢价 (ERP)', unit: '', direction: 'below', default_orange: 0.01, default_red: -0.03, min: -0.05, max: 0.05 },
];

function ThresholdsTab({ prefs, updateAlertThreshold }: { prefs: any, updateAlertThreshold: any }) {
  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4 mb-6">
        <p className="text-[var(--accent-blue)] text-sm leading-relaxed">
          您可以根据您的风险偏好自定义 8 个宏观指标的警报阈值。
          当指标数值达到橙色或红色阈值时，系统将在仪表盘中显示警告，并根据您的推送设置发送提醒。
        </p>
      </div>

      <div className="space-y-4">
        {INDICATORS.map((ind) => {
          const userVals = prefs.alert_thresholds[ind.id] || {};
          const orange = userVals.user_orange ?? ind.default_orange;
          const red = userVals.user_red ?? ind.default_red;

          return (
            <div key={ind.id} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-white font-medium">{ind.name}</h4>
                <div className="text-xs text-[var(--accent-blue)]">
                  当前状态: <span className="text-[var(--accent-blue)]">正常</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-42">
                <div className="space-y-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-[var(--accent-blue)]">橙色触发: {orange}{ind.unit}</span>
                    <button 
                      onClick={() => updateAlertThreshold(ind.id, { user_orange: ind.default_orange })}
                      className="text-[var(--accent-blue)] hover:underline"
                    >恢复默认</button>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min={ind.min} 
                      max={ind.max} 
                      step={ind.unit === 'bps' ? 1 : (ind.unit === '' ? 0.01 : 0.5)}
                      value={orange}
                      onChange={(e) => updateAlertThreshold(ind.id, { user_orange: parseFloat(e.target.value) })}
                      className="flex-1 accent-[var(--accent-blue)]"
                    />
                    <input 
                      type="number" 
                      value={orange}
                      onChange={(e) => updateAlertThreshold(ind.id, { user_orange: parseFloat(e.target.value) })}
                      className="w-20 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-[var(--accent-blue)]">红色触发: {red}{ind.unit}</span>
                    <button 
                      onClick={() => updateAlertThreshold(ind.id, { user_red: ind.default_red })}
                      className="text-[var(--accent-blue)] hover:underline"
                    >恢复默认</button>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min={ind.min} 
                      max={ind.max} 
                      step={ind.unit === 'bps' ? 1 : (ind.unit === '' ? 0.01 : 0.5)}
                      value={red}
                      onChange={(e) => updateAlertThreshold(ind.id, { user_red: parseFloat(e.target.value) })}
                      className="flex-1 accent-[var(--accent-blue)]"
                    />
                    <input 
                      type="number" 
                      value={red}
                      onChange={(e) => updateAlertThreshold(ind.id, { user_red: parseFloat(e.target.value) })}
                      className="w-20 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- TAB 4: Notifications ---
function NotificationsTab({ prefs, updateNotificationSettings }: { prefs: any, updateNotificationSettings: any }) {
  const [testing, setTesting] = useState(false);

  const testPush = async () => {
    if (!prefs.notifications.discord_webhook) return;
    setTesting(true);
    try {
      await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          webhook_url: prefs.notifications.discord_webhook,
          discord_user_id: prefs.notifications.discord_user_id
        })
      });
      alert('测试消息已发送！');
    } catch (e) {
      alert('发送失败');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      {/* Discord Section */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-4 mb-6">
          <Bell size={20} className="text-[var(--accent-blue)]" />
          Discord 推送设置
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--accent-blue)] mb-2">Discord User ID</label>
            <input 
              type="text" 
              value={prefs.notifications.discord_user_id}
              onChange={(e) => updateNotificationSettings({ discord_user_id: e.target.value })}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-4 py-2 focus:border-[var(--accent-blue)] outline-none text-white"
              placeholder="1073496464485003355"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--accent-blue)] mb-2">Webhook URL</label>
            <input 
              type="text" 
              value={prefs.notifications.discord_webhook || ''}
              onChange={(e) => updateNotificationSettings({ discord_webhook: e.target.value })}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-4 py-2 focus:border-[var(--accent-blue)] outline-none text-white"
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>
          <button 
            onClick={testPush}
            disabled={!prefs.notifications.discord_webhook || testing}
            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)] border border-[var(--border-default)] text-[var(--accent-blue)] px-6 py-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none disabled:opacity-50"
          >
            {testing ? '发送中...' : '测试推送'}
          </button>
        </div>
      </section>

      {/* Weekly Picks Section */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">每周精选推送</h3>
          <input 
            type="checkbox" 
            checked={prefs.notifications.weekly_picks_enabled}
            onChange={(e) => updateNotificationSettings({ weekly_picks_enabled: e.target.checked })}
            className="w-10 h-5 accent-[var(--accent-blue)]"
          />
        </div>
        
        <div className={`space-y-4 transition-opacity ${prefs.notifications.weekly_picks_enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--accent-blue)] mb-2">推送时间</label>
              <div className="flex gap-4">
                <select 
                  className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-white flex-1"
                  value={prefs.notifications.weekly_picks_day}
                  onChange={(e) => updateNotificationSettings({ weekly_picks_day: e.target.value as any })}
                >
                  <option value="monday">周一</option>
                  <option value="sunday">周日</option>
                </select>
                <input 
                  type="time" 
                  value={prefs.notifications.weekly_picks_time}
                  onChange={(e) => updateNotificationSettings({ weekly_picks_time: e.target.value })}
                  className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-base)] rounded p-4 border border-[var(--border-default)]">
            <p className="text-xs text-[var(--accent-blue)] font-mono">内容预览:</p>
            <p className="text-sm mt-2">✅ 本周期权策略推荐 (Top 3)</p>
            <p className="text-sm">✅ 宏观希腊字母快照</p>
            <p className="text-sm">✅ 关键风险区间提醒</p>
          </div>
        </div>
      </section>

      {/* Macro Alerts Section */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-6">宏观预警推送</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-4 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={prefs.notifications.macro_alert_enabled}
              onChange={(e) => updateNotificationSettings({ macro_alert_enabled: e.target.checked })}
              className="accent-[var(--accent-blue)]"
            />
            <span className="text-sm text-[var(--accent-blue)] group-hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none">
              当综合风险指数高于 <input 
                type="number" 
                value={prefs.notifications.macro_alert_composite}
                onChange={(e) => updateNotificationSettings({ macro_alert_composite: parseInt(e.target.value) })}
                className="w-12 bg-transparent border-b border-[var(--border-default)] text-center"
              /> 时推送警报
            </span>
          </label>
          
          <label className="flex items-center gap-4 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={prefs.notifications.macro_alert_on_red}
              onChange={(e) => updateNotificationSettings({ macro_alert_on_red: e.target.checked })}
              className="accent-[var(--accent-blue)]"
            />
            <span className="text-sm text-[var(--accent-blue)] group-hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none">
              当任何指标进入红色区域时立即推送
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}
