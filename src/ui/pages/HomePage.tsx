import { useEffect, useRef } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { SearchLayoutContext } from "../AppLayout";
import { Brand } from "../components/Brand";
import { usePageTitle } from "../usePageTitle";

export function HomePage() {
  const { hasActiveSearch, query, setQuery, onSearchInputKeyDown } = useOutletContext<SearchLayoutContext>();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wasActiveRef = useRef(hasActiveSearch);

  usePageTitle("University of Oregon Grade Distributions and Statistics");

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
          ? "max-h-0 -translate-y-6 overflow-hidden py-0 opacity-0 sm:-translate-y-8"
          : "flex flex-1 items-center justify-center py-12 opacity-100 sm:py-16"
      }`}
    >
      <main className="relative z-10 w-full max-w-4xl">
        <div className="flex flex-col">
          <div className="flex flex-1 flex-col justify-center">
            <section className="fade-in-up" style={{ animationDelay: "80ms" }}>
              <Brand home className="justify-center" />
              <p className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-relaxed text-[#4a5d49] sm:text-xl">
                View past grades at the <span className="font-semibold text-[#124734]">University of Oregon</span>.
              </p>
            </section>

            <section className="fade-in-up mt-8" style={{ animationDelay: "160ms" }}>
              <div className="group relative mx-auto w-full max-w-2xl text-left">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
                  <svg
                    className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-[#124734]"
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
                <label htmlFor="search" className="sr-only">
                  Search subjects, courses, or professors
                </label>
                <input
                  id="search"
                  ref={inputRef}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-4 pr-4 pl-14 text-lg text-slate-900 shadow-lg shadow-slate-200/35 outline-none transition-all placeholder:text-slate-400 focus:border-[#4d8152] focus:ring-2 focus:ring-[#4d8152]/25"
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

            <section className="fade-in-up mt-7" style={{ animationDelay: "240ms" }}>
              <Link
                to="/subjects"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-[#124734] hover:shadow-md"
              >
                <svg
                  className="mr-2 h-4 w-4 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M13 18h7" />
                </svg>
                Browse all subjects
              </Link>
            </section>
          </div>

        </div>
      </main>
    </section>
  );
}
