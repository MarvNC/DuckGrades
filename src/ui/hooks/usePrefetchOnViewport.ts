import { useEffect, useRef } from 'react';
import { canPrefetch, prefetchRoute } from '../../lib/prefetch';

/**
 * Delay in ms an element must remain in the viewport before prefetching fires.
 * Long enough to skip items the user scrolls past, short enough to feel instant.
 */
const VIEWPORT_PREFETCH_DELAY = 200;

/**
 * Shared IntersectionObserver instance + per-element state.
 * Using a module-level singleton avoids creating one observer per component.
 */
type Entry = {
  route: string;
  timerId: ReturnType<typeof setTimeout> | null;
  done: boolean;
};

let sharedObserver: IntersectionObserver | null = null;
const entryMap = new WeakMap<Element, Entry>();

function getObserver(): IntersectionObserver {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (observations) => {
        for (const obs of observations) {
          const entry = entryMap.get(obs.target);
          if (!entry || entry.done) continue;

          if (obs.isIntersecting) {
            // Element entered viewport — start the delay timer
            if (entry.timerId === null) {
              entry.timerId = setTimeout(() => {
                entry.done = true;
                sharedObserver?.unobserve(obs.target);
                prefetchRoute(entry.route);
              }, VIEWPORT_PREFETCH_DELAY);
            }
          } else {
            // Element left viewport — cancel the timer
            if (entry.timerId !== null) {
              clearTimeout(entry.timerId);
              entry.timerId = null;
            }
          }
        }
      },
      {
        // Start prefetching slightly before the element is fully visible
        rootMargin: '0px 0px 80px 0px',
        threshold: 0,
      }
    );
  }
  return sharedObserver;
}

/**
 * Attaches viewport-based prefetching to a DOM element.
 *
 * When the element scrolls into view and stays visible for ~200ms the given
 * route (module chunk + data JSON) is prefetched. Fires at most once per element.
 *
 * Skips prefetching when the user has enabled Save-Data or is on a slow connection.
 *
 * Usage:
 *   const ref = usePrefetchOnViewport('/subject/CS');
 *   return <div ref={ref}>...</div>;
 */
export function usePrefetchOnViewport(route: string): (el: Element | null) => void {
  const elRef = useRef<Element | null>(null);
  const routeRef = useRef(route);

  // Keep routeRef in sync with the latest route without triggering a render
  useEffect(() => {
    routeRef.current = route;
  });

  const refCallback = (el: Element | null) => {
    // Unobserve previous element
    if (elRef.current && elRef.current !== el) {
      const prev = entryMap.get(elRef.current);
      if (prev?.timerId !== null && prev?.timerId !== undefined) {
        clearTimeout(prev.timerId);
      }
      sharedObserver?.unobserve(elRef.current);
      entryMap.delete(elRef.current);
    }

    elRef.current = el;

    if (!el) return;
    if (!canPrefetch()) return;

    // Register and observe
    entryMap.set(el, { route: routeRef.current, timerId: null, done: false });
    getObserver().observe(el);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      const el = elRef.current;
      if (!el) return;
      const entry = entryMap.get(el);
      if (entry?.timerId !== null && entry?.timerId !== undefined) {
        clearTimeout(entry.timerId);
      }
      sharedObserver?.unobserve(el);
      entryMap.delete(el);
    };
  }, []);

  return refCallback;
}
