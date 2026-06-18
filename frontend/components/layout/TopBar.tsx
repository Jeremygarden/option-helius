"use client";

import { Search, Bell, Settings, TrendingUp, TrendingDown } from "lucide-react";
import { usePathname } from "next/navigation";

const PAGE_META: Record<string, { cn: string; en: string }> = {
  "/macro":     { cn: "市场概览",   en: "Market Overview"  },
  "/chain":     { cn: "期权链",     en: "Options Chain"    },
  "/sentiment": { cn: "市场情绪",   en: "Market Sentiment" },
  "/picks":     { cn: "精选策略",   en: "Weekly Picks"     },
  "/profile":   { cn: "个人设置",   en: "Profile"          },
  "/":          { cn: "仪表盘",     en: "Dashboard"        },
};

const TICKERS = [
  { sym: "NVDA", price: "128.50", chg: "+2.4%", up: true  },
  { sym: "VIX",  price: "14.50",  chg: "+1.2%", up: false },
  { sym: "SPY",  price: "545.20", chg: "+0.8%", up: true  },
];

export default function TopBar() {
  const pathname = usePathname();
  const meta = PAGE_META[pathname] ?? { cn: "终端", en: "Terminal" };

  return (
    <header
      className="h-14 border-b border-[var(--border-default)] flex items-center justify-between gap-4 px-6 sticky top-0 z-20"
      style={{ background: "var(--bg-base)" }}
    >
      {/* ── Left: page title ── */}
      <div className="flex items-baseline gap-4 shrink-0">
        <h1 className="text-xl font-bold leading-none tracking-tight" style={{ color: "var(--text-primary)" }}>
          {meta.cn}
        </h1>
        <span className="text-[13px] font-normal" style={{ color: "var(--text-muted)" }}>
          {meta.en}
        </span>
      </div>

      {/* ── Right cluster ── */}
      <div className="flex items-center gap-4 ml-auto">

        {/* Ticker strip */}
        <div
          className="hidden md:flex items-center gap-4 rounded-lg px-3 py-1.5 border border-[var(--accent-blue)]"
          style={{ background: "var(--bg-surface)" }}
        >
          {TICKERS.map((t, i) => (
            <div key={t.sym} className="flex items-center gap-4.5">
              {i > 0 && <div className="w-px h-3.5 bg-[var(--accent-blue)]" />}
              <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                {t.sym}
              </span>
              <span
                className="text-[12px] font-mono font-semibold"
                style={{ color: t.up ? "var(--accent-green)" : "var(--accent-red)" }}
              >
                {t.price}
              </span>
              <span
                className="flex items-center gap-0.5 text-[10px] font-mono"
                style={{ color: t.up ? "var(--accent-green)" : "var(--accent-red)" }}
              >
                {t.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {t.chg}
              </span>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="搜索标的..."
            defaultValue="NVDA"
            className="w-36 rounded-lg py-1.5 pl-8 pr-3 text-[12px] font-mono border border-[var(--border-default)] transition-all focus:outline-none focus:border-[var(--accent-blue)] focus:w-48"
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Action icon buttons */}
        <div className="flex items-center gap-4">
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
            }}
            aria-label="通知"
          >
            <Bell size={16} />
          </button>
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
            }}
            aria-label="设置"
          >
            <Settings size={16} />
          </button>

          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold ml-1 border border-[var(--border-default)] cursor-pointer"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
          >
            JJ
          </div>
        </div>
      </div>
    </header>
  );
}
