"use client";

import { useState } from "react";
import type { MatrixData } from "@/lib/segment";
import { SeatBadge } from "./SeatBadge";

export function RouteMatrix({ matrix }: { matrix: MatrixData }) {
  const [selectedClass, setSelectedClass] = useState(matrix.seat_types[0] ?? "");

  const seatLookup = new Map<string, { online: number; offline: number; fare: number }>();
  for (const seg of matrix.segments) {
    const s = seg.seats[selectedClass];
    if (s) seatLookup.set(`${seg.from}→${seg.to}`, s);
  }

  if (matrix.seat_types.length === 0) {
    return <p className="text-sm text-muted">No segment data available.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        {matrix.seat_types.map((st) => (
          <button
            key={st}
            onClick={() => setSelectedClass(st)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              selectedClass === st
                ? "bg-brand-600 text-white"
                : "surface border text-muted hover:bg-ink-100 dark:hover:bg-ink-800/60"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto thin-scroll rounded-lg border border-app">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 surface px-2.5 py-2 text-left font-semibold text-muted border-r border-app min-w-[110px]">From \ To</th>
              {matrix.stations.map((s) => (
                <th key={s} className="px-2 py-2 font-semibold border-b border-app whitespace-nowrap">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.stations.map((from, fi) => (
              <tr key={from}>
                <td className="sticky left-0 z-10 surface px-2.5 py-2 font-semibold text-muted border-r border-t border-app whitespace-nowrap">{from}</td>
                {matrix.stations.map((to, ti) => {
                  if (ti <= fi) {
                    return <td key={to} className="px-2 py-2 border-t border-app text-center text-ink-300 dark:text-ink-700">·</td>;
                  }
                  const seat = seatLookup.get(`${from}→${to}`);
                  const online = seat?.online || 0;
                  const fare = seat?.fare || 0;
                  return (
                    <td
                      key={to}
                      className={`px-2 py-1.5 border-t border-app text-center ${
                        online > 10
                          ? "bg-emerald-50 dark:bg-emerald-950/40"
                          : online > 0
                          ? "bg-amber-50 dark:bg-amber-950/40"
                          : "bg-rose-50/60 dark:bg-rose-950/30"
                      }`}
                    >
                      <div className="font-bold text-[11px]"><SeatBadge online={online} size="xs" /></div>
                      {fare > 0 && <div className="text-[10px] text-muted mt-0.5">৳{fare}</div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {matrix.route_info?.days && (
        <p className="text-xs text-muted mt-3">
          Runs: {matrix.route_info.days} · Duration: {matrix.route_info.duration}
        </p>
      )}
    </>
  );
}
