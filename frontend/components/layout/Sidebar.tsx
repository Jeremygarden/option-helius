"use client";

import { LayoutDashboard, BarChart3, TrendingUp, Globe, Star, History, Shuffle, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const navItems = [
  { icon: LayoutDashboard, label: "概览", sub: "Overview", href: "/macro" },
  { icon: BarChart3, label: "期权链", sub: "Chain", href: "/chain" },
  { icon: TrendingUp, label: "情绪", sub: "Sentiment", href: "/sentiment" },
  { icon: Star, label: "精选", sub: "Picks", href: "/picks" },
  { icon: User, label: "个人", sub: "Profile", href: "/profile" },
  { icon: History, label: "回测", sub: "Backtest", href: "#" },
  { icon: Shuffle, label: "交易", sub: "Trade", href: "#" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[70px] flex flex-col items-center py-6 bg-[#0d1117] border-r border-[#30363d] h-screen sticky top-0">
      <div className="mb-8 font-bold text-accent-blue text-xl">H</div>
      <nav className="flex flex-col gap-6 w-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                "group relative flex flex-col items-center justify-center w-full py-2 transition-colors",
                isActive ? "border-l-2 border-[#58a6ff] bg-[#161b22]" : "hover:bg-[#161b22]"
              )}
            >
              <item.icon size={20} className={isActive ? "text-[#58a6ff]" : "text-[#7d8590] group-hover:text-[#e6edf3]"} />
              <span className="text-[10px] mt-1 text-[#7d8590] group-hover:text-[#e6edf3] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
