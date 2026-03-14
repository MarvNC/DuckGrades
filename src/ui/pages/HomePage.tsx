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
    <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center py-10 text-center">
      <div className="w-full max-w-2xl">
        <Link to="/" className="brand">
          <span className="brand-duck">Duck</span>
          <span className="brand-grades">Grades</span>
        </Link>
        <h1 className="mt-3 max-w-2xl text-lg font-medium tracking-tight text-[var(--duck-muted)] sm:text-xl">
          View past grades at the University of Oregon.
        </h1>

        <div className="mt-6 w-full text-left">
          <label htmlFor="search" className="sr-only">
            Search subjects, courses, or professors
          </label>
          <input
            id="search"
            ref={inputRef}
            className="w-full rounded-2xl border border-[var(--duck-border)] bg-white px-5 py-4 text-base font-medium shadow-sm outline-none transition focus:border-[#86ac67]"
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
            placeholder="CS, WR 121, or professor name"
            autoComplete="off"
            autoFocus
          />
        </div>

        <div className="mt-4">
          <Link
            to="/subject/CS"
            className="inline-flex items-center rounded-lg border border-[var(--duck-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--duck-fg)] transition hover:bg-[#f9fbf5]"
          >
            Browse subjects
          </Link>
        </div>
      </div>

      {hasQuery ? (
        <div className="mt-6 w-full max-w-2xl space-y-3 text-left">
          {flattened.length === 0 ? (
            <p className="rounded-xl border border-[var(--duck-border)] bg-white px-3 py-3 text-sm text-[var(--duck-muted)]">No matches found.</p>
          ) : null}
          {(["Subjects", "Courses", "Professors"] as const).map((sectionName) => {
            const items = grouped[sectionName];
            if (items.length === 0) {
              return null;
            }
            return (
              <div key={sectionName} className="space-y-2">
                <p className="px-1 text-sm font-medium text-[var(--duck-muted)]">{sectionName}</p>
                {items.map((item) => {
                  const indexValue = flattened.findIndex((candidate) => candidate.key === item.key);
                  return (
                    <Link
                      key={item.key}
                      ref={(element) => {
                        resultRefs.current[indexValue] = element;
                      }}
                      className={`block rounded-xl border px-3 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86ac67] ${
                        activeIndex === indexValue
                          ? "border-[#86ac67] bg-[#effadf]"
                          : "border-[var(--duck-border)] bg-white hover:bg-[#f9fbf5]"
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
                      <p className="text-sm text-[var(--duck-muted)]">{item.subtitle}</p>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
