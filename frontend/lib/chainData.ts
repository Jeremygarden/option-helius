export type OptionType = "call" | "put";

export interface OptionContract {
  strike: number;
  expiry?: string;
  type: OptionType;
  bid?: number;
  ask?: number;
  price?: number;
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  oi?: number;
  volume?: number;
  in_the_money?: boolean;
}

export interface ChainResponse {
  ticker: string;
  expiry?: string;
  spot?: number;
  options: OptionContract[];
  expirations?: string[];
  error?: string;
  fallback?: boolean;
}

export interface SummaryResponse {
  ticker: string;
  spot?: number;
  expiry?: string;
  expected_move?: string;
  expected_move_dollar?: number;
  expected_move_pct?: number;
  max_pain?: number;
  pcr_volume?: number;
  pcr_oi?: number;
  atm_iv?: number;
  call_volume?: number;
  put_volume?: number;
  call_oi?: number;
  put_oi?: number;
  net_gex?: number | string;
  error?: string;
  fallback?: boolean;
}

export interface GexPoint {
  strike: number;
  gex: number;
}

export interface IVSurfacePoint {
  strike: number;
  dte: number;
  iv: number;
  type?: OptionType;
  expiry?: string;
}

export interface ExpirationItem {
  date: string;
  dte: number;
  label: string;
  kind: "Weekly" | "Monthly" | "Quarterly";
}

const DAY = 24 * 60 * 60 * 1000;

export function daysToExpiry(expiry: string): number {
  const end = new Date(`${expiry}T21:00:00Z`).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / DAY));
}

export function normalizeTicker(input: string) {
  return input.trim().replace(/[^A-Za-z.\-]/g, "").toUpperCase().slice(0, 12) || "NVDA";
}

export function classifyExpiry(expiry: string): ExpirationItem["kind"] {
  const date = new Date(`${expiry}T00:00:00Z`);
  const day = date.getUTCDate();
  if (day >= 15 && day <= 21) return "Monthly";
  if (day >= 28) return "Quarterly";
  return "Weekly";
}

export function toExpirationItem(date: string): ExpirationItem {
  return {
    date,
    dte: daysToExpiry(date),
    label: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "2-digit", timeZone: "UTC" }),
    kind: classifyExpiry(date),
  };
}

export function formatMoney(value?: number, opts: { signed?: boolean; compact?: boolean; digits?: number } = {}) {
  if (value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const sign = opts.signed && value > 0 ? "+" : value < 0 ? "-" : "";
  const digits = opts.digits ?? (abs >= 100 ? 0 : 2);
  if (opts.compact) {
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(digits)}`;
}

export function formatNumber(value?: number, digits = 2) {
  if (value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function formatIV(iv?: number) {
  if (!iv || Number.isNaN(iv)) return "—";
  return `${(iv * 100).toFixed(1)}%`;
}

function seeded(ticker: string) {
  let seed = 0;
  for (let i = 0; i < ticker.length; i += 1) seed = (seed * 31 + ticker.charCodeAt(i)) >>> 0;
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function createMockExpirations(): string[] {
  const base = new Date();
  const expiries: string[] = [];
  for (let i = 1; expiries.length < 9; i += 1) {
    const d = new Date(base.getTime() + i * DAY);
    if (d.getUTCDay() === 5) expiries.push(d.toISOString().slice(0, 10));
  }
  return expiries;
}

export function createMockChain(ticker: string, expiry?: string): ChainResponse {
  const random = seeded(`${ticker}-${expiry || "front"}`);
  const expirations = createMockExpirations();
  const exp = expiry && expirations.includes(expiry) ? expiry : expirations[0];
  const dte = Math.max(1, daysToExpiry(exp));
  const baseSpot = ticker === "SPY" ? 630 : ticker === "TSLA" ? 180 : ticker === "AAPL" ? 210 : 128 + random() * 40;
  const step = baseSpot > 400 ? 5 : 2.5;
  const strikes = Array.from({ length: 37 }, (_, i) => Math.round((baseSpot + (i - 18) * step) * 2) / 2);
  const options: OptionContract[] = [];

  strikes.forEach((strike) => {
    const moneyness = (strike - baseSpot) / baseSpot;
    const smile = 0.34 + Math.abs(moneyness) * 1.25 + Math.sqrt(30 / dte) * 0.05;
    const oiBase = Math.max(60, Math.round((1 - Math.min(0.9, Math.abs(moneyness) * 3)) * 9000 * (0.55 + random())));
    const volBase = Math.max(5, Math.round(oiBase * (0.06 + random() * 0.32)));
    const gamma = Math.max(0.0001, (1 / (1 + Math.abs(moneyness) * 18)) * (0.012 / Math.sqrt(dte)));
    const callIntrinsic = Math.max(0, baseSpot - strike);
    const putIntrinsic = Math.max(0, strike - baseSpot);
    const extrinsic = baseSpot * smile * Math.sqrt(dte / 365) * 0.23 * Math.exp(-Math.abs(moneyness) * 7);

    options.push({ strike, expiry: exp, type: "call", bid: +(Math.max(0.05, callIntrinsic + extrinsic - 0.08)).toFixed(2), ask: +(callIntrinsic + extrinsic + 0.08).toFixed(2), price: +(callIntrinsic + extrinsic).toFixed(2), iv: +smile.toFixed(4), delta: +(1 / (1 + Math.exp(moneyness * 18))).toFixed(3), gamma: +gamma.toFixed(6), theta: +(-extrinsic / Math.max(1, dte)).toFixed(3), vega: +(baseSpot * Math.sqrt(dte / 365) * 0.01).toFixed(3), oi: oiBase, volume: volBase, in_the_money: strike < baseSpot });
    options.push({ strike, expiry: exp, type: "put", bid: +(Math.max(0.05, putIntrinsic + extrinsic - 0.08)).toFixed(2), ask: +(putIntrinsic + extrinsic + 0.08).toFixed(2), price: +(putIntrinsic + extrinsic).toFixed(2), iv: +(smile * (1 + Math.max(0, -moneyness) * 0.24)).toFixed(4), delta: +(-(1 / (1 + Math.exp(-moneyness * 18)))).toFixed(3), gamma: +gamma.toFixed(6), theta: +(-extrinsic / Math.max(1, dte)).toFixed(3), vega: +(baseSpot * Math.sqrt(dte / 365) * 0.01).toFixed(3), oi: Math.round(oiBase * (0.82 + random() * 0.52)), volume: Math.round(volBase * (0.74 + random() * 0.65)), in_the_money: strike > baseSpot });
  });

  return { ticker, expiry: exp, spot: +baseSpot.toFixed(2), options, expirations, fallback: true };
}

export function summarizeChain(chain: ChainResponse): SummaryResponse {
  const calls = chain.options.filter((o) => o.type === "call");
  const puts = chain.options.filter((o) => o.type === "put");
  const callVolume = calls.reduce((sum, o) => sum + (o.volume || 0), 0);
  const putVolume = puts.reduce((sum, o) => sum + (o.volume || 0), 0);
  const callOi = calls.reduce((sum, o) => sum + (o.oi || 0), 0);
  const putOi = puts.reduce((sum, o) => sum + (o.oi || 0), 0);
  const strikes = Array.from(new Set(chain.options.map((o) => o.strike))).sort((a, b) => a - b);
  const spot = chain.spot || strikes[Math.floor(strikes.length / 2)] || 100;
  const atm = strikes.reduce((best, s) => (Math.abs(s - spot) < Math.abs(best - spot) ? s : best), strikes[0] || spot);
  const atmCall = calls.find((o) => o.strike === atm);
  const atmPut = puts.find((o) => o.strike === atm);
  const expectedMove = (atmCall?.price || 0) + (atmPut?.price || 0);
  const atmIv = atmCall?.iv || atmPut?.iv || 0.35;
  let maxPain = atm;
  let minPain = Number.POSITIVE_INFINITY;
  strikes.forEach((s) => {
    const callPain = calls.reduce((sum, o) => sum + Math.max(0, s - o.strike) * (o.oi || 0), 0);
    const putPain = puts.reduce((sum, o) => sum + Math.max(0, o.strike - s) * (o.oi || 0), 0);
    if (callPain + putPain < minPain) { minPain = callPain + putPain; maxPain = s; }
  });
  return { ticker: chain.ticker, spot, expiry: chain.expiry, expected_move: `±$${expectedMove.toFixed(2)} (${((expectedMove / spot) * 100).toFixed(2)}%)`, expected_move_dollar: +expectedMove.toFixed(2), expected_move_pct: +((expectedMove / spot) * 100).toFixed(2), max_pain: maxPain, pcr_volume: callVolume ? +(putVolume / callVolume).toFixed(3) : 0, pcr_oi: callOi ? +(putOi / callOi).toFixed(3) : 0, atm_iv: +atmIv.toFixed(4), call_volume: callVolume, put_volume: putVolume, call_oi: callOi, put_oi: putOi, fallback: true };
}

export function createMockGex(chain: ChainResponse): GexPoint[] {
  const spot = chain.spot || 100;
  const byStrike = new Map<number, number>();
  chain.options.forEach((o) => {
    const signed = (o.type === "put" ? -1 : 1) * (o.gamma || 0.001) * (o.oi || 0) * spot * spot * 0.01 * 100;
    byStrike.set(o.strike, (byStrike.get(o.strike) || 0) + signed / 1_000_000);
  });
  return Array.from(byStrike.entries()).map(([strike, gex]) => ({ strike, gex: +gex.toFixed(2) })).sort((a, b) => a.strike - b.strike);
}

export function createMockIVSurface(ticker: string): IVSurfacePoint[] {
  const expirations = createMockExpirations();
  const front = createMockChain(ticker, expirations[0]);
  const spot = front.spot || 100;
  const strikes = Array.from({ length: 25 }, (_, i) => Math.round((spot * (0.78 + i * 0.02)) * 2) / 2);
  return expirations.slice(0, 8).flatMap((expiry) => {
    const dte = Math.max(1, daysToExpiry(expiry));
    return strikes.map((strike) => {
      const m = Math.abs(strike - spot) / spot;
      return { strike, dte, expiry, type: "call" as const, iv: +(0.28 + m * 1.15 + Math.sqrt(21 / dte) * 0.075).toFixed(4) };
    });
  });
}

export async function fetchJson<T>(path: string, fallback: T): Promise<{ data: T; error?: string; fallback: boolean }> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = (await res.json()) as T;
    const maybeError = typeof data === "object" && data && "error" in data ? String((data as { error?: unknown }).error || "") : "";
    if (maybeError) throw new Error(maybeError);
    return { data, fallback: false };
  } catch (error) {
    return { data: fallback, error: error instanceof Error ? error.message : "Unknown API error", fallback: true };
  }
}
