"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

export default function GEXChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#7d8590",
      },
      grid: {
        vertLines: { color: "#30363d" },
        horzLines: { color: "#30363d" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
    });

    const histogramSeries = chart.addHistogramSeries({
      color: "#58a6ff",
    });

    const data = Array.from({ length: 40 }, (_, i) => ({
      time: (1718928000 + i * 86400) as any, // sequential timestamps for LW Charts
      value: Math.sin(i * 0.5) * 100,
      color: Math.sin(i * 0.5) > 0 ? "#3fb950" : "#f85149"
    }));

    histogramSeries.setData(data);
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, []);

  return (
    <div className="card h-full p-4">
      <h3 className="text-sm font-semibold mb-2">GEX 分布 / Gamma Exposure</h3>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
