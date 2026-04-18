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

function groupByDay(extremes: PortTides["extremes"]) {
  const groups = new Map<string, PortTides["extremes"]>();
  for (const e of extremes) {
    const key = new Date(e.time).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return Array.from(groups.entries()).slice(0, 2);
}

export default function PortCard({ data }: { data: PortTides }) {
  const days = groupByDay(data.extremes);

  return (
    <article className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
      <header className="px-5 pt-5 pb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {data.port.name}
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
        {days.map(([day, extremes]) => (
          <div key={day}>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
              {formatDate(extremes[0].time)}
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {extremes.map((e) => (
                <li
                  key={e.time}
                  className={`rounded-lg px-2 py-1.5 text-sm flex flex-col ${
                    e.type === "high"
                      ? "bg-sky-50 text-sky-900"
                      : "bg-amber-50 text-amber-900"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wide opacity-70">
                    {e.type === "high" ? "Pleine mer" : "Basse mer"}
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
      </div>
    </article>
  );
}
