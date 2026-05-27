"use client";

import { useMemo, useState } from "react";
import { TrainCard, type TrainResult } from "./TrainCard";
import { isFavorite, toggleFavorite, type Creds } from "@/lib/storage";
import { travelMinutes } from "@/lib/format";

type Sort = "departure" | "fastest" | "cheapest" | "available";

interface Props {
  trains: TrainResult[];
  creds: Creds;
  date: string;
  from: string;
  to: string;
  passengers?: number;
}

const SORTS: { value: Sort; label: string }[] = [
  { value: "departure", label: "Departure" },
  { value: "fastest", label: "Fastest" },
  { value: "cheapest", label: "Cheapest" },
  { value: "available", label: "Most seats" },
];

export function TrainResults({ trains, creds, date, from, to, passengers = 1 }: Props) {
  const [sort, setSort] = useState<Sort>("departure");
  const [hideFull, setHideFull] = useState(false);
  const [needSeats, setNeedSeats] = useState(false);
  const [classFilter, setClassFilter] = useState<string>("");
  const [favVer, setFavVer] = useState(0);

  const seatableCount = useMemo(
    () => trains.filter((t) => Object.values(t.seats).some((s) => s.online >= passengers)).length,
    [trains, passengers]
  );

  const allClasses = useMemo(() => {
    const set = new Set<string>();
    for (const t of trains) for (const s of Object.values(t.seats)) set.add(s.type);
    return Array.from(set);
  }, [trains]);

  const sorted = useMemo(() => {
    const arr = [...trains];
    if (classFilter) {
      // keep trains where the chosen class has online > 0 (unless hideFull is off — still show full ones)
      // For class filter we don't strip if not full requested
    }
    arr.sort((a, b) => {
      if (sort === "departure") return new Date(a.departure).getTime() - new Date(b.departure).getTime();
      if (sort === "fastest") return travelMinutes(a.travel_time) - travelMinutes(b.travel_time);
      if (sort === "cheapest") {
        const fa = Math.min(...Object.values(a.seats).map((s) => s.fare || Infinity));
        const fb = Math.min(...Object.values(b.seats).map((s) => s.fare || Infinity));
        return fa - fb;
      }
      // available
      const oa = Object.values(a.seats).reduce((s, x) => s + x.online, 0);
      const ob = Object.values(b.seats).reduce((s, x) => s + x.online, 0);
      return ob - oa;
    });
    return arr;
  }, [trains, sort, classFilter]);

  const filtered = sorted.filter((t) => {
    if (needSeats && !Object.values(t.seats).some((s) => s.online >= passengers)) return false;
    if (classFilter) {
      const s = t.seats[classFilter];
      if (!s) return false;
      if (hideFull && s.online <= 0) return false;
    } else if (hideFull) {
      const total = Object.values(t.seats).reduce((s, x) => s + x.online, 0);
      if (total <= 0) return false;
    }
    return true;
  });

  const fav = useMemo(() => isFavorite(from, to), [from, to, favVer]);

  return (
    <div className="surface border rounded-2xl shadow-sm">
      <div className="px-5 md:px-6 pt-5 pb-3 border-b border-app">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg truncate">{from} → {to}</h2>
              <button
                onClick={() => { toggleFavorite(from, to); setFavVer((n) => n + 1); }}
                aria-label={fav ? "Unfavorite route" : "Favorite route"}
                className={`p-1 ${fav ? "text-amber-500" : "text-ink-300 hover:text-amber-500"}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
            </div>
            <p className="text-xs text-muted">{date} · {filtered.length} of {trains.length} train(s)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted">Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="surface border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <label className="inline-flex items-center gap-1.5 text-xs text-muted ml-1">
              <input type="checkbox" checked={hideFull} onChange={(e) => setHideFull(e.target.checked)} className="rounded" />
              Hide full
            </label>
            {passengers > 1 && (
              <button
                onClick={() => setNeedSeats((v) => !v)}
                className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${needSeats ? "bg-brand-600 text-white" : "border border-app text-muted hover:border-brand-400"}`}
                title={`${seatableCount} train(s) have ${passengers}+ seats in one class`}
              >≥{passengers} seats ({seatableCount})</button>
            )}
          </div>
        </div>

        {allClasses.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <button
              onClick={() => setClassFilter("")}
              className={`text-[11px] px-2 py-0.5 rounded-full ${classFilter === "" ? "bg-brand-600 text-white" : "border border-app text-muted hover:bg-ink-100 dark:hover:bg-ink-800/60"}`}
            >All classes</button>
            {allClasses.map((c) => (
              <button
                key={c}
                onClick={() => setClassFilter(c === classFilter ? "" : c)}
                className={`text-[11px] px-2 py-0.5 rounded-full ${c === classFilter ? "bg-brand-600 text-white" : "border border-app text-muted hover:bg-ink-100 dark:hover:bg-ink-800/60"}`}
              >{c}</button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 md:p-5 space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted py-8 text-sm">No trains match your filters.</p>
        ) : (
          filtered.map((t) => (
            <TrainCard
              key={t.trip_id || t.trip_number}
              train={t}
              creds={creds}
              date={date}
              from={from}
              to={to}
            />
          ))
        )}
      </div>
    </div>
  );
}
