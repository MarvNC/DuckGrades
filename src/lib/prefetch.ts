import { prefetchRouteData } from './dataClient';
import { prefetchRouteModule } from './routePrefetch';

type Connection = {
  saveData?: boolean;
  effectiveType?: string;
};

/**
 * Returns true if the current network conditions allow prefetching.
 * Respects the Save-Data header and slow connections (2g/3g).
 */
export function canPrefetch(allowSlow = false): boolean {
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  if (connection?.saveData) return false;
  if (!allowSlow && connection?.effectiveType && connection.effectiveType !== '4g') return false;
  return true;
}

/**
 * Prefetches both the route JS module chunk and the associated data JSON for a given route.
 * Safe to call multiple times — both module and data caches are idempotent.
 */
export function prefetchRoute(route: string): void {
  if (!canPrefetch()) return;
  prefetchRouteModule(route);
  prefetchRouteData(route);
}
