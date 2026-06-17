// Type shim for recharts v3 — re-exports from the package's own index.d.ts
// This resolves module augmentation issues in Next.js 14 TypeScript compilation.
declare module "recharts" {
  export * from "recharts/types/index";
}
