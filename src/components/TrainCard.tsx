"use client";

import { useCallback, useState } from "react";
import type { Creds } from "@/lib/storage";
import type { MatrixData } from "@/lib/segment";
import { formatTime, bdt } from "@/lib/format";
import { SeatBadge } from "./SeatBadge";
import { RouteMatrix } from "./RouteMatrix";
import { SegmentFinder } from "./SegmentFinder";

export interface SeatInfo {
  type: string; fare: number; vat: number; online: number; offline: number;
}
export interface TrainResult {
  trip_id: string;
  trip_number: string;
  train_name: string;
  departure: string;
  arrival: string;
  travel_time: string;
  seats: Record<string, SeatInfo>;
}

type Tab = "overview" | "matrix" | "finder";

export function TrainCard({
  train, creds, date, from, to,
}: {
  train: TrainResult; creds: Creds; date: string; from: string; to: string;
}) {
  const [tab, setTab] = useState<Tab | null>(null);
  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const seatList = Object.values(train.seats);

  const totalOnline = seatList.reduce((s, x) => s + x.online, 0);
  const minFare = seatList.filter((s) => s.fare > 0).reduce((m, s) => Math.min(m, s.fare), Infinity);

  const open = useCallback(async (next: Tab) => {
    if (tab === next) { setTab(null); return; }
    setTab(next);
    if ((next === "matrix" || next === "finder") && !matrix) {
      setLoading(true); setError("");
      try {
        const resp = await fetch("/api/matrix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...creds, train_model: train.train_name, trip_number: train.trip_number, date }),
        });
        const data = await resp.json();
        if (data.error) setError(data.error);
        else setMatrix(data);
      } catch (e) { setError((e as Error).message); }
      finally { setLoading(false); }
    }
  }, [tab, matrix, creds, train, date]);

  return (
    <div className="surface border rounded-2xl overflow-hidden anim-in shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="font-semibold text-base md:text-lg truncate">{train.train_name}</h3>
              <span className="text-muted text-xs">#{train.trip_number}</span>
            </div>
            <div className="text-sm text-muted mt-1">
              <span className="font-medium text-current">{formatTime(train.departure)}</span>
              <span className="mx-2">→</span>
              <span className="font-medium text-current">{formatTime(train.arrival)}</span>
              {train.travel_time && <span className="ml-2">({train.travel_time})</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="text-xs text-muted">From</div>
              <div className="font-semibold text-sm">{minFare === Infinity ? "-" : bdt(minFare)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Seats</div>
              <div><SeatBadge online={totalOnline} /></div>
            </div>
          </div>
        </div>

        {seatList.length > 0 && (
          <div className="overflow-x-auto thin-scroll -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-app">
                  <th className="py-2 px-2 font-medium text-xs uppercase tracking-wide">Class</th>
                  <th className="py-2 px-2 font-medium text-xs uppercase tracking-wide">Fare</th>
                  <th className="py-2 px-2 font-medium text-xs uppercase tracking-wide">Online</th>
                  <th className="py-2 px-2 font-medium text-xs uppercase tracking-wide">Offline</th>
                  <th className="py-2 px-2 font-medium text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {seatList.map((s) => (
                  <tr key={s.type} className="border-b border-app/60 last:border-0">
                    <td className="py-1.5 px-2 font-medium">{s.type}</td>
                    <td className="py-1.5 px-2">
                      {s.fare ? bdt(s.fare) : "-"}
                      {s.vat > 0 && <span className="text-muted text-xs ml-1">+৳{s.vat}</span>}
                    </td>
                    <td className="py-1.5 px-2">{s.online}</td>
                    <td className="py-1.5 px-2">{s.offline}</td>
                    <td className="py-1.5 px-2"><SeatBadge online={s.online} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          <TabBtn active={tab === "matrix"} onClick={() => open("matrix")}>Route Matrix</TabBtn>
          <TabBtn active={tab === "finder"} onClick={() => open("finder")}>
            <span className="inline-flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/></svg>
              Smart Finder
            </span>
          </TabBtn>
        </div>
      </div>

      {tab && (
        <div className="border-t border-app bg-ink-50/40 dark:bg-ink-900/40 p-4 md:p-5 anim-in">
          {loading && <Skeleton />}
          {error && <div className="text-rose-600 text-sm">{error}</div>}
          {!loading && matrix && tab === "matrix" && <RouteMatrix matrix={matrix} />}
          {!loading && matrix && tab === "finder" && (
            <SegmentFinder
              matrix={matrix}
              from={from}
              to={to}
              trainName={train.train_name}
              date={date}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
        active
          ? "bg-brand-600 text-white"
          : "border border-app text-muted hover:bg-ink-100 dark:hover:bg-ink-800/60"
      }`}
    >
      {children}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      <div className="h-6 w-32 skeleton" />
      <div className="h-32 w-full skeleton" />
      <p className="text-sm text-muted">Fetching all station pairs…</p>
    </div>
  );
}
