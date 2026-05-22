import { useState, useEffect } from 'react';

export interface WatchlistItem {
  ticker: string;
  name: string;
  added_at: string;
  notes?: string;
}

export interface PositionLeg {
  type: 'call' | 'put';
  action: 'buy' | 'sell';
  strike: number;
  expiry: string; // YYYY-MM-DD
  quantity: number;
  premium: number; // per share
  current_price?: number; // auto-calculated from mock
}

export interface Position {
  id: string;
  ticker: string;
  strategy: string; // "sell_put", "iron_condor", etc.
  strategy_cn: string;
  legs: PositionLeg[];
  opened_at: string;
  notes?: string;
  source: 'manual' | 'ibkr_import';
}

export interface AlertThreshold {
  indicator_id: string;
  indicator_name: string;
  current_value: number;
  default_red: number; // default threshold for red
  default_orange: number; // default threshold for orange
  user_red?: number; // user override
  user_orange?: number; // user override
  unit: string; // "x", "%", "bps", "index", etc.
  direction: 'above' | 'below'; // "above" = red when value > threshold
}

export interface NotificationSettings {
  discord_webhook?: string;
  discord_user_id?: string; // for DM (1073496464485003355)
  weekly_picks_enabled: boolean;
  weekly_picks_day: 'monday' | 'sunday';
  weekly_picks_time: string; // "09:00"
  macro_alert_enabled: boolean;
  macro_alert_on_red: boolean; // alert when any indicator turns red
  macro_alert_composite: number; // alert when composite score crosses threshold (e.g. >70)
  unusual_activity_enabled: boolean;
  unusual_activity_tickers: string[]; // subset of watchlist
}

export interface UserPrefs {
  watchlist: WatchlistItem[];
  positions: Position[];
  alert_thresholds: Record<string, Partial<AlertThreshold>>;
  notifications: NotificationSettings;
}

const DEFAULT_PREFS: UserPrefs = {
  watchlist: [
    { ticker: 'SPY', name: 'S&P 500 ETF Trust', added_at: new Date().toISOString() },
    { ticker: 'QQQ', name: 'Invesco QQQ Trust', added_at: new Date().toISOString() },
    { ticker: 'NVDA', name: 'NVIDIA Corp', added_at: new Date().toISOString() },
    { ticker: 'AAPL', name: 'Apple Inc.', added_at: new Date().toISOString() },
    { ticker: 'TSLA', name: 'Tesla, Inc.', added_at: new Date().toISOString() },
  ],
  positions: [],
  alert_thresholds: {
    CAPE: { user_orange: 25, user_red: 30 },
    AIAE: { user_orange: 0.40, user_red: 0.46 },
    M7: { user_orange: 22, user_red: 28 },
    VIX: { user_orange: 15, user_red: 12 },
    'Yield Curve': { user_orange: 50, user_red: 0 },
    'PE Gap': { user_orange: 20, user_red: 28 },
    Trend: { user_orange: 15, user_red: 20 },
    ERP: { user_orange: 0.01, user_red: -0.03 },
  },
  notifications: {
    discord_user_id: '1073496464485003355',
    weekly_picks_enabled: false,
    weekly_picks_day: 'monday',
    weekly_picks_time: '09:00',
    macro_alert_enabled: false,
    macro_alert_on_red: false,
    macro_alert_composite: 70,
    unusual_activity_enabled: false,
    unusual_activity_tickers: [],
  },
};

export function useUserPrefs() {
  const [prefs, setPrefs] = useState<UserPrefs>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    const stored = localStorage.getItem('options_helius_user_prefs');
    try {
      return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
    } catch (e) {
      console.error('Failed to parse user prefs from localStorage', e);
      return DEFAULT_PREFS;
    }
  });

  const updatePrefs = (updates: Partial<UserPrefs>) => {
    const newPrefs = { ...prefs, ...updates };
    setPrefs(newPrefs);
    localStorage.setItem('options_helius_user_prefs', JSON.stringify(newPrefs));
  };

  const updateAlertThreshold = (indicatorId: string, updates: Partial<AlertThreshold>) => {
    const newAlertThresholds = {
      ...prefs.alert_thresholds,
      [indicatorId]: {
        ...prefs.alert_thresholds[indicatorId],
        ...updates,
      },
    };
    updatePrefs({ alert_thresholds: newAlertThresholds });
  };

  const updateNotificationSettings = (updates: Partial<NotificationSettings>) => {
    updatePrefs({
      notifications: {
        ...prefs.notifications,
        ...updates,
      },
    });
  };

  return { prefs, updatePrefs, updateAlertThreshold, updateNotificationSettings };
}
