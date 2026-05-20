"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

export default function TermStructure() {
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

    const lineSeries = chart.addLineSeries({
      color: "#a371f7",
      lineWidth: 2,
    });

    const data = [
      { time: "2024-06-21", value: 0.18 },
      { time: "2024-06-28", value: 0.19 },
      { time: "2024-07-19", value: 0.22 },
      { time: "2024-08-16", value: 0.24 },
      { time: "2024-09-20", value: 0.25 },
      { time: "2024-12-20", value: 0.28 },
    ];

    lineSeries.setData(data as any);
    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  return (
    <div className="card h-full p-4">
      <h3 className="text-sm font-semibold mb-2">IV 期限结构 / Term Structure</h3>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
