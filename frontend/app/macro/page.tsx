export default function MacroPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold">宏观概览 / Macro Dashboard</h1>
        <p className="text-[#7d8590] text-sm">Global market regime & cross-asset correlations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "VIX INDEX", value: "14.50", change: "-2.1%", color: "text-accent-green" },
          { label: "US 10Y YIELD", value: "4.25%", change: "+0.5%", color: "text-accent-red" },
          { label: "DXY INDEX", value: "104.2", change: "+0.1%", color: "text-[#7d8590]" },
          { label: "GOLD", value: "$2350", change: "+1.2%", color: "text-accent-green" },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <span className="text-[10px] text-[#7d8590] uppercase font-bold">{item.label}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono">{item.value}</span>
              <span className={`text-xs font-bold ${item.color}`}>{item.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2 card p-6">
           <h3 className="text-sm font-semibold mb-6">收益率曲线 / Yield Curve (1M - 30Y)</h3>
           <div className="h-64 border-l border-b border-[#30363d] relative">
              <div className="absolute inset-0 flex items-center justify-center text-[#30363d] text-4xl font-bold uppercase rotate-12">
                 Coming Soon
              </div>
           </div>
        </div>
        <div className="card p-6">
           <h3 className="text-sm font-semibold mb-4">当前市场状态 / Market Regime</h3>
           <div className="flex flex-col gap-6 mt-8">
              <div className="flex flex-col items-center">
                 <div className="w-32 h-32 rounded-full border-4 border-accent-teal flex items-center justify-center text-accent-teal font-bold text-center p-4">
                    Low Vol Expansion
                 </div>
                 <span className="mt-4 text-sm font-medium">Risk-On Mode</span>
              </div>
              <div className="space-y-2 mt-4">
                 <div className="flex justify-between text-xs">
                    <span className="text-[#7d8590]">Bullish Prob.</span>
                    <span className="text-accent-green">78%</span>
                 </div>
                 <div className="w-full h-1 bg-[#30363d] rounded-full overflow-hidden">
                    <div className="h-full bg-accent-teal" style={{ width: '78%' }} />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
