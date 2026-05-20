"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

export default function OIVolChart() {
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

    const callSeries = chart.addHistogramSeries({ color: "#3fb950" });
    const putSeries = chart.addHistogramSeries({ color: "#f85149" });

    const callData = Array.from({ length: 20 }, (_, i) => ({
      time: (1718928000 + i * 86400) as any,
      value: Math.random() * 5000,
    }));
    
    const putData = Array.from({ length: 20 }, (_, i) => ({
      time: (1718928000 + i * 86400) as any,
      value: Math.random() * 4500,
    }));

    callSeries.setData(callData);
    putSeries.setData(putData);
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, []);

  return (
    <div className="card h-full p-4">
      <h3 className="text-sm font-semibold mb-2">OI & 成交量 / Open Interest & Volume</h3>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
