import { NextRequest, NextResponse } from "next/server";
import { searchTrains, type AuthCredentials } from "@/lib/api";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const creds: AuthCredentials = {
    token: body.token,
    ssdk: body.ssdk,
    uuid: body.uuid,
  };
  const from_city = body.from_city as string;
  const to_city = body.to_city as string;
  const date = body.date as string;

  if (!creds.token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  interface SeatInfo {
    type: string;
    fare: number;
    vat: number;
    online: number;
    offline: number;
  }

  interface MergedTrain {
    trip_id: string;
    trip_number: string;
    train_name: string;
    departure: string;
    arrival: string;
    travel_time: string;
    seats: Record<string, SeatInfo>;
  }

  const merged: Record<string, MergedTrain> = {};

  // One query returns ALL seat classes for every matching train, so a single
  // call suffices (no need to loop the 10 SEAT_CLASSES — that just multiplies
  // load against a rate-limited endpoint). SHULOV is a safe, widely-present class.
  const trains = await searchTrains(creds, from_city, to_city, date, "SHULOV");

  for (const t of trains) {
    const id = t.trip_id || t.trip_number;
    if (!merged[id]) {
      merged[id] = {
        trip_id: t.trip_id,
        trip_number: t.trip_number,
        // The API returns the train NAME in trip_number and the bare number in
        // train_model. Display the name.
        train_name: t.trip_number,
        departure: t.departure_date_time,
        arrival: t.arrival_date_time,
        travel_time: t.travel_time,
        seats: {},
      };
    }
    for (const st of t.seat_types || []) {
      const cls = st.type;
      if (!merged[id].seats[cls]) {
        merged[id].seats[cls] = {
          type: cls,
          fare: st.fare,
          vat: st.vat_amount || 0,
          online: st.seat_counts?.online || 0,
          offline: st.seat_counts?.offline || 0,
        };
      }
    }
  }

  return NextResponse.json({ trains: Object.values(merged) });
}
