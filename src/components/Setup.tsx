"use client";

import { useState } from "react";
import type { Creds } from "@/lib/storage";

const BOOKMARKLET = `javascript:(function(){var d={token:localStorage.getItem('token'),ssdk:localStorage.getItem('ssdk'),uuid:localStorage.getItem('uuid')};if(!d.token){alert('Not logged in to eticket.railway.gov.bd');return}navigator.clipboard.writeText(JSON.stringify(d)).then(function(){alert('BD Railway creds copied. Paste into the dashboard.')})})()`;

const CONSOLE_SCRIPT = `JSON.stringify({token:localStorage.getItem('token'),ssdk:localStorage.getItem('ssdk'),uuid:localStorage.getItem('uuid')})`;

export function Setup({
  initial,
  onSave,
  onCancel,
}: {
  initial: Creds;
  onSave: (c: Creds) => void;
  onCancel?: () => void;
}) {
  const [token, setToken] = useState(initial.token);
  const [ssdk, setSsdk] = useState(initial.ssdk);
  const [uuid, setUuid] = useState(initial.uuid);
  const [copied, setCopied] = useState(false);

  const handleJson = (s: string) => {
    try {
      const j = JSON.parse(s);
      if (j.token) { setToken(j.token); setSsdk(j.ssdk || ""); setUuid(j.uuid || ""); }
    } catch { /* not JSON */ }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 grid-bg">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white mb-3 shadow-lg shadow-brand-500/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="16" rx="2"/>
              <path d="M4 11h16M8 19l-2 3M16 19l2 3M9 7h.01M15 7h.01"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold">BD Railway Seat Atlas</h1>
          <p className="text-muted text-sm mt-1">All classes, all stops, one glance.</p>
        </div>

        <div className="surface border rounded-2xl p-6 shadow-sm">
          <div className="rounded-xl bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700/40 p-4 mb-5 text-sm">
            <p className="font-semibold text-brand-800 dark:text-brand-200 mb-2">Get your credentials</p>
            <ol className="list-decimal list-inside space-y-1.5 text-brand-700 dark:text-brand-300">
              <li>Open <a href="https://eticket.railway.gov.bd" target="_blank" rel="noopener noreferrer" className="underline font-medium">eticket.railway.gov.bd</a> and log in</li>
              <li>Click the bookmarklet below (drag to bookmarks bar), or paste the script in DevTools console</li>
              <li>Paste the resulting JSON into the box below</li>
            </ol>

            <div className="flex flex-wrap gap-2 mt-3">
              <a
                href={BOOKMARKLET}
                onClick={(e) => e.preventDefault()}
                draggable
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium cursor-grab active:cursor-grabbing"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                Drag: Grab BD Railway Token
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(CONSOLE_SCRIPT); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 text-xs font-medium hover:bg-brand-100 dark:hover:bg-brand-900/50"
              >
                {copied ? "Copied!" : "Copy console script"}
              </button>
            </div>
          </div>

          <label className="block text-sm font-medium mb-1">Paste JSON from console / bookmarklet</label>
          <textarea
            rows={2}
            placeholder='{"token":"eyJ...","ssdk":"f34...","uuid":"c03..."}'
            className="w-full px-3 py-2.5 surface border rounded-xl text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            onChange={(e) => handleJson(e.target.value)}
          />

          <details className="mt-4">
            <summary className="text-sm text-muted cursor-pointer hover:text-current">Or enter fields manually</summary>
            <div className="space-y-3 mt-3">
              {[
                { label: "token", value: token, set: setToken, ph: "eyJhbGci..." },
                { label: "ssdk (x-device-key)", value: ssdk, set: setSsdk, ph: "f34d4d3acb..." },
                { label: "uuid (x-device-id)", value: uuid, set: setUuid, ph: "c039fa66b7..." },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-muted mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.ph}
                    className="w-full px-3 py-2 surface border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>
              ))}
            </div>
          </details>

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => token.trim() && onSave({ token: token.trim(), ssdk: ssdk.trim(), uuid: uuid.trim() })}
              disabled={!token.trim()}
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-ink-300 dark:disabled:bg-ink-700 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors"
            >
              Save & Continue
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl border border-app text-muted hover:bg-ink-100 dark:hover:bg-ink-800/60"
              >
                Cancel
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted mt-3 text-center">
            Credentials stay in your browser&apos;s localStorage. Nothing is sent except to Bangladesh Railway&apos;s own API.
          </p>
        </div>
      </div>
    </div>
  );
}
