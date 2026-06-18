"use client";

const news = [
  { id: 1, ticker: "NVDA", headline: "Q1 Earnings Beat Estimates, Guidance Raised", verdict: "LOAD THE BOAT", confidence: "92%", color: "bg-[#3fb950]" },
  { id: 2, ticker: "AAPL", headline: "Regulatory Headwinds Loom for Tech Sector", verdict: "WAIT", confidence: "75%", color: "bg-[#f0883e]" },
  { id: 3, ticker: "TSLA", headline: "Competitor Launches Rival Product", verdict: "FADE", confidence: "68%", color: "bg-[#f85149]" },
];

export default function SentimentPage() {
  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">舆情情绪
          <span className="text-[#8b949e] text-base font-normal ml-2">Sentiment Analysis</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: News */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-[#7d8590] uppercase tracking-wider">Breaking News & Verdicts</h3>
          {news.map((item) => (
            <div key={item.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex gap-4 items-center transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-1">
                  <span className="text-accent-blue font-bold text-xs font-mono">{item.ticker}</span>
                  <span className="text-[#7d8590] text-[10px]">2h ago</span>
                </div>
                <h4 className="font-medium text-sm">{item.headline}</h4>
              </div>
              <div className="flex flex-col items-end gap-4">
                <div className={`${item.color} text-black text-[10px] font-bold px-2 py-0.5 rounded transition-colors`}>
                  {item.verdict}
                </div>
                <span className="text-[10px] text-[#7d8590] font-mono">Conf: {item.confidence}</span>
              </div>
            </div>
          ))}

          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 mt-4">
             <h3 className="text-sm font-semibold mb-4 text-[#7d8590]">价格影响速度 / Price Impact Velocity</h3>
             <div className="flex flex-col gap-4">
               {[1, 0.8, 0.4, 0.2].map((val, i) => (
                 <div key={i} className="flex items-center gap-4">
                   <span className="text-[10px] font-mono w-12 text-[#7d8590]">T-{i*15}m</span>
                   <div className="flex-1 h-2 bg-[#30363d] rounded-full overflow-hidden">
                     <div className="h-full bg-accent-blue transition-all" style={{ width: `${val * 100}%` }} />
                   </div>
                   <span className="text-[10px] font-mono text-[#7d8590]">{(val * 100).toFixed(0)}%</span>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Right: Patterns & Charts */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-4 text-[#7d8590]">历史模式匹配 / Historical Patterns</h3>
            <div className="flex flex-col gap-4">
               {[
                 { label: "Post-Earnings Drift", match: "88%", outcome: "text-accent-green" },
                 { label: "VIX Spike Reversion", match: "72%", outcome: "text-[#7d8590]" },
                 { label: "Double Bottom Consolidation", match: "91%", outcome: "text-accent-green" }
               ].map((p, i) => (
                 <div key={i} className="flex justify-between items-center border-b border-[#30363d] pb-2 last:border-0">
                    <span className="text-xs font-medium">{p.label}</span>
                    <div className="flex gap-4 items-center">
                       <span className="text-[10px] text-[#7d8590] font-mono">Match: {p.match}</span>
                       <span className={`text-[10px] font-bold uppercase ${p.outcome}`}>BULLISH</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex-1">
            <h3 className="text-sm font-semibold mb-4 text-[#7d8590]">情绪波动 / Sentiment Velocity</h3>
            <div className="h-40 flex items-end gap-4">
               {Array.from({ length: 20 }).map((_, i) => {
                 const height = 20 + Math.random() * 80;
                 return (
                   <div key={i} className="flex-1 bg-[#58a6ff] opacity-50 hover:opacity-100 transition-opacity rounded-t" style={{ height: `${height}%` }} />
                 );
               })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
