import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Brand } from "./components/Brand";
import { SiteFooter } from "./components/SiteFooter";
import { SearchResultsPage } from "./components/SearchResultsPage";
import { ThemeToggleButton, type ThemePreference } from "./components/ThemeToggleButton";
import { buildSearchItems, type SearchItem, useRankedSearch } from "./components/searchModel";

type ResolvedTheme = "light" | "dark";

const THEME_CYCLE: ReadonlyArray<ThemePreference> = ["system", "light", "dark"];

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
  const isHome = location.pathname === "/";
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const stored = window.localStorage.getItem("duckgrades-theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }

    return "system";
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }

    return "light";
  });
  const headerInputRef = useRef<HTMLInputElement | null>(null);
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const ranked = useRankedSearch(query);
  const { grouped, flattened } = useMemo(() => buildSearchItems(ranked), [ranked]);
  const indexByKey = useMemo(() => new Map(flattened.map((item, index) => [item.key, index])), [flattened]);
  const hasQuery = query.trim().length > 0;
  const showHeader = !isHome || hasQuery;
  const resolvedTheme: ResolvedTheme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", onChange);
    return () => {
      mediaQuery.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("duckgrades-theme", themePreference);
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
        headerInputRef.current?.focus();
      });
    }
  }, [isHome, hasQuery]);

  function clearQuery() {
    setQuery("");
    setActiveIndex(0);
  }

  function onHeaderBrandClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!hasQuery) {
      return;
    }

    event.preventDefault();
    clearQuery();
    navigate("/");
  }

  function cycleTheme() {
    setThemePreference((current) => {
      const currentIndex = THEME_CYCLE.indexOf(current);
      const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
      return THEME_CYCLE[nextIndex] ?? "system";
    });
  }

  function focusInput() {
    headerInputRef.current?.focus();
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
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flattened.length > 0) {
        const next = (activeIndex + 1) % flattened.length;
        setActiveIndex(next);
        focusResult(next);
      }
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flattened.length > 0) {
        const prev = (activeIndex - 1 + flattened.length) % flattened.length;
        setActiveIndex(prev);
        focusResult(prev);
      }
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const chosen = flattened[activeIndex];
      if (chosen) {
        pickResult(chosen);
      }
    }
    if (event.key === "Tab" && !event.shiftKey && flattened.length > 0 && hasQuery) {
      event.preventDefault();
      setActiveIndex(0);
      focusResult(0);
    }
    if (event.key === "Escape") {
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

  return (
    <div className="shell-bg relative flex min-h-screen flex-col">
      <div className="home-grid-bg" aria-hidden="true" />
      <div className="home-bg-overlay" aria-hidden="true" />
      {showHeader ? (
        <header className={`relative z-30 mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 ${isHome ? "home-search-header-enter" : ""}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Brand onClick={onHeaderBrandClick} />
            <div className="group relative w-full flex-1 sm:min-w-0">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
                <Search className="h-4 w-4 text-[var(--duck-muted)] transition-colors group-focus-within:text-[var(--duck-accent-strong)]" aria-hidden="true" />
              </div>
              <label htmlFor="global-search" className="sr-only">
                Search subjects, courses, or professors
              </label>
              <input
                id="global-search"
                ref={headerInputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                onKeyDown={onSearchInputKeyDown}
                placeholder="Search by course, professor, or subject..."
                autoComplete="off"
                autoFocus={isHome && hasQuery}
                className="w-full rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] py-2.5 pr-4 pl-10 text-sm font-semibold text-[var(--duck-fg)] shadow-sm outline-none transition-all placeholder:text-[var(--duck-muted)] focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20"
              />
            </div>
            <div className="flex items-center justify-end gap-2 sm:flex-none">
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
      <main className={`relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 sm:px-8 ${showHeader ? "pb-16" : ""}`}>
        {isHome || !hasQuery ? <Outlet context={outletContext} /> : null}
        {hasQuery ? (
          <SearchResultsPage
            grouped={grouped}
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
