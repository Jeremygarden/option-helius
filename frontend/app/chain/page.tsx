import KPIBar from "@/components/chain/KPIBar";
import IVSurface3D from "@/components/chain/IVSurface3D";
import TermStructure from "@/components/chain/TermStructure";
import OIVolChart from "@/components/chain/OIVolChart";
import GEXChart from "@/components/chain/GEXChart";

export default function ChainPage() {
  return (
    <div className="flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NVDA 期权终端 / Options Terminal</h1>
          <p className="text-[#7d8590] text-sm">Real-time derivatives analysis & liquidity flow</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-sm outline-none focus:border-[#58a6ff]">
            <option>2024-06-21 (Weekly)</option>
            <option>2024-06-28 (Weekly)</option>
            <option>2024-07-19 (Monthly)</option>
          </select>
        </div>
      </div>

      <KPIBar />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IVSurface3D />
        <TermStructure />
        <OIVolChart />
        <GEXChart />
      </div>
    </div>
  );
}
