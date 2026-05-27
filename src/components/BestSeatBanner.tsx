"use client";

import { useMemo } from "react";
import type { TrainResult } from "./TrainCard";
import { bdt, formatTime } from "@/lib/format";

interface DateResult { date: string; priority: number; trains: TrainResult[]; }
interface Props { results: DateResult[]; passengers: number; from: string; to: string; }

interface Pick {
  date: string; priority: number;
  train: TrainResult; cls: string; fare: number; online: number;
}

const CLASS_RANK = ["S_CHAIR", "SHOVAN", "SHULOV", "SNIGDHA", "AC_CHAIR", "AC_S", "AC_B", "F_CHAIR", "F_SEAT", "F_BERTH"];

export function BestSeatBanner({ results, passengers, from, to }: Props) {
  const picks = useMemo<Pick[]>(() => {
    const all: Pick[] = [];
    for (const r of results) {
      for (const t of r.trains) {
        for (const s of Object.values(t.seats)) {
          if (s.online >= passengers) {
            all.push({ date: r.date, priority: r.priority, train: t, cls: s.type, fare: s.fare, online: s.online });
          }
        }
      }
    }
    // rank: top date priority → cheapest fare → most seats → class comfort tiebreak
    all.sort((a, b) =>
      a.priority - b.priority ||
      a.fare - b.fare ||
      b.online - a.online ||
      CLASS_RANK.indexOf(a.cls) - CLASS_RANK.indexOf(b.cls)
    );
    // de-dupe: one pick per train+date (keep cheapest seatable)
    const seen = new Set<string>();
    const out: Pick[] = [];
    for (const p of all) {
      const k = `${p.date}|${p.train.trip_number}`;
      if (seen.has(k)) continue;
      seen.add(k); out.push(p);
      if (out.length >= 3) break;
    }
    return out;
  }, [results, passengers]);

  const dateLabel = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  if (picks.length === 0) {
    return (
      <div className="board rounded-2xl p-5 anim-in">
        <div className="board-text text-xs uppercase tracking-widest mb-1">Best for {passengers} {passengers > 1 ? "seats" : "seat"}</div>
        <p className="board-text text-sm leading-relaxed">
          No single class has {passengers}+ seats together on {from} → {to}.
          Try the <span className="underline">Smart split-ticket finder</span> on a train below, or enable <span className="underline">Scan all</span> to seat the journey in segments.
        </p>
      </div>
    );
  }

  const [top, ...rest] = picks;
  return (
    <div className="board rounded-2xl p-5 anim-in">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="board-text text-xs uppercase tracking-widest">★ Best pick for {passengers} {passengers > 1 ? "seats" : "seat"}</div>
          <div className="board-text text-2xl font-bold mt-1 flap">{top.train.train_name}</div>
        </div>
        <div className="text-right">
          <div className="board-text text-2xl font-bold tnum">{bdt(top.fare)}</div>
          <div className="board-text text-[11px] opacity-70">per seat · {top.cls}</div>
        </div>
      </div>
      <div className="board-text text-sm flex flex-wrap gap-x-4 gap-y-1">
        <span>📅 {dateLabel(top.date)}</span>
        <span>🕑 {formatTime(top.train.departure)} → {formatTime(top.train.arrival)}</span>
        <span>🪑 {top.online} online</span>
      </div>

      {rest.length > 0 && (
        <div className="mt-4 pt-3 border-t border-board-400/20 grid sm:grid-cols-2 gap-2">
          {rest.map((p, i) => (
            <div key={i} className="board-text text-xs flex items-center justify-between gap-2 opacity-90">
              <span className="truncate">{p.train.train_name} · {dateLabel(p.date)}</span>
              <span className="tnum shrink-0">{p.cls} · {bdt(p.fare)} · {p.online}🪑</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
