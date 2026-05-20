"use client";

import dynamic from 'next/dynamic';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function IVSurface3D() {
  // Mock data for Plotly
  const x = Array.from({ length: 21 }, (_, i) => 100 + i * 5); // strikes
  const y = [7, 14, 30, 60, 90, 120, 150, 180]; // dte
  
  const z = y.map(d => x.map(s => {
    const atmDist = Math.abs(s - 150) / 150;
    return (0.2 + atmDist * 0.5) * (1 + 1/Math.sqrt(d));
  }));

  return (
    <div className="card h-full p-4 overflow-hidden">
      <h3 className="text-sm font-semibold mb-2">3D IV 波动率曲面 / IV Surface</h3>
      <div className="h-[300px] w-full">
        {/* @ts-ignore */}
        <Plot
          data={[
            {
              type: 'surface',
              x: x,
              y: y,
              z: z,
              colorscale: 'Viridis',
              showscale: false,
            }
          ]}
          layout={{
            autosize: true,
            margin: { l: 0, r: 0, b: 0, t: 0 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            scene: {
              xaxis: { title: 'Strike', gridcolor: '#30363d', color: '#7d8590' },
              yaxis: { title: 'DTE', gridcolor: '#30363d', color: '#7d8590' },
              zaxis: { title: 'IV', gridcolor: '#30363d', color: '#7d8590' },
              camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
            }
          }}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
        />
      </div>
    </div>
  );
}
