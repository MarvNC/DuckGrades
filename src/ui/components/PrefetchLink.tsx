import { type ComponentPropsWithoutRef } from 'react';
import { Link } from 'react-router-dom';
import { prefetchRoute } from '../../lib/prefetch';
import { usePrefetchOnViewport } from '../hooks/usePrefetchOnViewport';

type PrefetchLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  /**
   * The route to prefetch. Defaults to the `to` prop (as a string).
   * Override this when the `to` prop is an object or differs from the data route.
   */
  prefetchRouteOverride?: string;
};

/**
 * A drop-in replacement for react-router-dom's `<Link>` that aggressively
 * prefetches the target route's JS chunk and data JSON.
 *
 * Prefetch triggers:
 *  - `mouseenter` / `focus` / `pointerdown`  — desktop hover/keyboard nav
 *  - IntersectionObserver (200ms delay)       — mobile scroll / any viewport entry
 *
 * All prefetch calls are idempotent (cached) and respect Save-Data / slow
 * network signals via `canPrefetch()`.
 */
export function PrefetchLink({ prefetchRouteOverride, ...linkProps }: PrefetchLinkProps) {
  const route = prefetchRouteOverride ?? (typeof linkProps.to === 'string' ? linkProps.to : '');

  const viewportRef = usePrefetchOnViewport(route);

  function triggerPrefetch() {
    if (route) prefetchRoute(route);
  }

  return (
    <Link
      {...linkProps}
      ref={(el) => {
        viewportRef(el);
        // Forward any existing ref from the caller
        const { ref } = linkProps as { ref?: React.Ref<HTMLAnchorElement> };
        if (typeof ref === 'function') ref(el);
        else if (ref && typeof ref === 'object' && 'current' in ref) {
          (ref as React.MutableRefObject<HTMLAnchorElement | null>).current = el;
        }
      }}
      onMouseEnter={(e) => {
        triggerPrefetch();
        linkProps.onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        triggerPrefetch();
        linkProps.onFocus?.(e);
      }}
      onPointerDown={(e) => {
        triggerPrefetch();
        linkProps.onPointerDown?.(e);
      }}
      onTouchStart={(e) => {
        triggerPrefetch();
        linkProps.onTouchStart?.(e);
      }}
    />
  );
}
