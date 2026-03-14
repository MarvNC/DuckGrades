import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSearchIndex } from "../../lib/dataClient";
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
  const quickLinks = flattened.slice(0, 3);
  const hasQuery = query.trim().length > 0;

  function focusResult(indexValue: number) {
    const target = resultRefs.current[indexValue];
    if (target) {
      target.focus();
    }
  }

  return (
    <section className="space-y-8">
      <div className="hero-card relative overflow-hidden rounded-3xl border border-[var(--duck-border)] p-7 shadow-lg sm:p-10">
        <div className="hero-glow" aria-hidden="true" />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--duck-muted)]">University of Oregon grade explorer</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
          Search-first grade insights, rebuilt for static hosting.
        </h1>
        <p className="mt-4 max-w-xl text-sm text-[var(--duck-muted)] sm:text-base">
          DuckGrades is tuned for free, long-term hosting on GitHub Pages and Cloudflare Pages with JSON shards and route-level fetches.
        </p>
        <div className="mt-7 rounded-2xl border border-[var(--duck-border)] bg-white/90 p-4 shadow-sm">
          <label htmlFor="search" className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--duck-muted)]">
            Search subjects, courses, or professors
          </label>
          <input
            id="search"
            ref={inputRef}
            className="mt-2 w-full rounded-xl border border-[var(--duck-border)] px-4 py-3 text-base font-medium outline-none transition focus:border-[#86ac67]"
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
            placeholder="Try CS, WR 121, or a professor name"
            autoComplete="off"
          />

          {hasQuery ? (
            <div className="mt-3 space-y-3">
              {flattened.length === 0 ? <p className="px-2 py-3 text-sm text-[var(--duck-muted)]">No matches found.</p> : null}
              {(["Subjects", "Courses", "Professors"] as const).map((sectionName) => {
                const items = grouped[sectionName];
                if (items.length === 0) {
                  return null;
                }
                return (
                  <div key={sectionName} className="space-y-2">
                    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--duck-muted)]">{sectionName}</p>
                    {items.map((item) => {
                      const indexValue = flattened.findIndex((candidate) => candidate.key === item.key);
                      return (
                        <Link
                          key={item.key}
                          ref={(element) => {
                            resultRefs.current[indexValue] = element;
                          }}
                          className={`block rounded-xl border px-3 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86ac67] ${
                            activeIndex === indexValue
                              ? "border-[#86ac67] bg-[#effadf]"
                              : "border-transparent bg-[#f9fbf5] hover:border-[var(--duck-border)]"
                          }`}
                          to={item.to}
                          onMouseEnter={() => setActiveIndex(indexValue)}
                          onFocus={() => setActiveIndex(indexValue)}
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
                          <p className="text-sm font-bold text-[var(--duck-fg)]">{item.label}</p>
                          <p className="text-xs text-[var(--duck-muted)]">{item.subtitle}</p>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-2xl border border-[var(--duck-border)] bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold text-[var(--duck-muted)]">{item.section}</p>
            <p className="mt-2 text-xl font-bold text-[var(--duck-fg)]">{item.label}</p>
            <p className="mt-1 text-sm text-[var(--duck-muted)]">{item.subtitle}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
