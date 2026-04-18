import { Port } from "./ports";

export type TideExtreme = {
  type: "high" | "low";
  time: string; // ISO local time
  height: number; // meters
};

export type PortTides = {
  port: Port;
  generatedAt: string;
  hourly: { time: string; height: number }[];
  extremes: TideExtreme[];
  next: TideExtreme | null;
};

type MarineResponse = {
  hourly?: {
    time: string[];
    sea_level_height_msl: (number | null)[];
  };
};

function findExtremes(
  times: string[],
  heights: (number | null)[],
): TideExtreme[] {
  const extremes: TideExtreme[] = [];
  for (let i = 1; i < heights.length - 1; i++) {
    const prev = heights[i - 1];
    const cur = heights[i];
    const next = heights[i + 1];
    if (prev == null || cur == null || next == null) continue;
    if (cur > prev && cur >= next) {
      extremes.push({ type: "high", time: times[i], height: cur });
    } else if (cur < prev && cur <= next) {
      extremes.push({ type: "low", time: times[i], height: cur });
    }
  }
  return extremes;
}

export async function fetchPortTides(port: Port): Promise<PortTides> {
  const url = new URL("https://marine-api.open-meteo.com/v1/marine");
  url.searchParams.set("latitude", String(port.latitude));
  url.searchParams.set("longitude", String(port.longitude));
  url.searchParams.set("hourly", "sea_level_height_msl");
  url.searchParams.set("timezone", "Europe/Paris");
  url.searchParams.set("forecast_days", "3");

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) {
    throw new Error(`Open-Meteo ${res.status} for ${port.name}`);
  }
  const data = (await res.json()) as MarineResponse;

  const times = data.hourly?.time ?? [];
  const heights = data.hourly?.sea_level_height_msl ?? [];
  const hourly = times.map((t, i) => ({ time: t, height: heights[i] ?? 0 }));
  const extremes = findExtremes(times, heights);

  const now = Date.now();
  const next =
    extremes.find((e) => new Date(e.time).getTime() > now) ?? null;

  return {
    port,
    generatedAt: new Date().toISOString(),
    hourly,
    extremes,
    next,
  };
}
