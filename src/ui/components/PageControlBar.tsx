import { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
import type {
  FilterModeOption,
  PageBarConfig,
  SearchLayoutContext,
  SortOption,
} from '../AppLayout';

type Props = {
  filter?: {
    id: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
  };
  filterMode?: {
    options: FilterModeOption[];
    activeKey: string;
    onChangeKey: (key: string) => void;
  };
  sort?: {
    options: SortOption[];
    activeKey: string;
    descending: boolean;
    onChangeKey: (key: string) => void;
    onToggleDirection: () => void;
  };
  countLabel?: string;
};

/**
 * Inline filter + sort bar that lives in the page content.
 * Uses IntersectionObserver: when it scrolls out of view it registers
 * itself into the sticky header via setPageBar; when back in view it
 * unregisters so the header row collapses.
 */
export function PageControlBar({ filter, filterMode, sort, countLabel }: Props) {
  const { setPageBar, registerPageControlBarEl } = useOutletContext<SearchLayoutContext>();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Register this element's DOM node so AppLayout can scroll to it
  useEffect(() => {
    registerPageControlBarEl(rootRef.current);
    return () => registerPageControlBarEl(null);
  }, [registerPageControlBarEl]);

  // Keep latest props in a ref so the IntersectionObserver callback always
  // has the current values without needing to re-subscribe.
  const propsRef = useRef<PageBarConfig>({ filter, filterMode, sort, countLabel });
  useEffect(() => {
    propsRef.current = { filter, filterMode, sort, countLabel };
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && !entry.isIntersecting) {
          // Scrolled out of view — push controls into header
          setPageBar(propsRef.current);
        } else {
          // Back in view — remove from header
          setPageBar(null);
        }
      },
      {
        // Fire when the sentinel exits the viewport from the top.
        // A small negative top margin accounts for the sticky header height.
        rootMargin: '-80px 0px 0px 0px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      setPageBar(null);
    };
  }, [setPageBar]);

  // Whenever props change while we're scrolled-out, update the header in place.
  // We check by looking at whether the sentinel is currently out of view.
  const isOutRef = useRef(false);
  useEffect(() => {
    if (isOutRef.current) {
      setPageBar({ filter, filterMode, sort, countLabel });
    }
  }, [filter, filterMode, sort, countLabel, setPageBar]);

  // Track visibility so the above effect knows whether to push.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isOutRef.current = entry ? !entry.isIntersecting : false;
      },
      { rootMargin: '-80px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] shadow-sm"
    >
      {/* Sentinel: the element whose visibility we track */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />

      {/* ── Desktop layout: filter (flex-1) + filter mode pills + Sort label + pills + count ── */}
      <div className="hidden items-center gap-3 px-4 py-2.5 sm:flex">
        {filter && (
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--duck-muted)]"
              aria-hidden="true"
            />
            <label htmlFor={filter.id} className="sr-only">
              {filter.placeholder}
            </label>
            <input
              id={filter.id}
              type="search"
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              placeholder={filter.placeholder}
              className="w-full rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] py-1.5 pr-3 pl-8 text-sm font-medium text-[var(--duck-fg)] transition outline-none placeholder:text-[var(--duck-muted)] focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20"
            />
          </div>
        )}
        {filterMode && (
          <div className="flex shrink-0 items-center gap-1">
            {filterMode.options.map((opt) => {
              const active = opt.key === filterMode.activeKey;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => filterMode.onChangeKey(opt.key)}
                  className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                    active
                      ? 'border-[var(--duck-border-strong)] bg-[var(--duck-surface-soft)] text-[var(--duck-accent-strong)]'
                      : 'border-[var(--duck-border)] bg-[var(--duck-surface)] text-[var(--duck-muted)] hover:border-[var(--duck-border-strong)] hover:text-[var(--duck-accent-strong)]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
        {sort && (
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-xs font-semibold tracking-[0.09em] text-[var(--duck-muted)] uppercase">
              Sort
            </span>
            <SortPillGroup sort={sort} />
          </div>
        )}
        {countLabel && (
          <span className="shrink-0 text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
            {countLabel}
          </span>
        )}
      </div>

      {/* ── Mobile layout: filter full-width top, filter mode + sort pills bottom ── */}
      <div className="flex flex-col gap-2 px-3 py-2.5 sm:hidden">
        {filter && (
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--duck-muted)]"
              aria-hidden="true"
            />
            <label htmlFor={`${filter.id}-mobile`} className="sr-only">
              {filter.placeholder}
            </label>
            <input
              id={`${filter.id}-mobile`}
              type="search"
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              placeholder={filter.placeholder}
              className="w-full rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] py-2 pr-3 pl-8 text-sm font-medium text-[var(--duck-fg)] transition outline-none placeholder:text-[var(--duck-muted)] focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20"
            />
          </div>
        )}
        {(filterMode ?? sort ?? countLabel) && (
          <div className="flex items-center gap-2">
            <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
              <div className="flex items-center gap-1" style={{ width: 'max-content' }}>
                {filterMode &&
                  filterMode.options.map((opt) => {
                    const active = opt.key === filterMode.activeKey;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => filterMode.onChangeKey(opt.key)}
                        className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                          active
                            ? 'border-[var(--duck-border-strong)] bg-[var(--duck-surface-soft)] text-[var(--duck-accent-strong)]'
                            : 'border-[var(--duck-border)] bg-[var(--duck-surface)] text-[var(--duck-muted)] hover:border-[var(--duck-border-strong)] hover:text-[var(--duck-accent-strong)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                {sort && <SortPillGroup sort={sort} />}
              </div>
            </div>
            {countLabel && (
              <span className="ml-auto shrink-0 text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                {countLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SortPillGroup({ sort }: { sort: NonNullable<Props['sort']> }) {
  return (
    <>
      {sort.options.map((opt) => {
        const active = opt.key === sort.activeKey;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              if (active) {
                sort.onToggleDirection();
              } else {
                sort.onChangeKey(opt.key);
              }
            }}
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
              active
                ? 'border-[var(--duck-border-strong)] bg-[var(--duck-surface-soft)] text-[var(--duck-accent-strong)]'
                : 'border-[var(--duck-border)] bg-[var(--duck-surface)] text-[var(--duck-muted)] hover:border-[var(--duck-border-strong)] hover:text-[var(--duck-accent-strong)]'
            }`}
          >
            {opt.label}
            {active && (
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-150 ${sort.descending ? '' : 'rotate-180'}`}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </>
  );
}
