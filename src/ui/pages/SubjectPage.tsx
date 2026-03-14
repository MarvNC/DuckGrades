import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getSubjectShard, type SubjectShard } from "../../lib/dataClient";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";

export function SubjectPage() {
  const listRef = useRef<HTMLDivElement | null>(null);
  const { code } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subject, setSubject] = useState<SubjectShard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(560);

  const sort = searchParams.get("sort") ?? "code";
  const direction = searchParams.get("dir") ?? "asc";
  const year = searchParams.get("year") ?? "all";
  const term = searchParams.get("term") ?? "all";

  useEffect(() => {
    if (!code) {
      return;
    }
    setLoadState("loading");
    void getSubjectShard(code)
      .then((value) => {
        setSubject(value);
        setLoadState("ready");
      })
      .catch(() => {
        setSubject(null);
        setLoadState("error");
      });
  }, [code]);

  useEffect(() => {
    const element = listRef.current;
    if (!element) {
      return;
    }
    const update = () => setViewportHeight(element.clientHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const sortedCourses = useMemo(() => {
    const filteredCourses = (subject?.courses ?? []).filter((course) => {
      const yearMatch = year === "all" ? true : String(course.yearBucket) === year;
      const termMatch = term === "all" ? true : course.terms.includes(term as "fall" | "winter" | "spring" | "summer");
      return yearMatch && termMatch;
    });

    return [...filteredCourses].sort((a, b) => {
      if (sort === "average") {
        const diff = (a.aggregate.mean ?? -1) - (b.aggregate.mean ?? -1);
        return direction === "asc" ? diff : -diff;
      }
      if (sort === "mode") {
        const diff = (a.aggregate.mode ?? "").localeCompare(b.aggregate.mode ?? "");
        return direction === "asc" ? diff : -diff;
      }
      const diff = a.courseCode.localeCompare(b.courseCode);
      return direction === "asc" ? diff : -diff;
    });
  }, [subject?.courses, year, term, sort, direction]);

  const itemHeight = 134;
  const overscan = 7;
  const visibleCount = Math.max(1, Math.ceil(viewportHeight / itemHeight));
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(sortedCourses.length, startIndex + visibleCount + overscan * 2);
  const visibleCourses = sortedCourses.slice(startIndex, endIndex);
  const topSpacerHeight = startIndex * itemHeight;
  const bottomSpacerHeight = Math.max(0, (sortedCourses.length - endIndex) * itemHeight);

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">{(code ?? "SUBJ").toUpperCase()} Subject</h1>
      <AggregateSummaryCard label="Subject aggregate" aggregate={subject?.aggregate} />
      {loadState === "loading" ? <p className="text-sm text-slate-600">Loading subject data...</p> : null}
      {loadState === "error" ? <p className="text-sm text-amber-700">Unable to load this subject shard right now.</p> : null}
      {loadState === "ready" && sortedCourses.length === 0 ? <p className="text-sm text-slate-600">No visible course data for this subject.</p> : null}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="text-sm font-semibold text-slate-600" htmlFor="sort-select">
          Sort
        </label>
        <select
          id="sort-select"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-[var(--duck-fg)]"
          value={sort}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams);
            next.set("sort", event.target.value);
            setSearchParams(next);
          }}
        >
          <option value="code">Code</option>
          <option value="average">Average</option>
          <option value="mode">Mode</option>
        </select>
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.set("dir", direction === "asc" ? "desc" : "asc");
            setSearchParams(next);
          }}
        >
          Direction: {direction}
        </button>
        <label className="text-sm font-semibold text-slate-600" htmlFor="year-select">
          Year
        </label>
        <select
          id="year-select"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-[var(--duck-fg)]"
          value={year}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams);
            next.set("year", event.target.value);
            setSearchParams(next);
          }}
        >
          <option value="all">All</option>
          <option value="1">100-level</option>
          <option value="2">200-level</option>
          <option value="3">300-level</option>
          <option value="4">400-level</option>
          <option value="5">500-level+</option>
        </select>
        <label className="text-sm font-semibold text-slate-600" htmlFor="term-select">
          Term
        </label>
        <select
          id="term-select"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-[var(--duck-fg)]"
          value={term}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams);
            next.set("term", event.target.value);
            setSearchParams(next);
          }}
        >
          <option value="all">All</option>
          <option value="fall">Fall</option>
          <option value="winter">Winter</option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
        </select>
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => {
            setSearchParams(new URLSearchParams());
            setScrollTop(0);
            listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Reset
        </button>
        <span className="ml-auto text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
          {sortedCourses.length} courses
        </span>
      </div>
      <div
        ref={listRef}
        className="relative max-h-[68vh] overflow-auto rounded-2xl border border-slate-200 bg-[#f7faf2] p-3"
        onScroll={(event) => {
          setScrollTop(event.currentTarget.scrollTop);
        }}
      >
        <div style={{ height: topSpacerHeight }} />
        <div className="space-y-3">
          {visibleCourses.map((course) => (
            <Link
              key={course.courseCode}
              to={`/course/${course.courseCode}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-sm font-semibold text-slate-600">{course.number}</p>
              <p className="text-lg font-bold text-[var(--duck-fg)]">{course.courseCode}</p>
              <p className="mt-1 text-sm text-slate-600">{course.title}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Mean {course.aggregate.mean?.toFixed(2) ?? "N/A"} · Mode {course.aggregate.mode ?? "N/A"}
              </p>
            </Link>
          ))}
        </div>
        <div style={{ height: bottomSpacerHeight }} />
      </div>
      {scrollTop > 720 ? (
        <button
          type="button"
          className="fixed right-5 bottom-6 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-md transition hover:bg-slate-50"
          onClick={() => {
            listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Back to top
        </button>
      ) : null}
    </section>
  );
}
