"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Nav({
  onUpdateToken,
  onLogout,
}: {
  onUpdateToken: () => void;
  onLogout: () => void;
}) {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md surface/70 border-b border-app">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white grid place-items-center glow-brand group-hover:scale-105 transition-transform">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="16" rx="2"/>
              <path d="M4 11h16M8 19l-2 3M16 19l2 3M9 7h.01M15 7h.01"/>
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-display font-extrabold text-base tracking-tight">Rail Atlas</div>
            <div className="text-[10px] text-muted">BD Railway · live seats</div>
          </div>
        </Link>
        <div className="flex items-center gap-0.5">
          <Link
            href="/learn"
            className="text-xs text-muted hover:text-current px-2.5 py-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800/60 transition-colors"
          >Learn</Link>
          <button
            onClick={onUpdateToken}
            className="text-xs text-muted hover:text-current px-2.5 py-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800/60 transition-colors"
          >Token</button>
          <button
            onClick={onLogout}
            className="text-xs text-muted hover:text-current px-2.5 py-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800/60 transition-colors"
          >Logout</button>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
