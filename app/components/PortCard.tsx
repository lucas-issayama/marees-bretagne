import Link from "next/link";
import { PortTides } from "../lib/tides";
import TideChart from "./TideChart";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function coefClasses(coef: number) {
  if (coef >= 95) return "bg-emerald-700 text-white";
  if (coef >= 80) return "bg-green-500 text-white";
  if (coef >= 70) return "bg-lime-200 text-lime-900";
  if (coef >= 45) return "bg-amber-50 text-amber-900";
  return "bg-slate-100 text-slate-600";
}

export default function PortCard({ data }: { data: PortTides }) {
  const days = data.daily.slice(0, 2);

  return (
    <article className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
      <header className="px-5 pt-5 pb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            <Link
              href={`/ports/${data.port.slug}`}
              className="hover:text-sky-700 transition-colors"
            >
              {data.port.name}
            </Link>
          </h2>
          <p className="text-xs text-slate-500">{data.port.department}</p>
        </div>
        {data.next && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">
              Prochaine {data.next.type === "high" ? "pleine mer" : "basse mer"}
            </div>
            <div className="text-base font-medium text-sky-700">
              {formatTime(data.next.time)} · {data.next.height.toFixed(2)} m
            </div>
          </div>
        )}
      </header>

      <div className="px-3">
        <TideChart points={data.hourly.slice(0, 48)} />
      </div>

      <div className="px-5 py-4 border-t border-slate-100 grid gap-3">
        {days.map((day) => (
          <div key={day.date}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {formatDate(day.extremes[0]?.time ?? day.date)}
              </div>
              {day.coefficient != null && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${coefClasses(day.coefficient)}`}
                  title="Coefficient de marée"
                >
                  Coef. {day.coefficient}
                </span>
              )}
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {day.extremes.map((e) => (
                <li
                  key={e.time}
                  className={`rounded-lg px-2 py-1.5 text-sm flex flex-col ${
                    e.type === "high"
                      ? "bg-sky-50 text-sky-900"
                      : "bg-amber-50 text-amber-900"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wide opacity-70 flex items-center justify-between gap-1">
                    <span>{e.type === "high" ? "Pleine mer" : "Basse mer"}</span>
                    {e.type === "high" && e.coefficient != null && (
                      <span className="font-semibold text-sky-700">
                        {e.coefficient}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{formatTime(e.time)}</span>
                  <span className="text-xs opacity-80">
                    {e.height.toFixed(2)} m
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <Link
          href={`/ports/${data.port.slug}`}
          className="mt-1 text-xs font-medium text-sky-700 hover:text-sky-900"
        >
          Voir les 7 jours →
        </Link>
      </div>
    </article>
  );
}
