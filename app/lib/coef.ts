// Color ramp and labels for the French tide coefficient.
// High values are visually dominant (green → emerald) since those are the
// tides sailors and fishermen actually care about.

export type CoefTier = {
  cell: string; // Tailwind bg + text classes
  short: string; // 2–3 char label
  label: string; // French long label
};

export function coefTier(coef: number): CoefTier {
  if (coef >= 95)
    return {
      cell: "bg-emerald-700 text-white",
      short: "GM",
      label: "Grande marée",
    };
  if (coef >= 80)
    return {
      cell: "bg-green-500 text-white",
      short: "VE+",
      label: "Vive-eau forte",
    };
  if (coef >= 70)
    return {
      cell: "bg-lime-200 text-lime-900",
      short: "VE",
      label: "Vive-eau",
    };
  if (coef >= 45)
    return {
      cell: "bg-amber-50 text-amber-800",
      short: "MY",
      label: "Moyenne",
    };
  return {
    cell: "bg-slate-100 text-slate-500",
    short: "ME",
    label: "Morte-eau",
  };
}

export function coefLabel(coef: number): string {
  return coefTier(coef).label;
}
