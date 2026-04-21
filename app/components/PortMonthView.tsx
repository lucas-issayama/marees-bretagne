"use client";

import { useEffect, useState } from "react";
import { DailyTide } from "../lib/tides";
import DayDetailCard from "./DayDetailCard";
import MonthCalendar from "./MonthCalendar";

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function monthKey(year: number, month: number) {
  return `${year}-${pad2(month + 1)}`;
}

export default function PortMonthView({
  slug,
  daily: initialDaily,
  todayDate,
}: {
  slug: string;
  daily: DailyTide[];
  todayDate: string;
}) {
  const todayObj = new Date(`${todayDate}T00:00:00Z`);
  const todayYear = todayObj.getUTCFullYear();
  const todayMonth = todayObj.getUTCMonth();

  const [year, setYear] = useState(todayYear);
  const [month, setMonth] = useState(todayMonth);
  const [selectedDate, setSelectedDate] = useState(todayDate);

  const [daily, setDaily] = useState<DailyTide[]>(initialDaily);
  // Only the current month is guaranteed complete in the initial payload;
  // adjacent months may contain partial data that we want to refetch if the
  // user navigates to them.
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(
    () => new Set([monthKey(todayYear, todayMonth)]),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const key = monthKey(year, month);
    if (loadedMonths.has(key)) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/ports/${slug}/daily?month=${key}`)
      .then((r) => (r.ok ? r.json() : { daily: [] as DailyTide[] }))
      .then((payload: { daily: DailyTide[] }) => {
        if (cancelled) return;
        setDaily((prev) => {
          const fresh = new Set(payload.daily.map((d) => d.date));
          return [
            ...prev.filter((d) => !fresh.has(d.date)),
            ...payload.daily,
          ].sort((a, b) => (a.date < b.date ? -1 : 1));
        });
        setLoadedMonths((prev) => new Set(prev).add(key));
      })
      .catch(() => {
        // Mark as loaded anyway to avoid refetch storms on a failing endpoint.
        if (!cancelled) setLoadedMonths((prev) => new Set(prev).add(key));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month, slug, loadedMonths]);

  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const selectedDay = daily.find((d) => d.date === selectedDate) ?? null;

  return (
    <div className="space-y-4">
      <DayDetailCard day={selectedDay} date={selectedDate} />

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={goPrev}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
            aria-label="Mois précédent"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 capitalize">
              {MONTHS[month]} {year}
            </h2>
            {loading && (
              <span
                className="inline-block w-3.5 h-3.5 rounded-full border-2 border-sky-600 border-t-transparent animate-spin"
                aria-label="Chargement"
              />
            )}
          </div>

          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
            aria-label="Mois suivant"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <MonthCalendar
          daily={daily}
          year={year}
          month={month}
          todayDate={todayDate}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-4 text-[10px] text-slate-600">
          <LegendDot cls="bg-slate-100" label="< 45 morte-eau" />
          <LegendDot cls="bg-amber-50" label="45–69 moyenne" />
          <LegendDot cls="bg-lime-200" label="70–79 vive-eau" />
          <LegendDot cls="bg-green-500" label="80–94 vive-eau +" />
          <LegendDot cls="bg-emerald-700" label="≥ 95 grande marée" />
        </div>
      </div>
    </div>
  );
}

function LegendDot({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-block w-2.5 h-2.5 rounded-sm border border-slate-200 ${cls}`}
      />
      <span>{label}</span>
    </span>
  );
}
