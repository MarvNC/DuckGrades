import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Brand } from './components/Brand';
import { SiteFooter } from './components/SiteFooter';
import { SearchResultsPage } from './components/SearchResultsPage';
import { ThemeToggleButton, type ThemePreference } from './components/ThemeToggleButton';
import { buildSearchItems, type SearchItem, useRankedSearch } from './components/searchModel';

type ResolvedTheme = 'light' | 'dark';

const THEME_CYCLE: ReadonlyArray<ThemePreference> = ['system', 'light', 'dark'];

export type SearchLayoutContext = {
  hasActiveSearch: boolean;
  query: string;
  setQuery: (next: string) => void;
  onSearchInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  themePreference: ThemePreference;
  cycleTheme: () => void;
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const stored = window.localStorage.getItem('duckgrades-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }

    return 'system';
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  });
  const desktopSearchInputRef = useRef<HTMLInputElement | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', onChange);
    return () => {
      mediaQuery.removeEventListener('change', onChange);
    };
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
    if (activeIndex >= flattened.length && flattened.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, flattened.length]);

  useEffect(() => {
    if (isHome && hasQuery) {
      window.requestAnimationFrame(() => {
        focusInput();
      });
    }
  }, [isHome, hasQuery]);

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) {
        return;
      }

      const isModified = event.metaKey || event.ctrlKey || event.altKey;
      if (isModified) {
        return;
      }

      const activeElement = document.activeElement;
      const hasNoFocusedElement =
        !activeElement ||
        activeElement === document.body ||
        activeElement === document.documentElement;

      if (!hasNoFocusedElement) {
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        setQuery((current) => current.slice(0, -1));
        window.requestAnimationFrame(() => {
          focusInput();
        });
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      event.preventDefault();
      setQuery((current) => `${current}${event.key}`);
      window.requestAnimationFrame(() => {
        focusInput();
      });
    };

    window.addEventListener('keydown', onWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown);
    };
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) {
      setHeaderHeight(0);
      return;
    }

    const syncHeaderHeight = () => {
      setHeaderHeight(Math.ceil(header.getBoundingClientRect().height));
    };

    syncHeaderHeight();

    const observer = new ResizeObserver(() => {
      syncHeaderHeight();
    });

    observer.observe(header);
    window.addEventListener('resize', syncHeaderHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncHeaderHeight);
    };
  }, [showHeader]);

  function clearQuery() {
    setQuery('');
    setActiveIndex(0);
  }

  function onHeaderBrandClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!hasQuery) {
      return;
    }

    event.preventDefault();
    clearQuery();
    navigate('/');
  }

  function cycleTheme() {
    setThemePreference((current) => {
      const currentIndex = THEME_CYCLE.indexOf(current);
      const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
      return THEME_CYCLE[nextIndex] ?? 'system';
    });
  }

  function focusInput() {
    const isNarrowViewport = window.matchMedia('(max-width: 639px)').matches;
    const target = isNarrowViewport
      ? (mobileSearchInputRef.current ?? desktopSearchInputRef.current)
      : (desktopSearchInputRef.current ?? mobileSearchInputRef.current);
    target?.focus();
  }

  function focusResult(index: number) {
    const target = resultRefs.current[index];
    if (target) {
      target.focus();
    }
  }

  function pickResult(item: SearchItem) {
    clearQuery();
    navigate(item.to);
  }

  function onSearchInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (flattened.length > 0) {
        const next = (activeIndex + 1) % flattened.length;
        setActiveIndex(next);
        focusResult(next);
      }
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (flattened.length > 0) {
        const prev = (activeIndex - 1 + flattened.length) % flattened.length;
        setActiveIndex(prev);
        focusResult(prev);
      }
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = flattened[activeIndex];
      if (chosen) {
        pickResult(chosen);
      }
    }
    if (event.key === 'Tab' && !event.shiftKey && flattened.length > 0 && hasQuery) {
      event.preventDefault();
      setActiveIndex(0);
      focusResult(0);
    }
    if (event.key === 'Escape') {
      clearQuery();
    }
  }

  const outletContext: SearchLayoutContext = {
    hasActiveSearch: hasQuery,
    query,
    setQuery,
    onSearchInputKeyDown,
    themePreference,
    cycleTheme,
  };

  const shellStyle = {
    '--duck-header-height': `${headerHeight}px`,
  } as CSSProperties;

  return (
    <div className="shell-bg relative flex min-h-screen flex-col" style={shellStyle}>
      <div className="home-grid-bg" aria-hidden="true" />
      <div className="home-bg-overlay" aria-hidden="true" />
      {showHeader ? (
        <header ref={headerRef} className="sticky top-0 z-30 w-full px-2 pt-3 sm:px-8 sm:pt-4">
          <div
            className={`mx-auto mb-2 flex w-full max-w-6xl items-center gap-2 rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)]/55 px-3 py-2.5 shadow-[0_6px_18px_-14px_rgba(0,0,0,0.45)] backdrop-blur-lg backdrop-saturate-125 sm:mb-3 sm:gap-4 sm:px-8 sm:py-5 ${isHome ? 'home-search-header-enter' : ''}`}
          >
            <Brand onClick={onHeaderBrandClick} className="shrink-0" hideWordmarkOnTiny />
            <div className="group relative hidden flex-1 sm:block sm:min-w-0">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
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
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                onKeyDown={onSearchInputKeyDown}
                placeholder="Search by course, professor, or subject..."
                autoComplete="off"
                className="w-full rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] py-2.5 pr-4 pl-10 text-sm font-semibold text-[var(--duck-fg)] shadow-sm transition-all outline-none placeholder:text-[var(--duck-muted)] focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20"
              />
            </div>
            <div className="ml-auto flex shrink-0 items-center justify-end gap-2 sm:flex-none">
              <ThemeToggleButton themePreference={themePreference} cycleTheme={cycleTheme} />
              <Link
                to="/subjects"
                className="inline-flex items-center rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)] px-4 py-2 text-sm font-semibold text-[var(--duck-muted)] transition-all duration-200 hover:border-[var(--duck-border-strong)] hover:bg-[var(--duck-surface-soft)] hover:text-[var(--duck-accent-strong)]"
              >
                Subjects
              </Link>
            </div>
          </div>
        </header>
      ) : null}
      {showHeader ? (
        <div className="fixed inset-x-1 bottom-2 z-40 sm:hidden">
          <div className="group relative mx-auto w-full max-w-6xl">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
              <Search
                className="h-4 w-4 text-[var(--duck-muted)] transition-colors group-focus-within:text-[var(--duck-accent-strong)]"
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
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              onKeyDown={onSearchInputKeyDown}
              placeholder="Search by course, professor, or subject..."
              autoComplete="off"
              className="w-full rounded-2xl border border-[var(--duck-border-strong)] bg-[var(--duck-surface)]/95 py-3.5 pr-4 pl-10 text-sm font-semibold text-[var(--duck-fg)] shadow-lg backdrop-blur outline-none placeholder:text-[var(--duck-muted)] focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20"
            />
          </div>
        </div>
      ) : null}
      <main
        className={`relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 sm:px-8 ${showHeader ? 'pb-24 sm:pb-16' : ''}`}
      >
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
      <SiteFooter />
    </div>
  );
}
