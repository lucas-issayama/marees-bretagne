import { DailyTide } from "../lib/tides";
import { coefTier } from "../lib/coef";

function formatFullDate(dateIso: string) {
  const d = new Date(`${dateIso}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatHHmm(naive: string) {
  return naive.slice(11, 16);
}

export default function DayDetailCard({
  day,
  date,
}: {
  day: DailyTide | null;
  date: string;
}) {
  const dateLabel = formatFullDate(date);

  if (!day || day.extremes.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
        <h3 className="text-base font-semibold text-slate-900 capitalize">
          {dateLabel}
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Pas de prévisions disponibles pour ce jour.
        </p>
      </div>
    );
  }

  const coef = day.coefficient;
  const tier = coef != null ? coefTier(coef) : null;

  // Highest/lowest of the day to contextualize each extreme.
  const highs = day.extremes.filter((e) => e.type === "high");
  const lows = day.extremes.filter((e) => e.type === "low");
  const maxHigh = highs.length
    ? Math.max(...highs.map((e) => e.height))
    : null;
  const minLow = lows.length ? Math.min(...lows.map((e) => e.height)) : null;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 capitalize">
            {dateLabel}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Marnage&nbsp;: {day.range.toFixed(2)} m
            {maxHigh != null && lows.length > 0 && (
              <>
                {" "}· PM max {maxHigh.toFixed(2)} m · BM min{" "}
                {(minLow ?? 0).toFixed(2)} m
              </>
            )}
          </p>
        </div>
        {coef != null && tier && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-2xl font-extrabold tabular-nums leading-none ${tier.cell}`}
            >
              {coef}
            </span>
            <span className="text-sm font-medium text-slate-700">
              {tier.label}
            </span>
          </div>
        )}
      </div>

      <ul className="grid gap-2">
        {day.extremes.map((e) => {
          const isHigh = e.type === "high";
          return (
            <li
              key={e.time}
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
            >
              <span
                className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-white ${
                  isHigh ? "bg-sky-500" : "bg-amber-400"
                }`}
                aria-hidden="true"
              >
                {isHigh ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 5v14M5 12l7-7 7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 19V5M5 12l7 7 7-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  {isHigh ? "Pleine mer" : "Basse mer"}
                </div>
                <div className="text-base font-semibold text-slate-900 tabular-nums">
                  {formatHHmm(e.time)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-slate-900 tabular-nums">
                  {e.height.toFixed(2)} m
                </div>
                {isHigh && e.coefficient != null && (
                  <div className="text-xs text-slate-500 tabular-nums">
                    Coef. {e.coefficient}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
