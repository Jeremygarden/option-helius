"use client";

const kpis = [
  { label: "预期波动 / Expected Move", value: "±$18.50 (3.2%)", color: "text-[#58a6ff]" },
  { label: "最大痛点 / Max Pain", value: "$565.00", color: "text-[#f0883e]" },
  { label: "PCR (Volume)", value: "0.87", color: "text-[#3fb950]" },
  { label: "PCR (OI)", value: "1.12", color: "text-[#3fb950]" },
  { label: "净 GAMMA / Net GEX", value: "-$2.4B", color: "text-[#f85149]" },
];

export default function KPIBar() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="card p-4 flex flex-col gap-1">
          <span className="text-[10px] text-[#7d8590] uppercase font-bold">{kpi.label}</span>
          <span className={`text-lg font-mono font-bold ${kpi.color}`}>{kpi.value}</span>
        </div>
      ))}
    </div>
  );
}
