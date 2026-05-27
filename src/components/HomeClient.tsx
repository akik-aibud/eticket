"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import stationsData from "@/lib/stations.json";
import { Setup } from "./Setup";
import { Nav } from "./Nav";
import { SearchForm } from "./SearchForm";
import { TrainResults } from "./TrainResults";
import { BestSeatBanner } from "./BestSeatBanner";
import { ScanAll } from "./ScanAll";
import type { TrainResult } from "./TrainCard";
import { loadCreds, saveCreds, clearCreds, pushRecent, type Creds } from "@/lib/storage";
import { formatDateForApi, getTomorrow, tokenStatus, expiryLabel } from "@/lib/format";
import {
  type SearchOptions,
  DEFAULT_FEATURES,
  expandDates,
  matchesTimePref,
} from "@/lib/search-types";

const STATIONS: string[] = stationsData.stations;

interface DateResult {
  date: string;        // YYYY-MM-DD
  priority: number;    // 0 = top choice
  trains: TrainResult[];
}

function optionsFromParams(sp: URLSearchParams): SearchOptions | null {
  const from = sp.get("from");
  const to = sp.get("to");
  if (!from || !to) return null;
  const dates = (sp.get("dates") || "").split(",").filter(Boolean);
  return {
    from, to,
    passengers: Math.max(1, Number(sp.get("pax")) || 1),
    dateMode: (sp.get("mode") as SearchOptions["dateMode"]) || "single",
    dates: dates.length ? dates : [getTomorrow()],
    timePref: (sp.get("time") as SearchOptions["timePref"]) || "any",
    features: {
      splitFinder: sp.get("f_split") !== "0",
      scanAll: sp.get("f_scan") === "1",
      bestSeat: sp.get("f_best") !== "0",
      ai: sp.get("f_ai") === "1",
    },
  };
}

function paramsFromOptions(o: SearchOptions): string {
  const p = new URLSearchParams({
    from: o.from, to: o.to, pax: String(o.passengers),
    mode: o.dateMode, dates: o.dates.join(","), time: o.timePref,
    f_split: o.features.splitFinder ? "1" : "0",
    f_scan: o.features.scanAll ? "1" : "0",
    f_best: o.features.bestSeat ? "1" : "0",
    f_ai: o.features.ai ? "1" : "0",
  });
  return p.toString();
}

const BLANK: SearchOptions = {
  from: "", to: "", passengers: 1, dateMode: "single",
  dates: [getTomorrow()], timePref: "any", features: { ...DEFAULT_FEATURES },
};

export function HomeClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [creds, setCreds] = useState<Creds>({ token: "", ssdk: "", uuid: "" });
  const [showSetup, setShowSetup] = useState(false);
  const [ready, setReady] = useState(false);

  const [initialOpts, setInitialOpts] = useState<SearchOptions>(BLANK);
  const [lastOpts, setLastOpts] = useState<SearchOptions | null>(null);
  const [results, setResults] = useState<DateResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const didAuto = useRef(false);

  // mount: load creds + seed options from URL
  useEffect(() => {
    const c = loadCreds();
    if (c) setCreds(c); else setShowSetup(true);
    const seeded = optionsFromParams(new URLSearchParams(searchParams.toString()));
    if (seeded) setInitialOpts(seeded);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = useCallback(async (opts: SearchOptions, current: Creds) => {
    if (!opts.from || !opts.to) return;
    setSearching(true); setError(""); setResults([]); setLastOpts(opts);
    // sync URL (shareable) — replace, no history spam, no creds
    router.replace(`${pathname}?${paramsFromOptions(opts)}`, { scroll: false });

    const dates = expandDates(opts.dateMode, opts.dates);
    const acc: DateResult[] = [];
    try {
      for (let i = 0; i < dates.length; i++) {
        const resp = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...current, from_city: opts.from, to_city: opts.to, date: formatDateForApi(dates[i]) }),
        });
        if (resp.status === 401) { setError("Token expired — update it to search."); setShowSetup(true); setSearching(false); return; }
        const data = await resp.json();
        let trains: TrainResult[] = data.trains || [];
        if (opts.timePref !== "any") trains = trains.filter((t) => matchesTimePref(t.departure, opts.timePref));
        acc.push({ date: dates[i], priority: i, trains });
        if (i < dates.length - 1) await new Promise((r) => setTimeout(r, 400));
      }
      setResults(acc);
      pushRecent({ from: opts.from, to: opts.to, date: dates[0] });
    } catch (e) {
      setError("Request failed: " + (e as Error).message);
    } finally {
      setSearching(false);
    }
  }, [router, pathname]);

  // auto-search once if URL had a full query and creds exist
  useEffect(() => {
    if (!ready || didAuto.current) return;
    const seeded = optionsFromParams(new URLSearchParams(searchParams.toString()));
    if (seeded && creds.token) { didAuto.current = true; runSearch(seeded, creds); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, creds.token]);

  const onSaveCreds = (c: Creds) => { saveCreds(c); setCreds(c); setShowSetup(false); };
  const onLogout = () => { clearCreds(); setCreds({ token: "", ssdk: "", uuid: "" }); setResults([]); setShowSetup(true); };

  const copyLink = async () => {
    if (!lastOpts) return;
    await navigator.clipboard.writeText(`${location.origin}${pathname}?${paramsFromOptions(lastOpts)}`);
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };

  if (!ready) return null;

  // Setup gate
  if (showSetup || !creds.token) {
    return <Setup initial={creds} onSave={onSaveCreds} onCancel={creds.token ? () => setShowSetup(false) : undefined} />;
  }

  const tState = tokenStatus(creds.token);
  const multi = results.length > 1;

  return (
    <>
      <Nav onUpdateToken={() => setShowSetup(true)} onLogout={onLogout} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 space-y-5">
        {(tState === "expired" || tState === "soon") && (
          <div className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between gap-3 anim-in ${
            tState === "expired" ? "border-rose-400/60 bg-rose-500/10 text-rose-700 dark:text-rose-300" : "border-board-400/50 bg-board-500/10 text-board-600 dark:text-board-300"
          }`}>
            <span>{tState === "expired" ? "Your token has expired." : "Token expiring soon"} <span className="opacity-70">({expiryLabel(creds.token)})</span></span>
            <button onClick={() => setShowSetup(true)} className="font-semibold underline shrink-0">Update token</button>
          </div>
        )}

        <SearchForm stations={STATIONS} initial={initialOpts} searching={searching} onSearch={(o) => runSearch(o, creds)} />

        {error && <div className="rounded-xl border border-rose-400/60 bg-rose-500/10 text-rose-700 dark:text-rose-300 px-4 py-3 text-sm">{error}</div>}

        {searching && (
          <div className="surface border rounded-2xl p-10 text-center">
            <div className="inline-block w-8 h-8 border-[3px] border-app border-t-brand-500 rounded-full animate-spin mb-3" />
            <p className="text-muted text-sm">Querying the railway board…</p>
          </div>
        )}

        {!searching && lastOpts && results.length > 0 && (
          <div className="space-y-5">
            {lastOpts.features.bestSeat && (
              <BestSeatBanner results={results} passengers={lastOpts.passengers} from={lastOpts.from} to={lastOpts.to} />
            )}

            {/* copy-link bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted">
                <span className="font-display font-bold text-base text-current">{lastOpts.from} → {lastOpts.to}</span>
                <span className="ml-2">{lastOpts.passengers} pax · {results.reduce((n, r) => n + r.trains.length, 0)} trains across {results.length} date(s)</span>
              </p>
              <button onClick={copyLink} className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app text-muted hover:text-brand-600 hover:border-brand-400 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></svg>
                {copied ? "Copied!" : "Copy share link"}
              </button>
            </div>

            {results.map((r) => (
              <div key={r.date} className="space-y-2">
                {multi && (
                  <div className="flex items-center gap-2 px-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                      r.priority === 0 ? "bg-brand-600 text-white" : "border border-app text-muted"
                    }`}>{lastOpts.dateMode === "ranked" ? `Choice ${r.priority + 1}` : "Date"}</span>
                    <span className="font-display font-semibold">{new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
                    <span className="text-xs text-muted">{r.trains.length} trains</span>
                  </div>
                )}
                {r.trains.length > 0 ? (
                  <TrainResults trains={r.trains} creds={creds} date={formatDateForApi(r.date)} from={lastOpts.from} to={lastOpts.to} passengers={lastOpts.passengers} />
                ) : (
                  <p className="text-sm text-muted px-1 py-3">No trains on this date for {lastOpts.from} → {lastOpts.to}.</p>
                )}
              </div>
            ))}

            {lastOpts.features.scanAll && results[0]?.trains.length > 0 && (
              <ScanAll
                trains={results[0].trains}
                creds={creds}
                date={formatDateForApi(results[0].date)}
                from={lastOpts.from}
                to={lastOpts.to}
                aiEnabled={lastOpts.features.ai}
              />
            )}
          </div>
        )}

        {!searching && lastOpts && results.length > 0 && results.every((r) => r.trains.length === 0) && (
          <div className="text-center text-muted py-10 text-sm">No trains found. Try a different date or check the station names.</div>
        )}

        {!lastOpts && !searching && (
          <div className="text-center text-muted py-16">
            <p className="font-display text-lg">Where to?</p>
            <p className="text-sm mt-1">Pick two stations and a date to see live seats across every class.</p>
          </div>
        )}
      </main>
    </>
  );
}
