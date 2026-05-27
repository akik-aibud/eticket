const API_BASE = "https://railspaapi.shohoz.com/v1.0";

export const SEAT_CLASSES = [
  "S_CHAIR",
  "SHOVAN",
  "SHULOV",
  "SNIGDHA",
  "AC_S",
  "AC_B",
  "AC_CHAIR",
  "F_SEAT",
  "F_BERTH",
  "F_CHAIR",
];

export interface AuthCredentials {
  token: string;
  ssdk: string;
  uuid: string;
}

export interface SeatType {
  type: string;
  fare: number;
  vat_amount: number;
  seat_counts: {
    online: number;
    offline: number;
  };
}

export interface Train {
  trip_id: string;
  trip_number: string;
  train_model: string;
  departure_date_time: string;
  arrival_date_time: string;
  travel_time: string;
  seat_types: SeatType[];
}

function authHeaders(creds: AuthCredentials) {
  return {
    Authorization: `Bearer ${creds.token}`,
    "x-device-key": creds.ssdk,
    "x-device-id": creds.uuid,
    "Content-Type": "application/json",
  };
}

/**
 * fetch wrapper that retries on 429 / 5xx. Honors Retry-After when present,
 * else exponential backoff with jitter. The Shohoz API rate-limits matrix-style
 * fan-out aggressively, so every API call routes through this.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let attempt = 0;
  for (;;) {
    const resp = await fetch(url, init);
    if (resp.status !== 429 && resp.status < 500) return resp;
    if (attempt >= maxRetries) return resp;
    const retryAfter = Number(resp.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.round(1000 * 2 ** attempt + Math.random() * 400);
    await delay(waitMs);
    attempt++;
  }
}

export async function searchTrains(
  creds: AuthCredentials,
  fromCity: string,
  toCity: string,
  date: string,
  seatClass: string
): Promise<Train[]> {
  const params = new URLSearchParams({
    from_city: fromCity,
    to_city: toCity,
    date_of_journey: date,
    seat_class: seatClass,
  });
  try {
    const resp = await fetchWithRetry(
      `${API_BASE}/web/bookings/search-trips-v2?${params}`,
      { headers: authHeaders(creds) }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return data?.data?.trains || [];
  } catch {
    return [];
  }
}

/**
 * Fetch a train's full stop list. The live train-routes endpoint now REQUIRES
 * auth (returns empty routes without it), so creds are mandatory.
 */
export async function getTrainRoutes(
  creds: AuthCredentials,
  trainModel: string,
  date: string
) {
  try {
    const resp = await fetchWithRetry(`${API_BASE}/web/train-routes`, {
      method: "POST",
      headers: authHeaders(creds),
      body: JSON.stringify({ model: trainModel, departure_date_time: date }),
    });
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

export async function getSeatAvailability(
  creds: AuthCredentials,
  fromCity: string,
  toCity: string,
  tripNumber: string,
  date: string
) {
  const params = new URLSearchParams({
    from_city: fromCity,
    to_city: toCity,
    trip_number: tripNumber,
    date_of_journey: date,
  });
  try {
    const resp = await fetch(
      `${API_BASE}/web/bookings/seat-availability?${params}`,
      { headers: authHeaders(creds) }
    );
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
