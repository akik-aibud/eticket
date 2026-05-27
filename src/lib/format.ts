const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatTime(dt: string) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return dt; }
}

export function formatDateForApi(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}-${MONTH[d.getMonth()]}-${d.getFullYear()}`;
}

export function getTomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export function travelMinutes(t: string): number {
  if (!t) return 0;
  const h = /(\d+)\s*h/.exec(t)?.[1];
  const m = /(\d+)\s*m/.exec(t)?.[1];
  return (h ? parseInt(h) * 60 : 0) + (m ? parseInt(m) : 0);
}

export function bdt(n: number) {
  if (!n) return "-";
  return `৳${n.toLocaleString("en-BD")}`;
}

/** Decode a JWT's `exp` (unix seconds) without verifying. Returns ms epoch or null. */
export function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "="))
    );
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export type TokenState = "valid" | "soon" | "expired" | "unknown";

/** Proactive status from the JWT exp. A 401 from the API is the authoritative
 *  "expired" signal — Shohoz can revoke before exp — but this catches the common case. */
export function tokenStatus(token: string, soonMs = 30 * 60 * 1000): TokenState {
  const exp = tokenExpiry(token);
  if (exp === null) return "unknown";
  const left = exp - Date.now();
  if (left <= 0) return "expired";
  if (left <= soonMs) return "soon";
  return "valid";
}

/** Human "2h 14m left" / "expired 5m ago". */
export function expiryLabel(token: string): string {
  const exp = tokenExpiry(token);
  if (exp === null) return "";
  const diff = exp - Date.now();
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const span = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return diff > 0 ? `${span} left` : `expired ${span} ago`;
}
