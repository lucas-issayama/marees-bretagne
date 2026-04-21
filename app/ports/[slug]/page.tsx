import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PortMonthView from "../../components/PortMonthView";
import TideChart from "../../components/TideChart";
import { coefLabel, coefTier } from "../../lib/coef";
import { PORTS } from "../../lib/ports";
import { fetchPortTidesBySlug } from "../../lib/tides";

export const revalidate = 1800;

export async function generateStaticParams() {
  return PORTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const port = PORTS.find((p) => p.slug === slug);
  if (!port) return { title: "Port inconnu" };
  return {
    title: `Marées à ${port.name} — Marées de Bretagne`,
    description: `Horaires des pleines et basses mers et coefficients de marée à ${port.name}.`,
  };
}

function formatTime(iso: string) {
  return new Date(iso + "Z").toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

// Compute today's calendar day in Europe/Paris as YYYY-MM-DD.
function parisToday(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export default async function PortPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // 60 days back + 16 forward covers current month ± ~1, so prev/next month
  // navigation has real data in most directions. Open-Meteo Marine caps
  // forecast_days at 16.
  const data = await fetchPortTidesBySlug(slug, {
    pastDays: 60,
    forecastDays: 16,
  });
  if (!data) notFound();

  const todayStr = parisToday();
  const today =
    data.daily.find((d) => d.date === todayStr) ?? data.daily[0];
  const todayHourly = data.hourly.filter(
    (h) => h.time.slice(0, 10) === todayStr,
  );

  return (
    <main className="flex-1">
      <section className="bg-gradient-to-b from-sky-700 to-sky-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8 sm:py-12">
          <Link
            href="/"
            className="text-sm text-sky-200 hover:text-white inline-flex items-center gap-1"
          >
            ← Tous les ports
          </Link>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            {data.port.name}
          </h1>
          <p className="mt-1 text-sky-100/90 text-sm">
            {data.port.department} · {data.port.latitude.toFixed(2)}°N,{" "}
            {Math.abs(data.port.longitude).toFixed(2)}°O
          </p>

          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            {data.next && (
              <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
                <div className="text-[10px] uppercase tracking-wide text-sky-200">
                  Prochaine{" "}
                  {data.next.type === "high" ? "pleine mer" : "basse mer"}
                </div>
                <div className="text-lg font-medium">
                  {formatTime(data.next.time)} · {data.next.height.toFixed(2)} m
                </div>
              </div>
            )}
            {today?.coefficient != null && (
              <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
                <div className="text-[10px] uppercase tracking-wide text-sky-200">
                  Coefficient du jour
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-lg font-extrabold tabular-nums ${coefTier(today.coefficient).cell}`}
                  >
                    {today.coefficient}
                  </span>
                  <span className="text-sm text-sky-100/90">
                    {coefLabel(today.coefficient)}
                  </span>
                </div>
              </div>
            )}
            {today && (
              <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
                <div className="text-[10px] uppercase tracking-wide text-sky-200">
                  Marnage du jour
                </div>
                <div className="text-lg font-medium">
                  {today.range.toFixed(2)} m
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Hauteur d&apos;eau · aujourd&apos;hui
        </h2>
        <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
          <TideChart points={todayHourly} showDayLabels={false} />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-10">
        <PortMonthView slug={slug} daily={data.daily} todayDate={todayStr} />

        <p className="mt-6 text-xs text-slate-500">
          Coefficient calculé à partir du port de référence de Brest
          (U = 3,05 m) et diffusé aux autres ports par créneau AM/PM. Hauteurs
          référencées au zéro hydrographique via le niveau moyen SHOM de chaque
          port. Source des hauteurs&nbsp;: Open-Meteo Marine (modèle FES
          global) — l&apos;amplitude et la phase peuvent différer de quelques
          dizaines de centimètres et de ~15 min des prédictions officielles.
          Pour la navigation, consultez le SHOM.
        </p>
      </section>
    </main>
  );
}
