import PortCard from "./components/PortCard";
import PortsMapClient from "./components/PortsMapClient";
import { PORTS } from "./lib/ports";
import { fetchPortTides } from "./lib/tides";

export const revalidate = 1800;

export default async function Home() {
  const results = await Promise.allSettled(PORTS.map(fetchPortTides));
  const tides = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const failed = results.length - tides.length;

  return (
    <main className="flex-1">
      <section className="bg-gradient-to-b from-sky-700 to-sky-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Marées de Bretagne
          </h1>
          <p className="mt-2 text-sky-100/90 max-w-2xl">
            Horaires et hauteurs des pleines et basses mers dans les principaux
            ports bretons, sur 48 heures.
          </p>
          <p className="mt-4 text-xs text-sky-200/80">
            Données&nbsp;: Open-Meteo Marine ·{" "}
            {new Date().toLocaleString("fr-FR", {
              dateStyle: "full",
              timeStyle: "short",
              timeZone: "Europe/Paris",
            })}
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pt-8">
        <div className="h-80 sm:h-96 rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
          <PortsMapClient tides={tides} />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-8">
        {failed > 0 && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 text-sm">
            {failed} port{failed > 1 ? "s" : ""} n&apos;ont pas pu être chargés.
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {tides.map((t) => (
            <PortCard key={t.port.slug} data={t} />
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 pb-10 text-xs text-slate-500">
        Les hauteurs sont indicatives et référencées au niveau moyen de la mer.
        Pour la navigation, consultez les prédictions du SHOM.
      </footer>
    </main>
  );
}
