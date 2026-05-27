import routesData from "./routes.json";

export interface RouteStop {
  city: string;
  arrival_time?: string | null;
  departure_time?: string | null;
  halt?: string | null;
  duration?: string | null;
}
export interface RouteCacheEntry {
  train_name: string;
  days: string[];
  total_duration: string;
  routes: RouteStop[];
}

const CACHE = routesData as Record<string, RouteCacheEntry>;

/**
 * Look up a train's stop list from the bundled cache, keyed by train number
 * (e.g. "772"). Stop order is static, so this avoids an authenticated
 * train-routes API call. Returns the same shape as getTrainRoutes, or null on miss.
 */
export function routeFromCache(trainNumber: string): { data: RouteCacheEntry } | null {
  const e = CACHE[trainNumber];
  if (!e || !e.routes?.length) return null;
  return { data: e };
}

/** Number of trains currently in the cache (used for diagnostics). */
export const CACHED_TRAIN_COUNT = Object.keys(CACHE).length;
