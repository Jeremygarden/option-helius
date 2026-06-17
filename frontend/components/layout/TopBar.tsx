"use client";

import { Search, Bell, Settings } from "lucide-react";

export default function TopBar() {
  return (
    <header className="h-12 border-b border-[var(--border-default)] flex items-center justify-between px-5 bg-[var(--bg-primary)] sticky top-0 z-10">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
          <input
            type="text"
            placeholder="Search ticker..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md py-1.5 pl-8 pr-3 text-data-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
            defaultValue="NVDA"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded px-1 py-0.5 font-mono">
            /
          </kbd>
        </div>
      </div>

      {/* Market Data Strip */}
      <div className="flex items-center gap-5">
        <div className="flex gap-5 font-mono text-data-sm">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] text-data-xs">NVDA</span>
            <span className="text-[var(--color-bullish)] font-medium">128.50</span>
            <span className="text-[var(--color-bullish)] text-data-xs">+2.4%</span>
          </div>
          <div className="w-px h-4 bg-[var(--border-default)]" />
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] text-data-xs">VIX</span>
            <span className="text-[var(--color-bearish)] font-medium">14.50</span>
            <span className="text-[var(--color-bearish)] text-data-xs">+1.2%</span>
          </div>
          <div className="w-px h-4 bg-[var(--border-default)]" />
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] text-data-xs">SPY</span>
            <span className="text-[var(--color-bullish)] font-medium">545.20</span>
            <span className="text-[var(--color-bullish)] text-data-xs">+0.8%</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-3">
          <button className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
            <Bell size={15} />
          </button>
          <button className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
            <Settings size={15} />
          </button>
          <div className="w-7 h-7 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center ml-1">
            <span className="text-data-xs font-mono font-medium text-[var(--text-secondary)]">JJ</span>
          </div>
        </div>
      </div>
    </header>
  );
}
