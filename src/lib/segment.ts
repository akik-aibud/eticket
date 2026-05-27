export interface SegSeat { online: number; offline: number; fare: number; }
export interface Segment { from: string; to: string; seats: Record<string, SegSeat>; }
export interface MatrixData {
  stations: string[];
  segments: Segment[];
  seat_types: string[];
  route_info: { days: string; duration: string };
}

export interface Leg {
  from: string;
  to: string;
  seatClass: string;
  online: number;
  fare: number;
}

export interface Combo {
  legs: Leg[];
  totalFare: number;
  minOnline: number;
  hops: number;
  classes: string[];
  /** stations in route_info index space, inclusive */
  fromIdx: number;
  toIdx: number;
  /** gap stations the rider stands through (no ticket coverage) — empty in pure ticketed combos */
  gapStations: string[];
}

interface LookupValue { seats: Record<string, SegSeat>; }

function buildLookup(matrix: MatrixData): Map<string, LookupValue> {
  const m = new Map<string, LookupValue>();
  for (const s of matrix.segments) {
    m.set(`${s.from}${s.to}`, { seats: s.seats });
  }
  return m;
}

function legFor(
  lookup: Map<string, LookupValue>,
  from: string,
  to: string,
  preferredClass?: string,
): Leg | null {
  const v = lookup.get(`${from}${to}`);
  if (!v) return null;
  if (preferredClass) {
    const s = v.seats[preferredClass];
    if (s && s.online > 0) {
      return { from, to, seatClass: preferredClass, online: s.online, fare: s.fare };
    }
  }
  let best: Leg | null = null;
  for (const [cls, s] of Object.entries(v.seats)) {
    if (s.online <= 0) continue;
    if (!best || s.fare < best.fare || (s.fare === best.fare && s.online > best.online)) {
      best = { from, to, seatClass: cls, online: s.online, fare: s.fare };
    }
  }
  return best;
}

function legAnyAvailability(
  lookup: Map<string, LookupValue>,
  from: string,
  to: string,
): Leg | null {
  const v = lookup.get(`${from}${to}`);
  if (!v) return null;
  let best: Leg | null = null;
  for (const [cls, s] of Object.entries(v.seats)) {
    if (s.online <= 0) continue;
    if (!best || s.online > best.online) {
      best = { from, to, seatClass: cls, online: s.online, fare: s.fare };
    }
  }
  return best;
}

/**
 * Find ticketed combos from `from` → `to` (inclusive of intermediates).
 * Returns: direct option (if any) + up to N split options with 1 or 2 transfers.
 */
export function findCombos(
  matrix: MatrixData,
  from: string,
  to: string,
  preferredClass?: string,
  maxResults = 6,
): Combo[] {
  const stations = matrix.stations;
  const fromIdx = stations.indexOf(from);
  const toIdx = stations.indexOf(to);
  if (fromIdx < 0 || toIdx < 0 || fromIdx >= toIdx) return [];

  const lookup = buildLookup(matrix);
  const combos: Combo[] = [];

  const direct = legFor(lookup, from, to, preferredClass);
  if (direct) {
    combos.push({
      legs: [direct],
      totalFare: direct.fare,
      minOnline: direct.online,
      hops: 0,
      classes: [direct.seatClass],
      fromIdx, toIdx,
      gapStations: [],
    });
  }

  // 1-transfer combos
  for (let m = fromIdx + 1; m < toIdx; m++) {
    const mid = stations[m];
    const l1 = legFor(lookup, from, mid, preferredClass);
    const l2 = legFor(lookup, mid, to, preferredClass);
    if (l1 && l2) {
      combos.push({
        legs: [l1, l2],
        totalFare: l1.fare + l2.fare,
        minOnline: Math.min(l1.online, l2.online),
        hops: 1,
        classes: Array.from(new Set([l1.seatClass, l2.seatClass])),
        fromIdx, toIdx,
        gapStations: [],
      });
    }
  }

  // 2-transfer combos (cap to avoid blowup)
  if (combos.length < maxResults) {
    outer: for (let m1 = fromIdx + 1; m1 < toIdx - 1; m1++) {
      for (let m2 = m1 + 1; m2 < toIdx; m2++) {
        const a = stations[m1], b = stations[m2];
        const l1 = legFor(lookup, from, a, preferredClass);
        const l2 = legFor(lookup, a, b, preferredClass);
        const l3 = legFor(lookup, b, to, preferredClass);
        if (l1 && l2 && l3) {
          combos.push({
            legs: [l1, l2, l3],
            totalFare: l1.fare + l2.fare + l3.fare,
            minOnline: Math.min(l1.online, l2.online, l3.online),
            hops: 2,
            classes: Array.from(new Set([l1.seatClass, l2.seatClass, l3.seatClass])),
            fromIdx, toIdx,
            gapStations: [],
          });
          if (combos.length >= maxResults * 2) break outer;
        }
      }
    }
  }

  // Sort: prefer direct, then fewest hops, then min fare, then most online
  combos.sort((a, b) => {
    if (a.hops !== b.hops) return a.hops - b.hops;
    if (a.totalFare !== b.totalFare) return a.totalFare - b.totalFare;
    return b.minOnline - a.minOnline;
  });

  return combos.slice(0, maxResults);
}

/**
 * "Stand-in-gap" partial-ticket combos — rider buys ticket for a covered slice
 * and stands for the unticketed gap. Useful when full from→to has zero
 * availability anywhere. Returns slices that COVER MOST of the route by
 * stations count, ordered by coverage.
 */
export function findPartialCoverage(
  matrix: MatrixData,
  from: string,
  to: string,
  preferredClass?: string,
  maxResults = 4,
): Combo[] {
  const stations = matrix.stations;
  const fromIdx = stations.indexOf(from);
  const toIdx = stations.indexOf(to);
  if (fromIdx < 0 || toIdx < 0 || fromIdx >= toIdx) return [];

  const lookup = buildLookup(matrix);
  const total = toIdx - fromIdx;
  const partials: Combo[] = [];

  // Try slices that cover at least ceil(50%) of the route by station hops
  const minCover = Math.max(1, Math.ceil(total * 0.5));

  for (let a = fromIdx; a <= toIdx; a++) {
    for (let b = a + minCover; b <= toIdx; b++) {
      if (a === fromIdx && b === toIdx) continue; // covered by findCombos
      const leg = legFor(lookup, stations[a], stations[b], preferredClass)
                ?? legAnyAvailability(lookup, stations[a], stations[b]);
      if (!leg) continue;
      const gap: string[] = [];
      if (a > fromIdx) gap.push(...stations.slice(fromIdx, a));
      if (b < toIdx) gap.push(...stations.slice(b + 1, toIdx + 1));
      partials.push({
        legs: [leg],
        totalFare: leg.fare,
        minOnline: leg.online,
        hops: 0,
        classes: [leg.seatClass],
        fromIdx, toIdx,
        gapStations: gap,
      });
    }
  }

  partials.sort((a, b) => {
    if (a.gapStations.length !== b.gapStations.length) return a.gapStations.length - b.gapStations.length;
    return a.totalFare - b.totalFare;
  });
  return partials.slice(0, maxResults);
}
