import { NextRequest, NextResponse } from "next/server";
import { getTrainRoutes, searchTrains, delay, type AuthCredentials } from "@/lib/api";
import { routeFromCache } from "@/lib/routes-cache";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const creds: AuthCredentials = {
    token: body.token,
    ssdk: body.ssdk,
    uuid: body.uuid,
  };
  const rawTripNumber = (body.trip_number as string || "").trim();
  const date = body.date as string;

  const numMatch = rawTripNumber.match(/\d+/);
  const tripNumber = numMatch ? numMatch[0] : rawTripNumber;

  if (!creds.token || !tripNumber) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Step 1: Get the train's route (all stops). Prefer the bundled routes cache
  // (static stop order, cuts an auth'd API call); fall back to a live fetch.
  let routeData = routeFromCache(tripNumber);
  if (!routeData) {
    routeData = await getTrainRoutes(creds, tripNumber, date);
  }
  if (!routeData?.data?.routes || routeData.data.routes.length === 0) {
    return NextResponse.json({ error: "Could not fetch route" });
  }

  const routeStops = routeData.data.routes;
  const stations: string[] = routeStops.map((s: { city: string }) => s.city);
  const days = routeData.data.days || [];
  const totalDuration = routeData.data.total_duration || "";

  if (stations.length < 2) {
    return NextResponse.json({ error: "Not enough stations" });
  }

  // Step 2: For each station pair, search with one class - the API returns ALL seat types for matching trains
  interface SegmentData {
    from: string;
    to: string;
    seats: Record<string, { online: number; offline: number; fare: number }>;
  }

  const segments: SegmentData[] = [];

  // Generate all from→to pairs
  const pairs: Array<{ from: string; to: string }> = [];
  for (let i = 0; i < stations.length; i++) {
    for (let j = i + 1; j < stations.length; j++) {
      pairs.push({ from: stations[i], to: stations[j] });
    }
  }

  // Fetch in small batches (one search per pair using SHULOV class, which
  // returns all seat types). Concurrency 2 + 1.2s spacing keeps us under the
  // API's 429 rate limit; fetchWithRetry handles any that still slip through.
  for (let i = 0; i < pairs.length; i += 2) {
    const batch = pairs.slice(i, i + 2);

    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const trains = await searchTrains(creds, p.from, p.to, date, "SHULOV");
        const seats: Record<string, { online: number; offline: number; fare: number }> = {};

        // Find our specific train by trip number
        const ourTrain = trains.find((t) => {
          const tn = (t.trip_number || "").trim();
          return tn === tripNumber || tn === rawTripNumber || tn.includes(`(${tripNumber})`);
        });

        if (ourTrain) {
          for (const st of ourTrain.seat_types || []) {
            seats[st.type] = {
              online: st.seat_counts?.online || 0,
              offline: st.seat_counts?.offline || 0,
              fare: st.fare || 0,
            };
          }
        }

        return { from: p.from, to: p.to, seats };
      })
    );

    for (let k = 0; k < results.length; k++) {
      const r = results[k];
      if (r.status === "fulfilled") {
        segments.push(r.value);
      } else {
        segments.push({ from: batch[k].from, to: batch[k].to, seats: {} });
      }
    }

    if (i + 2 < pairs.length) {
      await delay(1200);
    }
  }

  const allSeatTypes = new Set<string>();
  for (const seg of segments) {
    for (const key of Object.keys(seg.seats)) {
      allSeatTypes.add(key);
    }
  }

  return NextResponse.json({
    stations,
    segments,
    seat_types: Array.from(allSeatTypes),
    route_info: {
      days: days.join(", "),
      duration: totalDuration,
      stops: routeStops.map((s: { city: string; departure_time?: string | null; arrival_time?: string | null }) => ({
        city: s.city,
        departure: s.departure_time || "",
        arrival: s.arrival_time || "",
      })),
    },
  });
}
