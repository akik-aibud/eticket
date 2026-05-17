"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import stationsData from "@/lib/stations.json";

const STATIONS: string[] = stationsData.stations;

interface Creds {
  token: string;
  ssdk: string;
  uuid: string;
}

interface SeatInfo {
  type: string;
  fare: number;
  vat: number;
  online: number;
  offline: number;
}

interface TrainResult {
  trip_id: string;
  trip_number: string;
  train_name: string;
  departure: string;
  arrival: string;
  travel_time: string;
  seats: Record<string, SeatInfo>;
}

interface SegmentSeat { online: number; offline: number; fare: number; }
interface Segment { from: string; to: string; seats: Record<string, SegmentSeat>; }
interface MatrixData {
  stations: string[];
  segments: Segment[];
  seat_types: string[];
  route_info: { days: string; duration: string };
}

function formatTime(dt: string) {
  if (!dt) return "-";
  try { return new Date(dt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }); }
  catch { return dt; }
}

function formatDateForApi(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getDate()).padStart(2, "0")}-${m[d.getMonth()]}-${d.getFullYear()}`;
}

function getTomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/* ── Autocomplete ─────────────────────────── */
function Autocomplete({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const matches = value ? STATIONS.filter((s) => s.toLowerCase().includes(value.toLowerCase())).slice(0, 12) : [];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input type="text" value={value} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActiveIdx(-1); }}
        onFocus={() => value && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
          else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); onChange(matches[activeIdx]); setOpen(false); }
        }}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {matches.map((s, i) => (
            <div key={s} className={`px-3 py-2 cursor-pointer text-sm ${i === activeIdx ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"}`}
              onMouseDown={() => { onChange(s); setOpen(false); }}>{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SeatBadge({ online }: { online: number }) {
  if (online > 5) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{online}</span>;
  if (online > 0) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">{online}</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">0</span>;
}

/* ── Train card with expandable matrix ────── */
function TrainCard({ train, creds, date }: { train: TrainResult; creds: Creds; date: string; }) {
  const [expanded, setExpanded] = useState(false);
  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const seatList = Object.values(train.seats);

  const loadMatrix = useCallback(async () => {
    if (matrix) { setExpanded(!expanded); return; }
    setExpanded(true); setLoading(true); setError("");
    try {
      const resp = await fetch("/api/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...creds, train_model: train.train_name, trip_number: train.trip_number, date }),
      });
      const data = await resp.json();
      if (data.error) setError(data.error);
      else { setMatrix(data); if (data.seat_types?.length) setSelectedClass(data.seat_types[0]); }
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [matrix, expanded, creds, train, date]);

  const seatLookup = new Map<string, SegmentSeat>();
  if (matrix) {
    for (const seg of matrix.segments) {
      const s = seg.seats[selectedClass];
      if (s) seatLookup.set(`${seg.from}→${seg.to}`, s);
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <span className="font-semibold">{train.train_name}</span>
            <span className="text-slate-400 text-sm ml-2">#{train.trip_number}</span>
          </div>
          <div className="text-slate-600 text-sm">
            {formatTime(train.departure)} → {formatTime(train.arrival)}
            {train.travel_time && <span className="text-slate-400 ml-2">({train.travel_time})</span>}
          </div>
        </div>
        {seatList.length > 0 && (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="pb-2 pr-4 font-medium">Class</th>
                <th className="pb-2 pr-4 font-medium">Fare</th>
                <th className="pb-2 pr-4 font-medium">Online</th>
                <th className="pb-2 pr-4 font-medium">Offline</th>
                <th className="pb-2 font-medium">Status</th>
              </tr></thead>
              <tbody>{seatList.map((s) => (
                <tr key={s.type} className="border-b border-slate-50">
                  <td className="py-1.5 pr-4 font-medium">{s.type}</td>
                  <td className="py-1.5 pr-4">{s.fare ? `৳${s.fare}` : "-"}{s.vat > 0 && <span className="text-slate-400 text-xs ml-1">+৳{s.vat}</span>}</td>
                  <td className="py-1.5 pr-4">{s.online}</td>
                  <td className="py-1.5 pr-4">{s.offline}</td>
                  <td className="py-1.5"><SeatBadge online={s.online} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <button onClick={loadMatrix} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          {loading ? "Loading route matrix..." : expanded ? "Hide Route Matrix" : "Show Route Matrix (all stops)"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-4">
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-2" />
              <p className="text-slate-500 text-sm">Fetching all station pairs...</p>
            </div>
          )}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {matrix && !loading && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {matrix.seat_types.map((st) => (
                  <button key={st} onClick={() => setSelectedClass(st)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      selectedClass === st ? "bg-blue-600 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"
                    }`}>{st}</button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead><tr>
                    <th className="sticky left-0 bg-slate-50 px-2 py-1.5 text-left font-semibold text-slate-500 border border-slate-200 min-w-[100px]">From \ To</th>
                    {matrix.stations.map((s) => (
                      <th key={s} className="px-2 py-1.5 font-semibold text-slate-600 border border-slate-200 whitespace-nowrap">{s}</th>
                    ))}
                  </tr></thead>
                  <tbody>{matrix.stations.map((from, fi) => (
                    <tr key={from}>
                      <td className="sticky left-0 bg-slate-50 px-2 py-1.5 font-semibold text-slate-600 border border-slate-200 whitespace-nowrap">{from}</td>
                      {matrix.stations.map((to, ti) => {
                        if (ti <= fi) return <td key={to} className="px-2 py-1.5 border border-slate-200 bg-slate-100 text-center text-slate-300">-</td>;
                        const seat = seatLookup.get(`${from}→${to}`);
                        const online = seat?.online || 0;
                        const fare = seat?.fare || 0;
                        return (
                          <td key={to} className={`px-2 py-1.5 border border-slate-200 text-center ${online > 5 ? "bg-green-50" : online > 0 ? "bg-yellow-50" : "bg-red-50"}`}>
                            <div className="font-bold">{online}</div>
                            {fare > 0 && <div className="text-slate-400">৳{fare}</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {matrix.route_info?.days && (
                <p className="text-xs text-slate-400 mt-3">Runs: {matrix.route_info.days} &middot; Duration: {matrix.route_info.duration}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main ─────────────────────────────────── */
export default function Home() {
  const [creds, setCreds] = useState<Creds>({ token: "", ssdk: "", uuid: "" });
  const [showSetup, setShowSetup] = useState(true);
  const [tokenInput, setTokenInput] = useState("");
  const [ssdkInput, setSsdkInput] = useState("");
  const [uuidInput, setUuidInput] = useState("");

  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [date, setDate] = useState(getTomorrow());
  const [trains, setTrains] = useState<TrainResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("railway_creds");
    if (saved) {
      try {
        const c = JSON.parse(saved) as Creds;
        if (c.token) { setCreds(c); setShowSetup(false); }
      } catch { /* ignore */ }
    }
  }, []);

  const handleSaveCreds = () => {
    const c: Creds = { token: tokenInput.trim(), ssdk: ssdkInput.trim(), uuid: uuidInput.trim() };
    if (!c.token) return;
    setCreds(c);
    setShowSetup(false);
    localStorage.setItem("railway_creds", JSON.stringify(c));
  };

  const handleLogout = useCallback(() => {
    setCreds({ token: "", ssdk: "", uuid: "" });
    setTokenInput(""); setSsdkInput(""); setUuidInput("");
    setShowSetup(true);
    setTrains([]);
    localStorage.removeItem("railway_creds");
  }, []);

  const handleSearch = useCallback(async () => {
    if (!fromCity || !toCity || !date) return;
    setSearching(true); setSearchError(""); setTrains([]);
    try {
      const resp = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...creds, from_city: fromCity, to_city: toCity, date: formatDateForApi(date) }),
      });
      if (resp.status === 401) { setSearchError("Token expired. Please update."); return; }
      const data = await resp.json();
      if (data.error) setSearchError(data.error);
      else setTrains(data.trains || []);
    } catch (e) { setSearchError("Request failed: " + (e as Error).message); }
    finally { setSearching(false); }
  }, [fromCity, toCity, date, creds]);

  const consoleScript = `JSON.stringify({token:localStorage.getItem('token'),ssdk:localStorage.getItem('ssdk'),uuid:localStorage.getItem('uuid')})`;

  // ── Setup screen ──
  if (showSetup || !creds.token) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800">BD Railway</h1>
              <p className="text-slate-500 text-sm mt-1">Seat availability dashboard</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
              <p className="font-semibold mb-2">How to get your credentials:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-blue-700">
                <li>Go to <a href="https://eticket.railway.gov.bd" target="_blank" rel="noopener noreferrer" className="underline font-medium">eticket.railway.gov.bd</a> and log in</li>
                <li>Open browser Console (<kbd className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">F12</kbd> → Console)</li>
                <li>Paste this command and press Enter:</li>
              </ol>
              <div className="mt-2 bg-blue-100 rounded-lg p-2 font-mono text-xs break-all select-all cursor-pointer" onClick={() => navigator.clipboard.writeText(consoleScript)}>
                {consoleScript}
              </div>
              <p className="mt-2 text-blue-600 text-xs">Click above to copy. Then paste the output JSON below.</p>
            </div>

            {/* Quick JSON paste */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 mb-1">Quick paste (JSON from console)</label>
              <textarea rows={2} placeholder='{"token":"eyJ...","ssdk":"f34...","uuid":"c03..."}'
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs font-mono resize-none"
                onChange={(e) => {
                  try {
                    const j = JSON.parse(e.target.value);
                    if (j.token) { setTokenInput(j.token); setSsdkInput(j.ssdk || ""); setUuidInput(j.uuid || ""); }
                  } catch { /* not valid json yet */ }
                }}
              />
            </div>

            <details className="mb-4">
              <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">Or enter fields manually</summary>
              <div className="space-y-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">token</label>
                  <input type="text" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="eyJhbGci..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">ssdk (x-device-key)</label>
                  <input type="text" value={ssdkInput} onChange={(e) => setSsdkInput(e.target.value)}
                    placeholder="f34d4d3acb..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">uuid (x-device-id)</label>
                  <input type="text" value={uuidInput} onChange={(e) => setUuidInput(e.target.value)}
                    placeholder="c039fa66b7..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </details>

            <button onClick={handleSaveCreds} disabled={!tokenInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition-colors">
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="flex-1 flex flex-col">
      <nav className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between shadow">
        <h1 className="font-bold text-lg">BD Railway</h1>
        <div className="flex items-center gap-4 text-sm">
          <button onClick={() => { setTokenInput(creds.token); setSsdkInput(creds.ssdk); setUuidInput(creds.uuid); setShowSetup(true); }}
            className="text-slate-400 hover:text-white transition-colors">Update Token</button>
          <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">Logout</button>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-lg mb-4">Search Trains</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">From</label>
              <Autocomplete value={fromCity} onChange={setFromCity} placeholder="e.g. Dhaka" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">To</label>
              <Autocomplete value={toCity} onChange={setToCity} placeholder="e.g. Chattogram" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSearch} disabled={searching || !fromCity || !toCity || !date}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
              {searching ? "Searching..." : "Search Trains"}
            </button>
            {fromCity && toCity && (
              <button onClick={() => { const t = fromCity; setFromCity(toCity); setToCity(t); }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm">Swap</button>
            )}
          </div>
        </div>

        {searching && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-3" />
            <p className="text-slate-500">Searching all 10 seat classes...</p>
          </div>
        )}

        {searchError && <div className="bg-red-50 text-red-700 px-5 py-4 rounded-2xl border border-red-200">{searchError}</div>}

        {!searching && trains.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="mb-4">
              <h2 className="font-semibold text-lg">{fromCity} → {toCity}</h2>
              <p className="text-slate-500 text-sm">{date} &middot; {trains.length} train(s) &middot; Click &quot;Show Route Matrix&quot; to see all stops</p>
            </div>
            <div className="space-y-4">
              {trains.map((t) => (
                <TrainCard key={t.trip_id || t.trip_number} train={t} creds={creds} date={formatDateForApi(date)} />
              ))}
            </div>
          </div>
        )}

        {!searching && !searchError && trains.length === 0 && (
          <div className="text-center text-slate-400 py-12">
            Search for trains to see seat availability across all classes.
          </div>
        )}
      </main>
    </div>
  );
}
