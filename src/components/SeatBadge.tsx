export function SeatBadge({ online, size = "sm" }: { online: number; size?: "sm" | "xs" }) {
  const cls = size === "xs"
    ? "px-1.5 py-0.5 rounded text-[10px] font-semibold"
    : "px-2 py-0.5 rounded-full text-xs font-semibold";
  if (online > 10)
    return <span className={`${cls} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300`}>{online}</span>;
  if (online > 0)
    return <span className={`${cls} bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300`}>{online}</span>;
  return <span className={`${cls} bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300`}>0</span>;
}
