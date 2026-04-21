import { Port, PORTS } from "./ports";

export type TideExtreme = {
  type: "high" | "low";
  time: string; // ISO local time (Europe/Paris, naive)
  height: number; // meters above chart datum (ZH)
  coefficient?: number | null; // only set on high tides (pleines mers)
};

export type DailyTide = {
  date: string; // YYYY-MM-DD (Europe/Paris day)
  extremes: TideExtreme[];
  range: number; // meters, max high - min low on that day
  coefficient: number | null; // 20..120, average coef of the day's high tides
};

export type PortTides = {
  port: Port;
  generatedAt: string;
  hourly: { time: string; height: number }[];
  extremes: TideExtreme[];
  daily: DailyTide[];
  next: TideExtreme | null;
};

type MarineResponse = {
  hourly?: {
    time: string[];
    sea_level_height_msl: (number | null)[];
  };
};

// Open-Meteo (global FES-derived model) systematically under-predicts peak
// tidal elevation in Brittany by ~20% compared to SHOM harmonics. Applied
// only when computing the nationwide coefficient from the Brest reference
// port. Calibrated against maree.info Brest, April 2026.
const BREST_AMPLITUDE_CORRECTION = 1.2;

// Parse an Europe/Paris naive timestamp ("2026-04-20T09:00") as UTC so Date
// arithmetic is safe and round-trips produce the same string.
function parseNaive(iso: string): Date {
  return new Date(iso + "Z");
}
function formatNaive(d: Date): string {
  return d.toISOString().slice(0, 16);
}
function shiftHours(iso: string, hours: number): string {
  return formatNaive(new Date(parseNaive(iso).getTime() + hours * 3600_000));
}

// Parabolic fit through 3 equally-spaced samples (y0, y1, y2). Returns the
// fractional offset of the extremum from the middle sample and the refined
// peak value.
function parabolicPeak(y0: number, y1: number, y2: number) {
  const denom = y0 - 2 * y1 + y2;
  if (denom === 0) return { offset: 0, peak: y1 };
  const offset = (0.5 * (y0 - y2)) / denom;
  const peak = y1 - 0.25 * (y0 - y2) * offset;
  return { offset, peak };
}

function findExtremes(
  times: string[],
  heights: (number | null)[],
): TideExtreme[] {
  const out: TideExtreme[] = [];
  for (let i = 1; i < heights.length - 1; i++) {
    const p = heights[i - 1];
    const c = heights[i];
    const n = heights[i + 1];
    if (p == null || c == null || n == null) continue;
    if (c > p && c >= n) {
      const { offset, peak } = parabolicPeak(p, c, n);
      out.push({ type: "high", time: shiftHours(times[i], offset), height: peak });
    } else if (c < p && c <= n) {
      const { offset, peak } = parabolicPeak(p, c, n);
      out.push({ type: "low", time: shiftHours(times[i], offset), height: peak });
    }
  }
  return out;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

// Fetch Brest's raw MSL tide heights and derive the nationwide French
// coefficient for each day, split into [AM, PM] slots. The coefficient is
// astronomical and identical across France; applying the SHOM formula at the
// Brest reference port yields the same value maree.info publishes.
async function fetchBrestDailyCoefs(
  pastDays: number,
  forecastDays: number,
): Promise<Map<string, [number | null, number | null]>> {
  const brest = PORTS.find((p) => p.slug === "brest");
  if (!brest) return new Map();
  const url = new URL("https://marine-api.open-meteo.com/v1/marine");
  url.searchParams.set("latitude", String(brest.latitude));
  url.searchParams.set("longitude", String(brest.longitude));
  url.searchParams.set("hourly", "sea_level_height_msl");
  url.searchParams.set("timezone", "Europe/Paris");
  url.searchParams.set("past_days", String(pastDays));
  url.searchParams.set("forecast_days", String(forecastDays));
  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) return new Map();
  const data = (await res.json()) as MarineResponse;
  const times = data.hourly?.time ?? [];
  const msl = data.hourly?.sea_level_height_msl ?? [];

  // Peak height above MSL at each Brest high tide (parabolically refined).
  const peaks: { time: string; peakMSL: number }[] = [];
  for (let i = 1; i < msl.length - 1; i++) {
    const p = msl[i - 1];
    const c = msl[i];
    const n = msl[i + 1];
    if (p == null || c == null || n == null) continue;
    if (c > p && c >= n) {
      const { offset, peak } = parabolicPeak(p, c, n);
      peaks.push({ time: shiftHours(times[i], offset), peakMSL: peak });
    }
  }

  // coef = 100 × (HM − NM) / U = 100 × peak_above_MSL / U, with α correction.
  const byDay = new Map<string, number[]>();
  for (const h of peaks) {
    if (h.peakMSL <= 0) continue;
    const raw = Math.round(
      (100 * h.peakMSL * BREST_AMPLITUDE_CORRECTION) / brest.unitHeight,
    );
    const coef = Math.max(20, Math.min(120, raw));
    const day = dayKey(h.time);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(coef);
  }

  const out = new Map<string, [number | null, number | null]>();
  for (const [day, coefs] of byDay) {
    out.set(day, [coefs[0] ?? null, coefs[1] ?? null]);
  }
  return out;
}

// Assign each high tide the Brest AM/PM coefficient of its local day.
function applyNationalCoefs(
  extremes: TideExtreme[],
  brestCoefs: Map<string, [number | null, number | null]>,
): TideExtreme[] {
  const highIndexInDay = new Map<string, number>();
  return extremes.map((e) => {
    if (e.type !== "high") return e;
    const day = dayKey(e.time);
    const slot = highIndexInDay.get(day) ?? 0;
    highIndexInDay.set(day, slot + 1);
    const pair = brestCoefs.get(day);
    const coef = pair ? pair[Math.min(slot, 1)] : null;
    return { ...e, coefficient: coef };
  });
}

function groupDaily(extremes: TideExtreme[]): DailyTide[] {
  const byDay = new Map<string, TideExtreme[]>();
  for (const e of extremes) {
    const k = dayKey(e.time);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(e);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, ex]) => {
      const highs = ex.filter((e) => e.type === "high");
      const lows = ex.filter((e) => e.type === "low");
      const range =
        highs.length && lows.length
          ? Math.max(...highs.map((e) => e.height)) -
            Math.min(...lows.map((e) => e.height))
          : 0;
      const coefs = highs
        .map((e) => e.coefficient)
        .filter((c): c is number => c != null);
      const coefficient = coefs.length
        ? Math.round(coefs.reduce((a, b) => a + b, 0) / coefs.length)
        : null;
      return { date, extremes: ex, range, coefficient };
    });
}

export async function fetchPortTides(
  port: Port,
  options: { pastDays?: number; forecastDays?: number } = {},
): Promise<PortTides> {
  const pastDays = options.pastDays ?? 0;
  const forecastDays = options.forecastDays ?? 7;

  const url = new URL("https://marine-api.open-meteo.com/v1/marine");
  url.searchParams.set("latitude", String(port.latitude));
  url.searchParams.set("longitude", String(port.longitude));
  url.searchParams.set("hourly", "sea_level_height_msl");
  url.searchParams.set("timezone", "Europe/Paris");
  url.searchParams.set("past_days", String(pastDays));
  url.searchParams.set("forecast_days", String(forecastDays));

  const [res, brestCoefs] = await Promise.all([
    fetch(url.toString(), { next: { revalidate: 1800 } }),
    fetchBrestDailyCoefs(pastDays, forecastDays),
  ]);
  if (!res.ok) {
    throw new Error(`Open-Meteo ${res.status} for ${port.name}`);
  }
  const data = (await res.json()) as MarineResponse;

  const times = data.hourly?.time ?? [];
  const mslHeights = data.hourly?.sea_level_height_msl ?? [];
  // Shift MSL → chart datum (ZH) so heights match SHOM / maree.info.
  const zhHeights = mslHeights.map((h) =>
    h == null ? null : h + port.chartDatumOffset,
  );
  const hourly = times.map((t, i) => ({ time: t, height: zhHeights[i] ?? 0 }));
  const extremes = applyNationalCoefs(
    findExtremes(times, zhHeights),
    brestCoefs,
  );
  const daily = groupDaily(extremes);

  const now = Date.now();
  const next =
    extremes.find((e) => new Date(e.time).getTime() > now) ?? null;

  return {
    port,
    generatedAt: new Date().toISOString(),
    hourly,
    extremes,
    daily,
    next,
  };
}

export async function fetchPortTidesBySlug(
  slug: string,
  options?: { pastDays?: number; forecastDays?: number },
): Promise<PortTides | null> {
  const port = PORTS.find((p) => p.slug === slug);
  if (!port) return null;
  return fetchPortTides(port, options);
}
