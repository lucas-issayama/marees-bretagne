import type { NextRequest } from "next/server";
import { PORTS } from "../../../../lib/ports";
import { fetchPortTides } from "../../../../lib/tides";

export const revalidate = 1800;

// Open-Meteo Marine API hard limits.
const MAX_PAST_DAYS = 92;
const MAX_FORECAST_DAYS = 16;

function parisToday(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${ymd}T00:00:00Z`);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const port = PORTS.find((p) => p.slug === slug);
  if (!port) {
    return Response.json({ error: "Port introuvable" }, { status: 404 });
  }

  const month = request.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json(
      { error: "Paramètre 'month' attendu au format YYYY-MM" },
      { status: 400 },
    );
  }

  const [year, monthNum] = month.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(year, monthNum - 1, 1));
  const lastOfMonth = new Date(Date.UTC(year, monthNum, 0));
  const today = parisToday();
  const day = 86_400_000;

  const pastDaysToFirst = Math.ceil(
    (today.getTime() - firstOfMonth.getTime()) / day,
  );
  const forecastDaysToLast = Math.ceil(
    (lastOfMonth.getTime() - today.getTime()) / day,
  );

  const pastDays = Math.max(0, Math.min(MAX_PAST_DAYS, pastDaysToFirst));
  const forecastDays = Math.max(
    1,
    Math.min(MAX_FORECAST_DAYS, forecastDaysToLast + 1),
  );

  try {
    const data = await fetchPortTides(port, { pastDays, forecastDays });
    // Trim to the requested month so clients can merge by date without dedup.
    const daily = data.daily.filter((d) => d.date.startsWith(month));
    return Response.json({ daily });
  } catch {
    return Response.json(
      { error: "Erreur de chargement des marées" },
      { status: 502 },
    );
  }
}
