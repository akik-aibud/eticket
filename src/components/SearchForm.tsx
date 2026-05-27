"use client";

import { useEffect, useState } from "react";
import { Autocomplete } from "./Autocomplete";
import { loadRecents, loadFavorites, type RecentSearch } from "@/lib/storage";
import {
  type SearchOptions,
  type DateMode,
  type TimePref,
  TIME_LABELS,
} from "@/lib/search-types";

interface Props {
  stations: string[];
  initial: SearchOptions;
  searching: boolean;
  onSearch: (opts: SearchOptions) => void;
}

const DATE_MODES: { v: DateMode; label: string; hint: string }[] = [
  { v: "single", label: "Single", hint: "one date" },
  { v: "ranked", label: "Ranked", hint: "up to 3, in priority" },
  { v: "range", label: "Range", hint: "a span of days" },
];

const RANK_LABEL = ["1st choice", "2nd choice", "3rd choice"];

export function SearchForm({ stations, initial, searching, onSearch }: Props) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [passengers, setPassengers] = useState(initial.passengers);
  const [dateMode, setDateMode] = useState<DateMode>(initial.dateMode);
  const [dates, setDates] = useState<string[]>(initial.dates);
  const [timePref, setTimePref] = useState<TimePref>(initial.timePref);
  const [features, setFeatures] = useState(initial.features);
  const [showFeatures, setShowFeatures] = useState(false);

  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [favs, setFavs] = useState<Array<{ from: string; to: string }>>([]);

  // re-seed when parent pushes new initial (URL share link)
  useEffect(() => {
    setFrom(initial.from); setTo(initial.to); setPassengers(initial.passengers);
    setDateMode(initial.dateMode); setDates(initial.dates);
    setTimePref(initial.timePref); setFeatures(initial.features);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => { setRecents(loadRecents()); setFavs(loadFavorites()); }, [from, to]);

  const setDateAt = (i: number, v: string) =>
    setDates((d) => { const n = [...d]; while (n.length <= i) n.push(""); n[i] = v; return n; });

  const submit = () => {
    if (!from || !to) return;
    onSearch({ from, to, passengers, dateMode, dates: dates.filter(Boolean), timePref, features });
  };

  const dateCount = dateMode === "single" ? 1 : dateMode === "range" ? 2 : 3;
  const activeFeatures = Object.values(features).filter(Boolean).length;

  return (
    <section className="surface border rounded-2xl shadow-sm overflow-hidden">
      {/* Board-style header strip */}
      <div className="board px-5 py-3 flex items-center justify-between rounded-none">
        <div className="board-text text-sm font-semibold tracking-widest uppercase">▍ Plan a journey</div>
        <div className="board-text text-[11px] opacity-80 hidden sm:block">all classes · all stops · live</div>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        {/* From / swap / To */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <Field label="From">
            <Autocomplete value={from} onChange={setFrom} placeholder="e.g. Dhaka" options={stations} icon={<Pin />} />
          </Field>
          <div className="flex md:pb-1 justify-center">
            <button
              onClick={() => { setFrom(to); setTo(from); }}
              disabled={!from || !to}
              aria-label="Swap stations"
              className="p-2.5 rounded-xl border border-app text-muted hover:text-brand-500 hover:border-brand-400 disabled:opacity-40 transition-all hover:rotate-180 duration-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4"/></svg>
            </button>
          </div>
          <Field label="To">
            <Autocomplete value={to} onChange={setTo} placeholder="e.g. Chattogram" options={stations} icon={<Pin />} />
          </Field>
        </div>

        {/* Passengers + date mode */}
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
          <Field label="Passengers">
            <div className="inline-flex items-stretch rounded-xl border border-app overflow-hidden surface">
              <Stepper sign="−" onClick={() => setPassengers((p) => Math.max(1, p - 1))} />
              <span className="px-4 grid place-items-center tnum text-base min-w-[3rem]">{passengers}</span>
              <Stepper sign="+" onClick={() => setPassengers((p) => Math.min(20, p + 1))} />
            </div>
          </Field>
          <Field label="When">
            <div className="flex flex-wrap gap-1.5">
              {DATE_MODES.map((m) => (
                <button
                  key={m.v}
                  onClick={() => setDateMode(m.v)}
                  className={`px-3 py-2 rounded-xl text-sm transition-colors ${
                    dateMode === m.v ? "bg-brand-600 text-white" : "border border-app text-muted hover:border-brand-400"
                  }`}
                  title={m.hint}
                >{m.label}</button>
              ))}
            </div>
          </Field>
        </div>

        {/* Date inputs */}
        <div className={`grid gap-3 ${dateCount === 1 ? "md:grid-cols-1" : dateCount === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          {Array.from({ length: dateCount }).map((_, i) => (
            <Field
              key={i}
              label={dateMode === "ranked" ? RANK_LABEL[i] : dateMode === "range" ? (i === 0 ? "Start" : "End") : "Date"}
            >
              <input
                type="date"
                value={dates[i] || ""}
                onChange={(e) => setDateAt(i, e.target.value)}
                className="w-full px-3 py-2.5 surface border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/40 tnum"
              />
            </Field>
          ))}
        </div>

        {/* Time preference */}
        <Field label="Time preference (optional)">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(TIME_LABELS) as TimePref[]).map((t) => (
              <button
                key={t}
                onClick={() => setTimePref(t)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                  timePref === t ? "bg-brand-600 text-white" : "border border-app text-muted hover:border-brand-400"
                }`}
              >{TIME_LABELS[t]}</button>
            ))}
          </div>
        </Field>

        {/* Feature toggles */}
        <div className="rounded-xl border border-app">
          <button
            onClick={() => setShowFeatures((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm"
          >
            <span className="font-medium inline-flex items-center gap-2">
              <Spark /> Features
              <span className="text-xs text-muted">{activeFeatures} on</span>
            </span>
            <svg className={`transition-transform ${showFeatures ? "rotate-180" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {showFeatures && (
            <div className="px-4 pb-4 grid sm:grid-cols-2 gap-2 anim-in">
              <Toggle label="Smart split-ticket finder" desc="Buy multiple tickets to seat the journey" checked={features.splitFinder} onChange={(v) => setFeatures((f) => ({ ...f, splitFinder: v }))} />
              <Toggle label="Best-seat banner" desc="Auto-pick the top option for your party" checked={features.bestSeat} onChange={(v) => setFeatures((f) => ({ ...f, bestSeat: v }))} />
              <Toggle label="Scan all trains' matrices" desc="Heavier — every segment of every train" checked={features.scanAll} onChange={(v) => setFeatures((f) => ({ ...f, scanAll: v }))} />
              <Toggle label="AI suggestion" desc="What should I buy? — explained" checked={features.ai} onChange={(v) => setFeatures((f) => ({ ...f, ai: v }))} />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={submit}
            disabled={searching || !from || !to}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-ink-300 dark:disabled:bg-ink-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors glow-brand"
          >
            {searching ? (
              <><span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/> Searching…</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> Find seats</>
            )}
          </button>
          <span className="text-xs text-muted">Only <strong>From</strong> & <strong>To</strong> are required.</span>
        </div>

        {/* Favorites / recents */}
        {(favs.length > 0 || recents.length > 0) && (
          <div className="space-y-2 pt-1">
            {favs.length > 0 && (
              <Pills label="★ Favorites" items={favs.map((f) => `${f.from} → ${f.to}`)} values={favs}
                onPick={(v) => { setFrom(v.from); setTo(v.to); }} />
            )}
            {recents.length > 0 && (
              <Pills label="Recent" items={recents.map((r) => `${r.from} → ${r.to}`)} values={recents}
                onPick={(v) => { setFrom(v.from); setTo(v.to); }} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── small building blocks ─────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}
function Stepper({ sign, onClick }: { sign: string; onClick: () => void }) {
  return <button onClick={onClick} className="px-3 grid place-items-center text-lg text-muted hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors">{sign}</button>;
}
function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-2.5 text-left p-2.5 rounded-lg border transition-colors ${
        checked ? "border-brand-400 bg-brand-50/60 dark:bg-brand-900/20" : "border-app hover:border-brand-300"
      }`}
    >
      <span className={`mt-0.5 w-9 h-5 rounded-full shrink-0 relative transition-colors ${checked ? "bg-brand-600" : "bg-ink-300 dark:bg-ink-700"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">{label}</span>
        <span className="block text-[11px] text-muted leading-tight mt-0.5">{desc}</span>
      </span>
    </button>
  );
}
function Pills<T>({ label, items, values, onPick }: { label: string; items: string[]; values: T[]; onPick: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-muted shrink-0">{label}:</span>
      {items.map((it, i) => (
        <button key={i} onClick={() => onPick(values[i])}
          className="text-xs px-2.5 py-1 rounded-full border border-app text-muted hover:text-brand-600 dark:hover:text-brand-300 hover:border-brand-400 transition-colors">{it}</button>
      ))}
    </div>
  );
}
function Pin() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 0 0-8-8z"/></svg>;
}
function Spark() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/></svg>;
}
