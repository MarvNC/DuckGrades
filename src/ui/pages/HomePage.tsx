import { useEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { BarChart3, List, Search } from 'lucide-react';
import type { SearchLayoutContext } from '../AppLayout';
import { Brand } from '../components/Brand';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { usePageTitle } from '../usePageTitle';
import { prefetchRouteData } from '../../lib/dataClient';
import { prefetchRouteModule } from '../../lib/routePrefetch';

export function HomePage() {
  const { hasActiveSearch, query, setQuery, onSearchInputKeyDown, themePreference, cycleTheme } =
    useOutletContext<SearchLayoutContext>();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wasActiveRef = useRef(hasActiveSearch);

  usePageTitle('University of Oregon Grade Distributions and Statistics');

  useEffect(() => {
    if (wasActiveRef.current && !hasActiveSearch) {
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
    wasActiveRef.current = hasActiveSearch;
  }, [hasActiveSearch]);

  return (
    <section
      className={`relative mx-auto w-full max-w-4xl text-center transition-all duration-300 ease-out ${
        hasActiveSearch
          ? 'max-h-0 -translate-y-6 overflow-hidden py-0 opacity-0 sm:-translate-y-8'
          : 'flex flex-1 items-center justify-center py-12 opacity-100 sm:py-16'
      }`}
    >
      <main className="relative z-10 w-full max-w-4xl">
        <div className="flex flex-col">
          <div className="flex flex-1 flex-col justify-center">
            <div className="fade-in-up mb-4 flex justify-end" style={{ animationDelay: '40ms' }}>
              <ThemeToggleButton themePreference={themePreference} cycleTheme={cycleTheme} />
            </div>

            <section className="fade-in-up" style={{ animationDelay: '80ms' }}>
              <Brand home className="justify-center" />
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed font-medium text-[var(--duck-muted)] sm:text-xl">
                <span>
                  View past grades at the{' '}
                  <span className="font-semibold text-[var(--duck-accent-strong)]">
                    University of Oregon
                  </span>{' '}
                  (not affiliated).
                </span>
              </p>
            </section>

            <section className="fade-in-up mt-8" style={{ animationDelay: '160ms' }}>
              <div className="group relative mx-auto w-full max-w-2xl text-left">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 sm:pl-5">
                  <Search
                    className="h-5 w-5 text-[var(--duck-muted)] transition-colors group-focus-within:text-[var(--duck-accent-strong)]"
                    aria-hidden="true"
                  />
                </div>
                <label htmlFor="search" className="sr-only">
                  Search subjects, courses, or professors
                </label>
                <input
                  id="search"
                  ref={inputRef}
                  className="w-full rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] py-4 pr-3 pl-12 text-base text-[var(--duck-fg)] shadow-lg transition-all outline-none placeholder:text-sm placeholder:text-[var(--duck-muted)] focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/25 sm:pr-4 sm:pl-14 sm:text-lg sm:placeholder:text-base"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                  }}
                  onKeyDown={onSearchInputKeyDown}
                  placeholder="Search by course, professor, or subject..."
                  autoComplete="off"
                  autoFocus={!hasActiveSearch}
                />
              </div>
            </section>

            <section className="fade-in-up mt-7" style={{ animationDelay: '240ms' }}>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <Link
                  to="/subjects"
                  className="inline-flex items-center rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--duck-muted)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--duck-border-strong)] hover:bg-[var(--duck-surface-soft)] hover:text-[var(--duck-accent-strong)] hover:shadow-md"
                  onMouseEnter={() => {
                    prefetchRouteModule('/subjects');
                    prefetchRouteData('/subjects');
                  }}
                  onFocus={() => {
                    prefetchRouteModule('/subjects');
                    prefetchRouteData('/subjects');
                  }}
                  onTouchStart={() => {
                    prefetchRouteModule('/subjects');
                    prefetchRouteData('/subjects');
                  }}
                  onPointerDown={() => {
                    prefetchRouteModule('/subjects');
                    prefetchRouteData('/subjects');
                  }}
                >
                  <List className="mr-2 h-4 w-4" aria-hidden="true" />
                  Browse all subjects
                </Link>
                <Link
                  to="/analytics"
                  className="inline-flex items-center rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--duck-muted)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--duck-border-strong)] hover:bg-[var(--duck-surface-soft)] hover:text-[var(--duck-accent-strong)] hover:shadow-md"
                  onMouseEnter={() => {
                    prefetchRouteModule('/analytics');
                    prefetchRouteData('/analytics');
                  }}
                  onFocus={() => {
                    prefetchRouteModule('/analytics');
                    prefetchRouteData('/analytics');
                  }}
                  onTouchStart={() => {
                    prefetchRouteModule('/analytics');
                    prefetchRouteData('/analytics');
                  }}
                  onPointerDown={() => {
                    prefetchRouteModule('/analytics');
                    prefetchRouteData('/analytics');
                  }}
                >
                  <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
                  View analytics
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </section>
  );
}
