import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Brand } from "./components/Brand";
import { SearchResultsPage } from "./components/SearchResultsPage";
import { buildSearchItems, type SearchItem, useRankedSearch } from "./components/searchModel";

export type SearchLayoutContext = {
  hasActiveSearch: boolean;
  query: string;
  setQuery: (next: string) => void;
  onSearchInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const headerInputRef = useRef<HTMLInputElement | null>(null);
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const ranked = useRankedSearch(query);
  const { grouped, flattened } = useMemo(() => buildSearchItems(ranked), [ranked]);
  const indexByKey = useMemo(() => new Map(flattened.map((item, index) => [item.key, index])), [flattened]);
  const hasQuery = query.trim().length > 0;
  const showHeader = !isHome || hasQuery;

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
  };

  return (
    <div className="shell-bg relative min-h-screen">
      <div className="home-grid-bg" aria-hidden="true" />
      <div className="home-bg-overlay" aria-hidden="true" />
      {showHeader ? (
        <header className={`relative z-30 mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 ${isHome ? "home-search-header-enter" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Brand />
            <div className="group relative w-full max-w-md flex-1 min-w-[18rem]">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
                <svg
                  className="h-4 w-4 text-slate-400 transition-colors group-focus-within:text-[#124734]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 21l-6-6" />
                  <circle cx="11" cy="11" r="7" />
                </svg>
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
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm font-semibold text-[var(--duck-fg)] shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#4d8152] focus:ring-2 focus:ring-[#4d8152]/20"
              />
            </div>
            <Link
              to="/subjects"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-[#124734]"
            >
              Subjects
            </Link>
          </div>
        </header>
      ) : null}
      <main className={`relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-8 ${showHeader ? "pb-16" : ""}`}>
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
    </div>
  );
}
