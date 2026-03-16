import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, ChevronDown, List, Search } from 'lucide-react';
import { Brand } from './components/Brand';
import { SiteFooter } from './components/SiteFooter';
import { SearchResultsPage } from './components/SearchResultsPage';
import { ThemeToggleButton, type ThemePreference } from './components/ThemeToggleButton';
import { buildSearchItems, type SearchItem, useRankedSearch } from './components/searchModel';
import { prefetchRouteData } from '../lib/dataClient';
import { prefetchRouteModule } from '../lib/routePrefetch';

type ResolvedTheme = 'light' | 'dark';

const THEME_CYCLE: ReadonlyArray<ThemePreference> = ['system', 'light', 'dark'];

export type SortOption = {
  key: string;
  label: string;
};

/** Config for the secondary header row rendered by AppLayout on behalf of the current page. */
export type PageBarConfig = {
  /** Optional local filter/search input embedded in the header */
  filter?: {
    id: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
  };
  /** Optional sort pill buttons */
  sort?: {
    options: SortOption[];
    activeKey: string;
    descending: boolean;
    onChangeKey: (key: string) => void;
    onToggleDirection: () => void;
  };
  /** e.g. "241/241" displayed at the end */
  countLabel?: string;
};

export type SearchLayoutContext = {
  hasActiveSearch: boolean;
  query: string;
  setQuery: (next: string) => void;
  onSearchInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  themePreference: ThemePreference;
  cycleTheme: () => void;
  /** Pages call this (in useLayoutEffect) to register a page bar. Pass null to clear. */
  setPageBar: (config: PageBarConfig | null) => void;
  /** PageControlBar calls this to register its DOM element so the merged header can scroll to it. */
  registerPageControlBarEl: (el: HTMLElement | null) => void;
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const stored = window.localStorage.getItem('duckgrades-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'system';
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [pageBar, setPageBar] = useState<PageBarConfig | null>(null);
  const [mobileSearchFocused, setMobileSearchFocused] = useState(false);
  const [mobileFilterFocused, setMobileFilterFocused] = useState(false);
  const [scrollingDown, setScrollingDown] = useState(false);

  const desktopSearchInputRef = useRef<HTMLInputElement | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const mobileFilterInputRef = useRef<HTMLInputElement | null>(null);
  const pageControlBarElRef = useRef<HTMLElement | null>(null);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement | null>(null);
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [headerHeight, setHeaderHeight] = useState(0);

  const ranked = useRankedSearch(query);
  const { orderedSections, flattened } = useMemo(() => buildSearchItems(ranked), [ranked]);
  const indexByKey = useMemo(
    () => new Map(flattened.map((item, index) => [item.key, index])),
    [flattened]
  );
  const hasQuery = query.trim().length > 0;
  const showHeader = !isHome || hasQuery;
  const resolvedTheme: ResolvedTheme = themePreference === 'system' ? systemTheme : themePreference;
  const hasPageBar = pageBar !== null && !hasQuery;

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('duckgrades-theme', themePreference);
  }, [themePreference]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (activeIndex >= flattened.length && flattened.length > 0) setActiveIndex(0);
  }, [activeIndex, flattened.length]);

  useEffect(() => {
    if (isHome && hasQuery) window.requestAnimationFrame(() => focusInput());
  }, [isHome, hasQuery]);

  useEffect(() => {
    if (!isHome) {
      return;
    }

    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    if (connection?.saveData) {
      return;
    }

    const warm = () => {
      prefetchRouteModule('/subjects');
      prefetchRouteData('/subjects');
      prefetchRouteModule('/analytics');
      if (!connection?.effectiveType || connection.effectiveType === '4g') {
        prefetchRouteData('/analytics');
      }
    };

    const idleApi = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (idleApi.requestIdleCallback) {
      const idleId = idleApi.requestIdleCallback(warm, { timeout: 250 });
      return () => idleApi.cancelIdleCallback?.(idleId);
    }

    const timeoutId = setTimeout(warm, 150);
    return () => clearTimeout(timeoutId);
  }, [isHome]);

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const ae = document.activeElement;
      if (ae && ae !== document.body && ae !== document.documentElement) return;
      if (event.key === 'Backspace') {
        event.preventDefault();
        setQuery((c) => c.slice(0, -1));
        window.requestAnimationFrame(() => focusInput());
        return;
      }
      if (event.key.length !== 1) return;
      event.preventDefault();
      setQuery((c) => `${c}${event.key}`);
      window.requestAnimationFrame(() => focusInput());
    };
    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, []);

  // Scroll direction detection with hysteresis — requires 40px of sustained
  // movement in one direction before committing, preventing flutter on slow/
  // jittery scrolling. Only collapses brand row; does not affect content.
  const accumulatedDelta = useRef(0);
  useEffect(() => {
    const COMMIT_THRESHOLD = 40; // px of sustained movement before state flips
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      // Accumulate in the current direction; reset accumulator on direction change
      if (delta > 0) {
        accumulatedDelta.current = Math.max(0, accumulatedDelta.current) + delta;
      } else if (delta < 0) {
        accumulatedDelta.current = Math.min(0, accumulatedDelta.current) + delta;
      }

      if (accumulatedDelta.current > COMMIT_THRESHOLD) {
        setScrollingDown(true);
        accumulatedDelta.current = 0;
      } else if (accumulatedDelta.current < -COMMIT_THRESHOLD) {
        setScrollingDown(false);
        accumulatedDelta.current = 0;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Reset scroll direction when page bar disappears (route change / back in view)
  useEffect(() => {
    if (!hasPageBar) {
      setScrollingDown(false);
      lastScrollY.current = window.scrollY;
    }
  }, [hasPageBar]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) {
      setHeaderHeight(0);
      return;
    }
    const sync = () => setHeaderHeight(Math.ceil(header.getBoundingClientRect().height));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(header);
    window.addEventListener('resize', sync);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [showHeader, hasPageBar]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function clearQuery() {
    setQuery('');
    setActiveIndex(0);
  }

  function onHeaderBrandClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!hasQuery) return;
    event.preventDefault();
    clearQuery();
    navigate('/');
  }

  function cycleTheme() {
    setThemePreference((current) => {
      const idx = THEME_CYCLE.indexOf(current);
      return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length] ?? 'system';
    });
  }

  function focusInput() {
    const narrow = window.matchMedia('(max-width: 639px)').matches;
    const target = narrow
      ? (mobileSearchInputRef.current ?? desktopSearchInputRef.current)
      : (desktopSearchInputRef.current ?? mobileSearchInputRef.current);
    target?.focus();
  }

  function focusResult(index: number) {
    resultRefs.current[index]?.focus();
  }

  function pickResult(item: SearchItem) {
    clearQuery();
    navigate(item.to);
  }

  function onSearchInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (flattened.length > 0) {
        const n = (activeIndex + 1) % flattened.length;
        setActiveIndex(n);
        focusResult(n);
      }
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (flattened.length > 0) {
        const p = (activeIndex - 1 + flattened.length) % flattened.length;
        setActiveIndex(p);
        focusResult(p);
      }
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = flattened[activeIndex];
      if (chosen) pickResult(chosen);
    }
    if (event.key === 'Tab' && !event.shiftKey && flattened.length > 0 && hasQuery) {
      event.preventDefault();
      setActiveIndex(0);
      focusResult(0);
    }
    if (event.key === 'Escape') {
      clearQuery();
      setMobileSearchFocused(false);
    }
  }

  // ── Derived UI ────────────────────────────────────────────────────────────

  function scrollToPageControlBar() {
    const el = pageControlBarElRef.current;
    if (!el) return;
    // Offset by header height so the bar isn't hidden under the sticky header
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  const outletContext: SearchLayoutContext = {
    hasActiveSearch: hasQuery,
    query,
    setQuery,
    onSearchInputKeyDown,
    themePreference,
    cycleTheme,
    setPageBar,
    registerPageControlBarEl: (el) => {
      pageControlBarElRef.current = el;
    },
  };

  const shellStyle = { '--duck-header-height': `${headerHeight}px` } as CSSProperties;

  const isSubjectsActive =
    location.pathname === '/subjects' || location.pathname.startsWith('/subject/');
  const isAnalyticsActive = location.pathname === '/analytics';

  // Nav pill — full text at lg+, icon-only at sm–lg (md range)
  const navPillBase =
    'inline-flex items-center rounded-full border px-3 py-2 font-semibold transition-all duration-200';
  const navPillIdle =
    'border-[var(--duck-border)] bg-[var(--duck-surface)] text-[var(--duck-muted)] hover:border-[var(--duck-border-strong)] hover:bg-[var(--duck-surface-soft)] hover:text-[var(--duck-accent-strong)]';
  const navPillActive =
    'border-[var(--duck-border-strong)] bg-[var(--duck-surface-soft)] text-[var(--duck-accent-strong)]';

  // Sort pills — shared between desktop and mobile header
  const SortPills = pageBar?.sort ? (
    <div className="flex flex-wrap items-center gap-1">
      {pageBar.sort.options.map((opt) => {
        const active = opt.key === pageBar.sort!.activeKey;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              if (active) {
                pageBar.sort!.onToggleDirection();
              } else {
                pageBar.sort!.onChangeKey(opt.key);
              }
            }}
            className={`inline-flex items-center gap-0.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
              active
                ? 'border-[var(--duck-border-strong)] bg-[var(--duck-surface-soft)] text-[var(--duck-accent-strong)]'
                : 'border-[var(--duck-border)] bg-[var(--duck-surface)] text-[var(--duck-muted)] hover:border-[var(--duck-border-strong)] hover:text-[var(--duck-accent-strong)]'
            }`}
          >
            {opt.label}
            {active && (
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-150 ${pageBar.sort!.descending ? '' : 'rotate-180'}`}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  ) : null;

  // Desktop page bar row: filter input + sort pills + count
  const DesktopPageBarRow =
    hasPageBar && (pageBar?.filter ?? pageBar?.sort) ? (
      <div className="mt-2.5 flex items-center gap-3 border-t border-[var(--duck-border)]/50 pt-2.5">
        {pageBar?.filter && (
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--duck-muted)]"
              aria-hidden="true"
            />
            <label htmlFor={pageBar.filter.id} className="sr-only">
              {pageBar.filter.placeholder}
            </label>
            <input
              id={pageBar.filter.id}
              type="search"
              value={pageBar.filter.value}
              onChange={(e) => pageBar.filter!.onChange(e.target.value)}
              placeholder={pageBar.filter.placeholder}
              className="w-full rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] py-1.5 pr-3 pl-8 text-sm font-medium text-[var(--duck-fg)] transition outline-none placeholder:text-[var(--duck-muted)] focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20"
            />
          </div>
        )}
        {pageBar?.sort && <div className="flex shrink-0 items-center gap-1">{SortPills}</div>}
        {pageBar?.countLabel && (
          <span className="shrink-0 text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
            {pageBar.countLabel}
          </span>
        )}
      </div>
    ) : null;

  // Mobile top bar page bar row: shown when scrolled past inline PageControlBar.
  // Layout: [filter flex-1] [sort pills shrink-0, right-aligned] [count shrink-0]
  // On filter focus: pills + count fade out, filter expands to fill the row.
  const MobilePageBarRow = hasPageBar ? (
    <div className="flex items-center gap-2 border-t border-[var(--duck-border)]/50 px-3 py-2">
      {/* Filter input — guaranteed min width, takes remaining space */}
      {pageBar?.filter && (
        <div className="relative min-w-[4.5rem] flex-1">
          <Search
            className={`pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 transition-colors duration-200 ${mobileFilterFocused || pageBar.filter.value ? 'text-[var(--duck-accent-strong)]' : 'text-[var(--duck-muted)]'}`}
            aria-hidden="true"
          />
          <label htmlFor="mobile-header-filter" className="sr-only">
            {pageBar.filter.placeholder}
          </label>
          <input
            id="mobile-header-filter"
            ref={mobileFilterInputRef}
            type="search"
            value={pageBar.filter.value}
            onChange={(e) => pageBar.filter!.onChange(e.target.value)}
            onFocus={() => setMobileFilterFocused(true)}
            onBlur={() => setTimeout(() => setMobileFilterFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                pageBar.filter!.onChange('');
                mobileFilterInputRef.current?.blur();
              }
            }}
            placeholder="Filter..."
            className={`w-full rounded-xl border py-1.5 pr-3 pl-7 text-sm font-medium text-[var(--duck-fg)] transition-all duration-200 outline-none placeholder:text-[var(--duck-muted)] ${mobileFilterFocused || pageBar.filter.value ? 'border-[var(--duck-focus)] bg-[var(--duck-surface)] ring-2 ring-[var(--duck-focus)]/20' : 'border-[var(--duck-border)] bg-[var(--duck-surface)]'}`}
          />
        </div>
      )}

      {/* Sort pills + count — right-aligned, shrinks to let filter breathe; pills scroll horizontally */}
      <div
        className={`flex min-w-0 shrink items-center gap-1.5 transition-all duration-200 ease-out ${mobileFilterFocused ? 'pointer-events-none w-0 overflow-hidden opacity-0' : 'opacity-100'}`}
      >
        {pageBar?.sort && pageBar.sort.options.find((o) => o.key === pageBar.sort!.activeKey) && (
          <button
            type="button"
            onClick={scrollToPageControlBar}
            title="Scroll to sort options"
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-[var(--duck-border-strong)] bg-[var(--duck-surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--duck-accent-strong)] transition-all duration-150 active:scale-95"
          >
            {pageBar.sort.options.find((o) => o.key === pageBar.sort!.activeKey)!.label}
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-150 ${pageBar.sort.descending ? '' : 'rotate-180'}`}
              aria-hidden="true"
            />
          </button>
        )}
        {pageBar?.countLabel && (
          <span className="shrink-0 text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
            {pageBar.countLabel}
          </span>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="shell-bg relative flex min-h-[100dvh] flex-col" style={shellStyle}>
      <div className="home-grid-bg" aria-hidden="true" />
      <div className="home-bg-overlay" aria-hidden="true" />

      {/* ── Sticky header ── */}
      {showHeader ? (
        <header ref={headerRef} className="sticky top-0 z-30 w-full px-2 pt-3 sm:px-8 sm:pt-4">
          {/* ── Desktop (sm+) ── */}
          <div
            className={`mx-auto mb-2 hidden w-full max-w-6xl flex-col rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)]/55 px-5 py-3.5 shadow-[0_6px_18px_-14px_rgba(0,0,0,0.45)] backdrop-blur-lg backdrop-saturate-125 sm:mb-3 sm:flex lg:px-8 lg:py-4 ${isHome ? 'home-search-header-enter' : ''}`}
          >
            {/* Main nav row */}
            <div className="flex items-center gap-2 lg:gap-4">
              <Brand onClick={onHeaderBrandClick} className="shrink-0" hideWordmarkOnTiny />
              {/* Search — takes all available space */}
              <div className="group relative min-w-0 flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5 lg:pl-4">
                  <Search
                    className="h-4 w-4 text-[var(--duck-muted)] transition-colors group-focus-within:text-[var(--duck-accent-strong)]"
                    aria-hidden="true"
                  />
                </div>
                <label htmlFor="global-search-desktop" className="sr-only">
                  Search subjects, courses, or professors
                </label>
                <input
                  id="global-search-desktop"
                  ref={desktopSearchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onSearchInputKeyDown}
                  placeholder="Search courses, professors, subjects..."
                  autoComplete="off"
                  className="w-full rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] py-2 pr-3 pl-9 text-sm font-semibold text-[var(--duck-fg)] shadow-sm transition-all outline-none placeholder:text-[var(--duck-muted)] focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20 lg:rounded-2xl lg:py-2.5 lg:pl-10"
                />
              </div>
              {/* Nav buttons — icon+label at lg, icon-only at sm–lg */}
              <div className="flex shrink-0 items-center gap-1 lg:gap-2">
                <ThemeToggleButton themePreference={themePreference} cycleTheme={cycleTheme} />
                <Link
                  to="/subjects"
                  className={`${navPillBase} ${isSubjectsActive ? navPillActive : navPillIdle}`}
                  onMouseEnter={() => {
                    prefetchRouteModule('/subjects');
                    prefetchRouteData('/subjects');
                  }}
                  onFocus={() => {
                    prefetchRouteModule('/subjects');
                    prefetchRouteData('/subjects');
                  }}
                  onPointerDown={() => {
                    prefetchRouteModule('/subjects');
                    prefetchRouteData('/subjects');
                  }}
                >
                  <List className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden text-sm lg:inline">Subjects</span>
                  <span className="sr-only lg:hidden">Subjects</span>
                </Link>
                <Link
                  to="/analytics"
                  className={`${navPillBase} ${isAnalyticsActive ? navPillActive : navPillIdle}`}
                  onMouseEnter={() => {
                    prefetchRouteModule('/analytics');
                    prefetchRouteData('/analytics');
                  }}
                  onFocus={() => {
                    prefetchRouteModule('/analytics');
                    prefetchRouteData('/analytics');
                  }}
                  onPointerDown={() => {
                    prefetchRouteModule('/analytics');
                    prefetchRouteData('/analytics');
                  }}
                >
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden text-sm lg:inline">Analytics</span>
                  <span className="sr-only lg:hidden">Analytics</span>
                </Link>
              </div>
            </div>
            {/* Page bar row */}
            {DesktopPageBarRow}
          </div>

          {/* ── Mobile top bar (below sm) ── */}
          <div
            className={`mx-auto mb-2 flex w-full max-w-6xl flex-col rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)]/55 shadow-[0_6px_18px_-14px_rgba(0,0,0,0.45)] backdrop-blur-lg backdrop-saturate-125 sm:hidden ${isHome ? 'home-search-header-enter' : ''}`}
          >
            {/* Brand + theme — collapses when scrolling down past inline controls, restores on scroll up.
                Uses grid-template-rows 1fr→0fr for a smooth exact-height animation (no fixed max-h guess). */}
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${hasPageBar && scrollingDown ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2">
                  <Brand onClick={onHeaderBrandClick} className="shrink-0" />
                  <ThemeToggleButton themePreference={themePreference} cycleTheme={cycleTheme} />
                </div>
              </div>
            </div>
            {MobilePageBarRow}
          </div>
        </header>
      ) : null}

      {/* ── Mobile bottom floating island (sm:hidden) ── */}
      {showHeader ? (
        <div
          className={`fixed z-40 transition-all duration-300 ease-out sm:hidden ${mobileSearchFocused ? 'inset-x-2 top-2 bottom-auto' : 'inset-x-3 top-auto bottom-4'}`}
        >
          {/* Main island pill */}
          <div
            className={`mx-auto flex w-full items-center rounded-2xl border bg-[var(--duck-surface)]/90 shadow-[0_8px_32px_-6px_rgba(0,0,0,0.22)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ease-out ${mobileSearchFocused ? 'max-w-full border-[var(--duck-focus)] ring-2 ring-[var(--duck-focus)]/20' : 'max-w-lg border-[var(--duck-border)]'}`}
          >
            {/* Global search input */}
            <div className="group relative min-w-0 flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
                <Search
                  className={`h-4 w-4 transition-colors duration-200 ${mobileSearchFocused ? 'text-[var(--duck-accent-strong)]' : 'text-[var(--duck-muted)]'}`}
                  aria-hidden="true"
                />
              </div>
              <label htmlFor="global-search-mobile" className="sr-only">
                Search subjects, courses, or professors
              </label>
              <input
                id="global-search-mobile"
                ref={mobileSearchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchInputKeyDown}
                onFocus={() => setMobileSearchFocused(true)}
                onBlur={() => setTimeout(() => setMobileSearchFocused(false), 150)}
                placeholder={
                  mobileSearchFocused ? 'Search courses, professors, subjects...' : 'Search...'
                }
                autoComplete="off"
                className="w-full rounded-l-2xl bg-transparent py-3.5 pr-3 pl-10 text-sm font-semibold text-[var(--duck-fg)] outline-none placeholder:text-[var(--duck-muted)]"
              />
            </div>
            {/* Nav buttons — hidden when focused */}
            {!mobileSearchFocused && (
              <>
                <div className="h-6 w-px shrink-0 bg-[var(--duck-border)]" aria-hidden="true" />
                <Link
                  to="/subjects"
                  className={`flex h-12 w-12 shrink-0 items-center justify-center transition-all duration-200 active:scale-90 ${isSubjectsActive ? 'text-[var(--duck-accent-strong)]' : 'text-[var(--duck-muted)] hover:text-[var(--duck-accent-strong)]'}`}
                  aria-label="Browse all subjects"
                  onTouchStart={() => {
                    prefetchRouteModule('/subjects');
                    prefetchRouteData('/subjects');
                  }}
                >
                  <List className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  to="/analytics"
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-r-2xl transition-all duration-200 active:scale-90 ${isAnalyticsActive ? 'text-[var(--duck-accent-strong)]' : 'text-[var(--duck-muted)] hover:text-[var(--duck-accent-strong)]'}`}
                  aria-label="View analytics"
                  onTouchStart={() => {
                    prefetchRouteModule('/analytics');
                    prefetchRouteData('/analytics');
                  }}
                >
                  <BarChart3 className="h-5 w-5" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 sm:px-8">
        {isHome || !hasQuery ? <Outlet context={outletContext} /> : null}
        {hasQuery ? (
          <SearchResultsPage
            orderedSections={orderedSections}
            flattened={flattened}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            clearQuery={clearQuery}
            focusInput={focusInput}
            pickResult={pickResult}
            resultRefs={resultRefs}
            indexByKey={indexByKey}
            query={query}
          />
        ) : null}
      </main>
      <div className={showHeader ? 'pb-28 sm:pb-0' : ''}>
        <SiteFooter />
      </div>
    </div>
  );
}
