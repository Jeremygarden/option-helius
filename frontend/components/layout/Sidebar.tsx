"use client";

import { LayoutDashboard, BarChart3, TrendingUp, Globe, Star, History, Shuffle, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const navItems = [
  { icon: LayoutDashboard, label: "概览", href: "/macro" },
  { icon: BarChart3, label: "期权链", href: "/chain" },
  { icon: TrendingUp, label: "情绪", href: "/sentiment" },
  { icon: Star, label: "精选", href: "/picks" },
  { icon: User, label: "个人", href: "/profile" },
  { icon: History, label: "回测", href: "#" },
  { icon: Shuffle, label: "交易", href: "#" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[64px] flex flex-col items-center py-4 bg-[var(--bg-primary)] border-r border-[var(--border-default)] h-screen sticky top-0">
      {/* Logo */}
      <div className="mb-6 w-9 h-9 rounded-lg bg-[var(--accent-blue)] flex items-center justify-center">
        <span className="font-mono font-bold text-sm text-[var(--bg-primary)]">H</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 w-full px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={clsx(
                "group relative flex flex-col items-center justify-center rounded-md py-2.5 transition-all duration-150",
                isActive
                  ? "bg-[var(--bg-secondary)] text-[var(--accent-blue)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-sm bg-[var(--accent-blue)]" />
              )}
              <item.icon
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span className="text-[9px] mt-1 font-medium leading-none tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
