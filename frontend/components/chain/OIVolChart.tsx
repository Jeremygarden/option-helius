"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChainResponse } from "@/lib/chainData";

type OIVolChartProps = { chain?: ChainResponse | null; loading?: boolean };
type Mode = "bars" | "heatmap";

export default function OIVolChart({ chain, loading }: OIVolChartProps) {
  const [mode, setMode] = useState<Mode>("bars");

  const rows = useMemo(() => {
    const byStrike = new Map<
      number,
      { strike: number; callOi: number; putOi: number; callVol: number; putVol: number }
    >();
    (chain?.options || []).forEach((o) => {
      const row = byStrike.get(o.strike) || {
        strike: o.strike,
        callOi: 0,
        putOi: 0,
        callVol: 0,
        putVol: 0,
      };
      if (o.type === "call") {
        row.callOi += o.oi || 0;
        row.callVol += o.volume || 0;
      } else {
        row.putOi += o.oi || 0;
        row.putVol += o.volume || 0;
      }
      byStrike.set(o.strike, row);
    });
    return Array.from(byStrike.values()).sort((a, b) => a.strike - b.strike);
  }, [chain]);

  const maxValue = Math.max(
    1,
    ...rows.flatMap((r) => [r.callOi, r.putOi, r.callVol, r.putVol]),
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div className="flex justify-end">
        <div
          className="flex rounded-md border p-0.5 text-[11px]"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-default)",
          }}
        >
          {(["bars", "heatmap"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="rounded px-2.5 py-1 transition-colors"
              style={{
                background: mode === m ? "var(--accent-blue)" : "transparent",
                color: mode === m ? "#fff" : "var(--text-muted)",
              }}
            >
              {m === "bars" ? "柱状图" : "热力图"}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="h-[280px]">
        {loading ? (
          <div
            className="h-full rounded-md animate-pulse"
            style={{ background: "var(--bg-elevated)" }}
          />
        ) : mode === "heatmap" ? (
          <div
            className="grid h-full content-start gap-1 overflow-auto rounded border p-2"
            style={{
              borderColor: "var(--border-default)",
              gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))",
            }}
          >
            {rows.map((r) => {
              const intensity =
                Math.max(r.callOi, r.putOi, r.callVol, r.putVol) / maxValue;
              return (
                <div
                  key={r.strike}
                  className="rounded border p-2 font-mono text-[10px]"
                  style={{
                    borderColor: "var(--border-default)",
                    background: `rgba(88,166,255,${0.06 + intensity * 0.42})`,
                  }}
                >
                  <div className="mb-1" style={{ color: "var(--text-primary)" }}>
                    ${r.strike}
                  </div>
                  <div style={{ color: "#3fb950" }}>C {Math.round(r.callOi / 1000)}k</div>
                  <div style={{ color: "#f85149" }}>P {Math.round(r.putOi / 1000)}k</div>
                  <div style={{ color: "var(--text-muted)" }}>
                    V {Math.round((r.callVol + r.putVol) / 1000)}k
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" />
              <XAxis
                dataKey="strike"
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                axisLine={{ stroke: "var(--border-default)" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(Number(v) / 1000)}k`}
              />
              <Tooltip
                cursor={{ fill: "rgba(88,166,255,0.08)" }}
                contentStyle={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-default)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="callOi" name="Call OI" fill="#3fb950" radius={[2, 2, 0, 0]} />
              <Bar dataKey="putOi" name="Put OI" fill="#f85149" radius={[2, 2, 0, 0]} />
              <Bar dataKey="callVol" name="Call Vol" fill="#58a6ff" radius={[2, 2, 0, 0]} />
              <Bar dataKey="putVol" name="Put Vol" fill="#f0883e" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
