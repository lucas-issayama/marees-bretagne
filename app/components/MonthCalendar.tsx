"use client";

import { DailyTide } from "../lib/tides";
import { coefTier } from "../lib/coef";

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

type Props = {
  daily: DailyTide[];
  year: number;
  month: number; // 0-based
  todayDate: string; // YYYY-MM-DD (Europe/Paris)
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
};

export default function MonthCalendar({
  daily,
  year,
  month,
  todayDate,
  selectedDate,
  onSelectDate,
}: Props) {
  const byDate = new Map(daily.map((d) => [d.date, d]));

  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7;

  type Cell = null | { date: string; day: number; data?: DailyTide };
  const cells: Cell[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${pad2(month + 1)}-${pad2(d)}`;
    cells.push({ date, day: d, data: byDate.get(date) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1 text-[10px] uppercase tracking-wide text-slate-500 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c)
            return (
              <div key={i} className="aspect-square rounded-lg bg-slate-50/40" />
            );
          const { day, data, date } = c;
          const coef = data?.coefficient;
          const tier = coef != null ? coefTier(coef) : null;
          const isToday = date === todayDate;
          const isSelected = selectedDate === date;
          const interactive = !!onSelectDate;

          const rings = isSelected
            ? "ring-2 ring-sky-600 ring-offset-2 ring-offset-white shadow-lg z-10"
            : isToday
              ? "ring-2 ring-slate-900"
              : "shadow-sm";

          const base = `relative aspect-square rounded-lg p-2 flex flex-col overflow-hidden text-left w-full ${
            tier ? tier.cell : "bg-slate-50 text-slate-400"
          } ${rings}`;

          const content = (
            <>
              <div className="flex items-start justify-between leading-none">
                <span className="text-xl sm:text-2xl font-bold tabular-nums">
                  {day}
                </span>
                {tier && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {tier.short}
                  </span>
                )}
              </div>
              <div className="flex-1 flex items-end justify-end">
                {coef != null ? (
                  <span className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none">
                    {coef}
                  </span>
                ) : (
                  <span className="text-xs opacity-50">—</span>
                )}
              </div>
            </>
          );

          return interactive ? (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate!(date)}
              className={`${base} cursor-pointer hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-600 transition`}
            >
              {content}
            </button>
          ) : (
            <div key={i} className={base}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
