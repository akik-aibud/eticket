import { NextRequest, NextResponse } from "next/server";
import { searchTrains, SEAT_CLASSES, delay, type AuthCredentials } from "@/lib/api";

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

  for (let i = 0; i < SEAT_CLASSES.length; i += 3) {
    const batch = SEAT_CLASSES.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map((sc) => searchTrains(creds, from_city, to_city, date, sc))
    );

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const t of r.value) {
        const id = t.trip_id || t.trip_number;
        if (!merged[id]) {
          merged[id] = {
            trip_id: t.trip_id,
            trip_number: t.trip_number,
            train_name: t.train_model,
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
    }

    if (i + 3 < SEAT_CLASSES.length) {
      await delay(150);
    }
  }

  return NextResponse.json({ trains: Object.values(merged) });
}
