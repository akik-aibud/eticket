export interface Creds { token: string; ssdk: string; uuid: string; }

export interface RecentSearch {
  from: string;
  to: string;
  date: string;
  ts: number;
}

const K_CREDS = "railway_creds";
const K_RECENT = "railway_recent";
const K_FAV = "railway_fav";
const K_THEME = "railway_theme";

export function loadCreds(): Creds | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(K_CREDS);
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Creds;
    return c.token ? c : null;
  } catch { return null; }
}

export function saveCreds(c: Creds) {
  localStorage.setItem(K_CREDS, JSON.stringify(c));
}

export function clearCreds() {
  localStorage.removeItem(K_CREDS);
}

export function loadRecents(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(K_RECENT) || "[]"); }
  catch { return []; }
}

export function pushRecent(r: Omit<RecentSearch, "ts">) {
  const all = loadRecents().filter((x) => !(x.from === r.from && x.to === r.to));
  all.unshift({ ...r, ts: Date.now() });
  localStorage.setItem(K_RECENT, JSON.stringify(all.slice(0, 6)));
}

export function loadFavorites(): Array<{ from: string; to: string }> {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(K_FAV) || "[]"); }
  catch { return []; }
}

export function toggleFavorite(from: string, to: string) {
  const all = loadFavorites();
  const idx = all.findIndex((x) => x.from === from && x.to === to);
  if (idx >= 0) all.splice(idx, 1);
  else all.unshift({ from, to });
  localStorage.setItem(K_FAV, JSON.stringify(all.slice(0, 12)));
  return idx < 0;
}

export function isFavorite(from: string, to: string) {
  return loadFavorites().some((x) => x.from === from && x.to === to);
}

export type Theme = "light" | "dark";

export function loadTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(K_THEME) as Theme | null;
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function saveTheme(t: Theme) {
  localStorage.setItem(K_THEME, t);
}
