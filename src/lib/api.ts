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
    const resp = await fetch(
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

export async function getTrainRoutes(trainModel: string, date: string) {
  try {
    const resp = await fetch(`${API_BASE}/web/train-routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
