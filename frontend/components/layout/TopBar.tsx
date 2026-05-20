"use client";

import { Search, Bell, User } from "lucide-react";

export default function TopBar() {
  return (
    <header className="h-[60px] border-b border-[#30363d] flex items-center justify-between px-6 bg-[#0d1117] sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8590]" size={16} />
          <input
            type="text"
            placeholder="Search Ticker (e.g. NVDA, SPY)..."
            className="w-full bg-[#161b22] border border-[#30363d] rounded-md py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#58a6ff]"
            defaultValue="NVDA"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex gap-4 text-xs font-mono">
          <div className="flex flex-col items-end">
            <span className="text-[#7d8590]">NVDA</span>
            <span className="text-[#3fb950]">$128.50 (+2.4%)</span>
          </div>
          <div className="flex flex-col items-end border-l border-[#30363d] pl-4">
            <span className="text-[#7d8590]">VIX</span>
            <span className="text-[#f85149]">14.50 (+1.2%)</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Bell size={18} className="text-[#7d8590] hover:text-[#e6edf3] cursor-pointer" />
          <div className="w-8 h-8 rounded-full bg-[#30363d] flex items-center justify-center">
            <User size={16} />
          </div>
        </div>
      </div>
    </header>
  );
}
