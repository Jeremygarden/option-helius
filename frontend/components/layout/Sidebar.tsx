"use client";

import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Star,
  History,
  Shuffle,
  User,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const mainNavItems = [
  { icon: LayoutDashboard, label: "概览", sub: "Overview", href: "/macro" },
  { icon: BarChart3,       label: "期权链", sub: "Chain",    href: "/chain" },
  { icon: TrendingUp,      label: "情绪",   sub: "Sentiment", href: "/sentiment" },
  { icon: Star,            label: "精选",   sub: "Picks",    href: "/picks" },
];

const toolsNavItems = [
  { icon: History, label: "回测", sub: "Backtest", href: "#" },
  { icon: Shuffle, label: "交易", sub: "Trade",    href: "#" },
  { icon: User,    label: "个人", sub: "Profile",  href: "/profile" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const NavItem = ({
    icon: Icon,
    label,
    sub,
    href,
  }: {
    icon: React.ElementType;
    label: string;
    sub: string;
    href: string;
  }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={clsx(
          "flex items-center gap-4 px-4 py-2.5 rounded-lg mx-2 transition-all duration-150 group",
          isActive
            ? "bg-[var(--accent-blue)] text-white"
            : "text-[var(--accent-blue)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-elevated)]"
        )}
      >
        <Icon
          size={20}
          strokeWidth={isActive ? 2 : 1.5}
          className="shrink-0"
        />
        <div className="flex flex-col min-w-0 leading-none">
          <span className="text-[13px] font-semibold leading-tight">{label}</span>
          <span
            className={clsx(
              "text-[11px] leading-tight mt-0.5",
              isActive ? "text-blue-200" : "text-[var(--accent-blue)] group-hover:text-[var(--accent-blue)]"
            )}
          >
            {sub}
          </span>
        </div>
        {isActive && (
          <ChevronRight size={14} className="ml-auto shrink-0 opacity-60" />
        )}
      </Link>
    );
  };

  return (
    <aside
      className="w-[220px] flex flex-col shrink-0 h-screen sticky top-0 border-r border-[var(--border-default)]"
      style={{ background: "var(--bg-base)" }}
    >
      {/* ─── Logo ─── */}
      <div className="flex items-center gap-4 px-5 py-5 border-b border-[var(--accent-blue)]">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-[15px]"
          style={{
            background: "linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue) 100%)",
            boxShadow: "0 0 16px rgba(88,166,255,0.35)",
            color: "var(--accent-blue)",
          }}
        >
          H
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[14px] font-bold text-[var(--accent-blue)] tracking-tight">Helius</span>
          <span className="text-[11px] text-[var(--accent-blue)] mt-0.5">Options Terminal</span>
        </div>
      </div>

      {/* ─── Main nav ─── */}
      <nav className="flex flex-col gap-0.5 pt-3 pb-2">
        <span className="px-5 pb-1.5 text-[10px] uppercase tracking-widest text-[var(--accent-blue)] font-semibold">
          主菜单
        </span>
        {mainNavItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* ─── Divider ─── */}
      <div className="mx-4 border-t border-[var(--accent-blue)]" />

      {/* ─── Tools nav ─── */}
      <nav className="flex flex-col gap-0.5 pt-3 pb-2">
        <span className="px-5 pb-1.5 text-[10px] uppercase tracking-widest text-[var(--accent-blue)] font-semibold">
          工具
        </span>
        {toolsNavItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* ─── Spacer ─── */}
      <div className="flex-1" />

      {/* ─── Status footer ─── */}
      <div className="px-5 py-4 border-t border-[var(--accent-blue)]">
        <div className="flex items-center gap-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] animate-pulse" />
          <span className="text-[11px] text-[var(--accent-blue)]">Market Open</span>
        </div>
        <div className="mt-1 text-[10px] font-mono text-[var(--accent-blue)]">
          {new Date().toLocaleDateString("zh-CN", { weekday: "short", month: "short", day: "numeric" })}
        </div>
      </div>
    </aside>
  );
}
