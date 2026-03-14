import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSearchIndex, prefetchRouteData } from "../../lib/dataClient";
import { searchIndex } from "../../lib/search";

type SearchItem = {
  key: string;
  label: string;
  subtitle: string;
  to: string;
  section: "Subjects" | "Courses" | "Professors";
};

export function HomePage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [index, setIndex] = useState<Awaited<ReturnType<typeof getSearchIndex>> | null>(null);

  useEffect(() => {
    if (index) {
      return;
    }
    void getSearchIndex().then(setIndex).catch(() => setIndex({ subjects: [], courses: [], professors: [] }));
  }, [index]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query);
      setActiveIndex(0);
    }, 275);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const ranked = useMemo(() => {
    if (!index) {
      return { subjects: [], courses: [], professors: [] };
    }
    return searchIndex(index, debouncedQuery);
  }, [index, debouncedQuery]);

  const grouped = useMemo(
    () => ({
      Subjects: ranked.subjects.map((subject) => ({
        key: `subject:${subject.code}`,
        label: subject.code,
        subtitle: `${subject.popularity} sections indexed`,
        to: `/subject/${subject.code}`,
        section: "Subjects" as const,
      })),
      Courses: ranked.courses.map((course) => ({
        key: `course:${course.code}`,
        label: course.code,
        subtitle: course.title,
        to: `/course/${course.code}`,
        section: "Courses" as const,
      })),
      Professors: ranked.professors.map((professor) => ({
        key: `professor:${professor.id}`,
        label: professor.name,
        subtitle: `${professor.popularity} students`,
        to: `/professor/${professor.id}`,
        section: "Professors" as const,
      })),
    }),
    [ranked],
  );

  const flattened: SearchItem[] = [...grouped.Subjects, ...grouped.Courses, ...grouped.Professors];
  const hasQuery = query.trim().length > 0;

  function focusResult(indexValue: number) {
    const target = resultRefs.current[indexValue];
    if (target) {
      target.focus();
    }
  }

  return (
    <section className="relative mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center py-12 text-center sm:py-16">
      <main className="relative z-10 w-full max-w-4xl">
        <section className="fade-in-up" style={{ animationDelay: "80ms" }}>
          <Link to="/" className="brand brand-home justify-center">
            <span className="brand-duck">Duck</span>
            <span className="brand-grades">Grades</span>
          </Link>
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
              className="w-full rounded-2xl border border-slate-200 bg-white py-5 pr-4 pl-14 text-lg text-slate-900 shadow-lg shadow-slate-200/35 outline-none transition-all placeholder:text-slate-400 focus:border-[#4d8152] focus:ring-2 focus:ring-[#4d8152]/25"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              onKeyDown={(event) => {
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
                    navigate(chosen.to);
                  }
                }
                if (event.key === "Tab" && !event.shiftKey && flattened.length > 0 && hasQuery) {
                  event.preventDefault();
                  setActiveIndex(0);
                  focusResult(0);
                }
                if (event.key === "Escape") {
                  setQuery("");
                  setDebouncedQuery("");
                  setActiveIndex(0);
                }
              }}
              placeholder="Search by course, professor, or subject..."
              autoComplete="off"
              autoFocus
            />
          </div>
        </section>

        <section className="fade-in-up mt-7" style={{ animationDelay: "240ms" }}>
          <Link
            to="/subject/CS"
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

        {hasQuery ? (
          <section className="fade-in-up mx-auto mt-8 w-full max-w-2xl space-y-3 text-left" style={{ animationDelay: "320ms" }}>
            {flattened.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">No matches found.</p>
            ) : null}
            {(["Subjects", "Courses", "Professors"] as const).map((sectionName) => {
              const items = grouped[sectionName];
              if (items.length === 0) {
                return null;
              }
              return (
                <div key={sectionName} className="space-y-2">
                  <p className="px-1 text-sm font-medium text-slate-500">{sectionName}</p>
                  {items.map((item) => {
                    const indexValue = flattened.findIndex((candidate) => candidate.key === item.key);
                    return (
                      <Link
                        key={item.key}
                        ref={(element) => {
                          resultRefs.current[indexValue] = element;
                        }}
                        className={`block rounded-xl border px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86ac67] ${
                          activeIndex === indexValue
                            ? "border-[#86ac67] bg-[#effadf]"
                            : "border-slate-200 bg-white hover:bg-[#f9fbf5]"
                        }`}
                        to={item.to}
                        onMouseEnter={() => {
                          setActiveIndex(indexValue);
                          prefetchRouteData(item.to);
                        }}
                        onFocus={() => {
                          setActiveIndex(indexValue);
                          prefetchRouteData(item.to);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowDown") {
                            event.preventDefault();
                            const next = (indexValue + 1) % flattened.length;
                            setActiveIndex(next);
                            focusResult(next);
                          }
                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            const prev = (indexValue - 1 + flattened.length) % flattened.length;
                            setActiveIndex(prev);
                            focusResult(prev);
                          }
                          if (event.key === "Tab" && event.shiftKey && indexValue === 0) {
                            event.preventDefault();
                            inputRef.current?.focus();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            setQuery("");
                            setDebouncedQuery("");
                            setActiveIndex(0);
                            inputRef.current?.focus();
                          }
                        }}
                      >
                        <p className="text-base font-semibold text-[var(--duck-fg)]">{item.label}</p>
                        <p className="text-sm text-slate-500">{item.subtitle}</p>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </section>
        ) : null}

        <footer className="fade-in-up mx-auto mt-20 w-full max-w-2xl border-t border-slate-200/70 pt-8" style={{ animationDelay: "400ms" }}>
          <p className="text-sm text-slate-500">Data obtained via FOIA request.</p>
        </footer>
      </main>
    </section>
  );
}
