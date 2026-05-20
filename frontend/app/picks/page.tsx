"use client";

import { Star } from "lucide-react";

const picks = [
  { ticker: "NVDA", strategy: "Sell Cash-Secured Put", score: 9, type: "core", border: "border-l-[#3fb950]", entry: "Strike $105, Limit $2.50", target: "Price > $120", stop: "$98", risk: "$10,500", return: "15% ann.", cycle: "45 Days", basis: "Support at 100MA + RSI Oversold", margin: "$2,500" },
  { ticker: "SPY", strategy: "Iron Condor", score: 8, type: "conservative", border: "border-l-[#f0883e]", entry: "540/545/580/585", target: "Full credit", stop: "2x credit", risk: "$400", return: "8% monthly", cycle: "14 Days", basis: "Low VIX environment, range bound", margin: "$500" },
  { ticker: "TSLA", strategy: "Bull Put Spread", score: 7, type: "aggressive", border: "border-l-[#58a6ff]", entry: "170/175", target: "50% Max Profit", stop: "$165", risk: "$350", return: "25%", cycle: "21 Days", basis: "Delivery numbers anticipation", margin: "$500" },
];

export default function PicksPage() {
  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">每周精选 / Weekly Alpha Picks</h1>
        <p className="text-[#7d8590] text-sm">Quantitative strategy alerts based on GEX & IV Rank</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {picks.map((pick, i) => (
          <div key={i} className={`card border-l-4 ${pick.border} p-5 flex flex-col gap-4`}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-[#e6edf3]">{pick.ticker}</h2>
                <span className="text-xs text-[#7d8590] uppercase">{pick.strategy}</span>
              </div>
              <div className="bg-[#30363d] px-2 py-1 rounded text-xs font-bold text-accent-teal">
                SCORE: {pick.score}/10
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
              <div className="flex flex-col">
                <span className="text-[#7d8590]">入场条件 / Entry</span>
                <span className="font-medium">{pick.entry}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#7d8590]">目标预期 / Target</span>
                <span className="font-medium">{pick.target}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#7d8590]">止损位 / Stop Loss</span>
                <span className="font-medium">{pick.stop}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#7d8590]">持有周期 / Cycle</span>
                <span className="font-medium">{pick.cycle}</span>
              </div>
            </div>

            <div className="border-t border-[#30363d] pt-4 mt-2">
              <div className="mb-2">
                <span className="text-[10px] text-[#7d8590] uppercase font-bold block mb-1">异动依据 / Thesis</span>
                <p className="text-xs leading-relaxed">{pick.basis}</p>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-[#f85149]">Risk: {pick.risk}</span>
                <span className="text-[#3fb950]">Return: {pick.return}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
