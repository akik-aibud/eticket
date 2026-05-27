"use client";

import { useState } from "react";
import type { Creds } from "@/lib/storage";
import type { TrainResult } from "./TrainCard";
import { findCombos, findPartialCoverage, type Combo, type MatrixData } from "@/lib/segment";
import { bdt } from "@/lib/format";
import { SeatBadge } from "./SeatBadge";

interface Props {
  trains: TrainResult[];
  creds: Creds;
  date: string; // API format
  from: string;
  to: string;
  aiEnabled: boolean;
}

interface TrainScan {
  name: string;
  best: Combo | null;
  kind: "direct" | "split" | "partial" | "none";
  matrix: MatrixData;
}

const MAX_TRAINS = 12;

export function ScanAll({ trains, creds, date, from, to, aiEnabled }: Props) {
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(0);
  const [scans, setScans] = useState<TrainScan[]>([]);
  const [started, setStarted] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const targets = trains.slice(0, MAX_TRAINS);

  const run = async () => {
    setScanning(true); setStarted(true); setScans([]); setDone(0); setAiText("");
    const out: TrainScan[] = [];
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      try {
        const resp = await fetch("/api/matrix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...creds, train_model: t.train_name, trip_number: t.trip_number, date }),
        });
        const matrix = await resp.json();
        if (matrix?.stations) {
          const combos = findCombos(matrix, from, to);
          const partials = findPartialCoverage(matrix, from, to);
          const directOrSplit = combos[0] || null;
          let best: Combo | null = directOrSplit;
          let kind: TrainScan["kind"] = directOrSplit ? (directOrSplit.hops === 0 ? "direct" : "split") : "none";
          if (!best && partials[0]) { best = partials[0]; kind = "partial"; }
          out.push({ name: t.train_name, best, kind, matrix });
        } else {
          out.push({ name: t.train_name, best: null, kind: "none", matrix: { stations: [], segments: [], seat_types: [], route_info: { days: "", duration: "" } } });
        }
      } catch {
        out.push({ name: t.train_name, best: null, kind: "none", matrix: { stations: [], segments: [], seat_types: [], route_info: { days: "", duration: "" } } });
      }
      setDone(i + 1);
      setScans([...out].sort(byBest));
    }
    setScanning(false);
  };

  const askAI = async () => {
    const candidate = scans.find((s) => s.kind !== "none");
    if (!candidate) return;
    setAiLoading(true); setAiText("");
    try {
      const combos = findCombos(candidate.matrix, from, to);
      const partials = findPartialCoverage(candidate.matrix, from, to);
      const fromIdx = candidate.matrix.stations.indexOf(from);
      const toIdx = candidate.matrix.stations.indexOf(to);
      const resp = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainName: candidate.name, from, to, date,
          directAvailable: combos.some((c) => c.hops === 0 && c.minOnline > 0),
          combos: combos.map((c) => ({ legs: c.legs, totalFare: c.totalFare, minOnline: c.minOnline, hops: c.hops, gapStations: c.gapStations })),
          partials: partials.map((c) => ({ legs: c.legs, totalFare: c.totalFare, minOnline: c.minOnline, hops: c.hops, gapStations: c.gapStations })),
          intermediateStations: fromIdx >= 0 && toIdx > fromIdx ? candidate.matrix.stations.slice(fromIdx, toIdx + 1) : [],
        }),
      });
      const data = await resp.json();
      setAiText(data.error ? `AI: ${data.error}` : data.text || "");
    } catch (e) { setAiText("AI: " + (e as Error).message); } finally { setAiLoading(false); }
  };

  return (
    <div className="surface border rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-bold text-lg">Deep scan — seat the whole journey</h3>
          <p className="text-xs text-muted">Fetches every train&apos;s full segment matrix and finds direct / split / stand-through options. Heavier.</p>
        </div>
        {!scanning && (
          <button onClick={run} className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-xl glow-brand">
            {started ? "Re-scan" : `Scan ${targets.length} trains`}
          </button>
        )}
      </div>

      {scanning && (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${(done / targets.length) * 100}%` }} />
          </div>
          <p className="text-xs text-muted mt-2">Scanned {done}/{targets.length}… (throttled to dodge rate limits)</p>
        </div>
      )}

      {scans.length > 0 && (
        <div className="mt-4 space-y-2">
          {scans.map((s, i) => <ScanRow key={i} scan={s} />)}
        </div>
      )}

      {aiEnabled && !scanning && scans.some((s) => s.kind !== "none") && (
        <div className="mt-4 pt-3 border-t border-app">
          <button onClick={askAI} disabled={aiLoading}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl bg-board-500 hover:bg-board-400 text-ink-900 disabled:opacity-60">
            {aiLoading ? "Thinking…" : "AI: what should I buy?"}
          </button>
          {aiText && <div className="mt-3 rounded-xl border border-board-400/40 bg-board-500/10 p-4 text-sm whitespace-pre-wrap anim-in">{aiText}</div>}
        </div>
      )}
    </div>
  );
}

function byBest(a: TrainScan, b: TrainScan) {
  const rank = { direct: 0, split: 1, partial: 2, none: 3 };
  if (rank[a.kind] !== rank[b.kind]) return rank[a.kind] - rank[b.kind];
  return (a.best?.totalFare ?? Infinity) - (b.best?.totalFare ?? Infinity);
}

function ScanRow({ scan }: { scan: TrainScan }) {
  const c = scan.best;
  const tag = scan.kind === "direct" ? ["Direct", "bg-emerald-600"]
    : scan.kind === "split" ? [`Split ×${(c?.hops ?? 0) + 1}`, "bg-brand-600"]
    : scan.kind === "partial" ? ["Partial", "bg-rose-600"]
    : ["Sold out", "bg-ink-400"];
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-app px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-white ${tag[1]}`}>{tag[0]}</span>
          <span className="font-medium text-sm truncate">{scan.name}</span>
        </div>
        {c && (
          <div className="text-xs text-muted mt-1 truncate">
            {c.legs.map((l, i) => <span key={i}>{i > 0 ? " → " : ""}{l.from}→{l.to} <span className="tnum">({l.seatClass})</span></span>)}
            {c.gapStations.length > 0 && <span className="text-rose-500"> · stand: {c.gapStations.length} stop(s)</span>}
          </div>
        )}
      </div>
      {c && (
        <div className="text-right shrink-0">
          <div className="font-semibold text-sm tnum">{bdt(c.totalFare)}</div>
          <SeatBadge online={c.minOnline} size="xs" />
        </div>
      )}
    </div>
  );
}
