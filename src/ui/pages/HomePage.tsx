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
          : "flex min-h-screen items-center justify-center py-12 opacity-100 sm:py-16"
      }`}
    >
      <main className="relative z-10 w-full max-w-4xl">
        <div className="flex min-h-screen flex-col">
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

          <footer className="fade-in-up mx-auto mt-10 w-full max-w-2xl border-t border-slate-200/70 pb-6 pt-8" style={{ animationDelay: "400ms" }}>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
              <p className="text-sm text-slate-500">Data obtained via FOIA request. Some data is not available due to anonymization by the University.</p>
              <a
                href="https://github.com/MarvNC/DuckGrades"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 shadow-sm shadow-slate-200/50 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-[#124734] hover:shadow-md"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.03-.01-1.87-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.09 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.74 0 0 .85-.28 2.78 1.05A9.43 9.43 0 0 1 12 6.84c.85 0 1.7.12 2.5.35 1.92-1.33 2.77-1.05 2.77-1.05.56 1.43.21 2.48.1 2.74.64.72 1.03 1.63 1.03 2.75 0 3.96-2.34 4.82-4.58 5.07.36.31.68.93.68 1.88 0 1.36-.01 2.45-.01 2.79 0 .27.18.59.69.49A10.28 10.28 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
                </svg>
                View on GitHub
              </a>
            </div>
          </footer>
        </div>
      </main>
    </section>
  );
}
