"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  icon?: React.ReactNode;
}

export function Autocomplete({ value, onChange, placeholder, options, icon }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  const v = value.toLowerCase();
  const matches = v
    ? options.filter((s) => s.toLowerCase().includes(v)).slice(0, 14)
    : [];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          className={`w-full ${icon ? "pl-10" : "pl-3"} pr-3 py-2.5 rounded-xl surface border focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-400 transition-shadow`}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onFocus={() => value && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && activeIdx >= 0) {
              e.preventDefault();
              onChange(matches[activeIdx]);
              setOpen(false);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 surface border rounded-xl shadow-xl max-h-56 overflow-y-auto thin-scroll anim-in">
          {matches.map((s, i) => (
            <div
              key={s}
              className={`px-3 py-2 cursor-pointer text-sm ${
                i === activeIdx
                  ? "bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200"
                  : "hover:bg-ink-100 dark:hover:bg-ink-800/60"
              }`}
              onMouseDown={() => { onChange(s); setOpen(false); }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
