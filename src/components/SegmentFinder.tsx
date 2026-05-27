"use client";

import { useMemo, useState } from "react";
import { findCombos, findPartialCoverage, type Combo, type MatrixData } from "@/lib/segment";
import { bdt } from "@/lib/format";
import { SeatBadge } from "./SeatBadge";

interface Props {
  matrix: MatrixData;
  from: string;
  to: string;
  trainName: string;
  date: string;
}

export function SegmentFinder({ matrix, from, to, trainName, date }: Props) {
  const [preferred, setPreferred] = useState<string>("");
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const fromIdx = matrix.stations.indexOf(from);
  const toIdx = matrix.stations.indexOf(to);
  const intermediate = useMemo(
    () => fromIdx >= 0 && toIdx > fromIdx ? matrix.stations.slice(fromIdx, toIdx + 1) : [],
    [matrix.stations, fromIdx, toIdx]
  );

  const combos = useMemo(
    () => findCombos(matrix, from, to, preferred || undefined),
    [matrix, from, to, preferred]
  );
  const partials = useMemo(
    () => findPartialCoverage(matrix, from, to, preferred || undefined),
    [matrix, from, to, preferred]
  );

  const direct = combos.find((c) => c.hops === 0);
  const splits = combos.filter((c) => c.hops > 0);

  if (fromIdx < 0 || toIdx < 0) {
    return (
      <div className="text-sm text-muted">
        Route does not pass through {from} → {to}. This train serves: {matrix.stations.join(", ")}.
      </div>
    );
  }

  const askAI = async () => {
    setAiLoading(true); setAiError(""); setAiText("");
    try {
      const resp = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainName,
          from, to, date,
          directAvailable: !!direct && direct.minOnline > 0,
          combos: combos.map((c) => ({
            legs: c.legs, totalFare: c.totalFare, minOnline: c.minOnline, hops: c.hops, gapStations: c.gapStations,
          })),
          partials: partials.map((c) => ({
            legs: c.legs, totalFare: c.totalFare, minOnline: c.minOnline, hops: c.hops, gapStations: c.gapStations,
          })),
          intermediateStations: intermediate,
        }),
      });
      const data = await resp.json();
      if (data.error) setAiError(data.error);
      else setAiText(data.text || "");
    } catch (e) {
      setAiError((e as Error).message);
    } finally { setAiLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Prefer class:</span>
        <button
          onClick={() => setPreferred("")}
          className={`px-2.5 py-1 rounded-full text-xs ${preferred === "" ? "bg-brand-600 text-white" : "surface border text-muted hover:bg-ink-100 dark:hover:bg-ink-800/60"}`}
        >Any / cheapest</button>
        {matrix.seat_types.map((st) => (
          <button
            key={st}
            onClick={() => setPreferred(st)}
            className={`px-2.5 py-1 rounded-full text-xs ${preferred === st ? "bg-brand-600 text-white" : "surface border text-muted hover:bg-ink-100 dark:hover:bg-ink-800/60"}`}
          >{st}</button>
        ))}
      </div>

      {/* Direct option */}
      {direct ? (
        <ComboCard combo={direct} kind="direct" />
      ) : (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm">
          <strong className="text-amber-800 dark:text-amber-200">No direct {preferred || ""} ticket available</strong>
          <span className="text-amber-700 dark:text-amber-300"> for {from} → {to}. See split options below.</span>
        </div>
      )}

      {/* Split combos */}
      {splits.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold">Split-ticket alternatives</h4>
            <span className="text-xs text-muted">— buy multiple tickets on the same train</span>
          </div>
          <div className="space-y-2">
            {splits.slice(0, 4).map((c, i) => <ComboCard key={i} combo={c} kind="split" />)}
          </div>
        </div>
      )}

      {/* Partial coverage */}
      {!direct && splits.length === 0 && partials.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold">Partial coverage (stand-through gap)</h4>
            <span className="text-xs text-rose-600 dark:text-rose-400">— risky: TTE may fine</span>
          </div>
          <div className="space-y-2">
            {partials.slice(0, 3).map((c, i) => <ComboCard key={i} combo={c} kind="partial" />)}
          </div>
        </div>
      )}

      {/* AI button */}
      <div className="pt-2 border-t border-app">
        <button
          onClick={askAI}
          disabled={aiLoading}
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white disabled:opacity-60"
        >
          {aiLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/><path d="M19 14v4M17 16h4M5 18v3M3.5 19.5h3"/></svg>
          )}
          {aiLoading ? "Thinking…" : "AI suggestion: what should I buy?"}
        </button>
        {aiError && <p className="text-xs text-rose-600 mt-2">{aiError}</p>}
        {aiText && (
          <div className="mt-3 rounded-xl border border-violet-300 dark:border-violet-700/60 bg-violet-50 dark:bg-violet-950/30 p-4 text-sm whitespace-pre-wrap anim-in">
            {aiText}
          </div>
        )}
      </div>
    </div>
  );
}

function ComboCard({ combo, kind }: { combo: Combo; kind: "direct" | "split" | "partial" }) {
  const ringColor =
    kind === "direct" ? "border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/60 dark:bg-emerald-950/30"
    : kind === "split" ? "border-app surface"
    : "border-rose-300 dark:border-rose-700/60 bg-rose-50/60 dark:bg-rose-950/30";

  const label =
    kind === "direct" ? "Direct" :
    kind === "split" ? `Split (${combo.hops + 1} tickets)` :
    "Partial";

  return (
    <div className={`rounded-xl border p-3 ${ringColor}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
            kind === "direct" ? "bg-emerald-600 text-white" : kind === "split" ? "bg-brand-600 text-white" : "bg-rose-600 text-white"
          }`}>{label}</span>
          <SeatBadge online={combo.minOnline} />
        </div>
        <div className="text-sm font-semibold">{bdt(combo.totalFare)}</div>
      </div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
        {combo.legs.map((l, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-muted">→</span>}
            <span className="font-medium">{l.from}</span>
            <span className="text-muted">→</span>
            <span className="font-medium">{l.to}</span>
            <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/70 dark:bg-ink-900/40 text-[10px] border border-app">
              {l.seatClass}
              <span className="text-muted">·</span>
              <span>৳{l.fare}</span>
              <span className="text-muted">·</span>
              <SeatBadge online={l.online} size="xs" />
            </span>
          </span>
        ))}
      </div>
      {combo.gapStations.length > 0 && (
        <p className="text-xs text-rose-700 dark:text-rose-300 mt-2">
          Unticketed gap: {combo.gapStations.join(", ")} — you would be standing without a valid ticket on this stretch.
        </p>
      )}
    </div>
  );
}
