// Shim for recharts v3 which ships without a root index.d.ts
// This file is intentionally minimal — just enough to silence "implicitly has any type" errors.
declare module "recharts" {
  // Re-export everything from the individual type files
  export * from "recharts/types/cartesian/Area";
  export * from "recharts/types/cartesian/Bar";
  export * from "recharts/types/cartesian/BarChart";
  export * from "recharts/types/chart/ComposedChart";
  export * from "recharts/types/cartesian/Line";
  export * from "recharts/types/cartesian/ReferenceLine";
  export * from "recharts/types/container/ResponsiveContainer";
  export * from "recharts/types/component/CartesianGrid";
  export * from "recharts/types/component/Legend";
  export * from "recharts/types/component/Tooltip";
  export * from "recharts/types/component/Cell";
  export * from "recharts/types/cartesian/XAxis";
  export * from "recharts/types/cartesian/YAxis";
}
