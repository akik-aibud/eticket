// Shared types for the rich, optional search controls.

export type DateMode = "single" | "ranked" | "range";
export type TimePref = "any" | "morning" | "afternoon" | "evening" | "night";

export interface FeatureToggles {
  splitFinder: boolean; // per-train split-ticket / partial-coverage finder
  scanAll: boolean;     // fetch every train's full segment matrix (heavy)
  bestSeat: boolean;    // top-pick summary banner
  ai: boolean;          // AI "what should I buy?" route summary
}

export interface SearchOptions {
  from: string;
  to: string;
  passengers: number;
  dateMode: DateMode;
  /** YYYY-MM-DD. single: [d]; ranked: priority order; range: [start, end]. */
  dates: string[];
  timePref: TimePref;
  features: FeatureToggles;
}

export const DEFAULT_FEATURES: FeatureToggles = {
  splitFinder: true,
  scanAll: false,
  bestSeat: true,
  ai: false,
};

export const TIME_WINDOWS: Record<Exclude<TimePref, "any">, [number, number]> = {
  morning: [5, 12],
  afternoon: [12, 17],
  evening: [17, 21],
  night: [21, 29], // 21:00–05:00 (wraps past midnight, handled mod 24)
};

export const TIME_LABELS: Record<TimePref, string> = {
  any: "Any time",
  morning: "Morning · 5–12",
  afternoon: "Afternoon · 12–17",
  evening: "Evening · 17–21",
  night: "Night · 21–5",
};

/** Expand a SearchOptions' date config into the concrete list to query. */
export function expandDates(mode: DateMode, dates: string[], maxRange = 7): string[] {
  const clean = dates.filter(Boolean);
  if (mode === "single") return clean.slice(0, 1);
  if (mode === "ranked") return clean.slice(0, 3);
  // range
  if (clean.length < 2) return clean.slice(0, 1);
  const [start, end] = clean;
  const out: string[] = [];
  const d = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (d <= last && out.length < maxRange) {
    out.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  return out.length ? out : clean.slice(0, 1);
}

/** Does a departure ISO/string fall inside the chosen time window? */
export function matchesTimePref(departure: string, pref: TimePref): boolean {
  if (pref === "any") return true;
  let hour: number;
  try {
    hour = new Date(departure).getHours();
  } catch {
    return true;
  }
  const [lo, hi] = TIME_WINDOWS[pref];
  // window may wrap past midnight (night = 21..29 → 21:00–04:59)
  const h = hour < 5 ? hour + 24 : hour;
  return h >= lo && h < hi;
}
