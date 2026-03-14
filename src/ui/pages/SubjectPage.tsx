import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getSubjectShard, type SubjectShard } from "../../lib/dataClient";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";

export function SubjectPage() {
  const { code } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subject, setSubject] = useState<SubjectShard | null>(null);

  const sort = searchParams.get("sort") ?? "code";
  const direction = searchParams.get("dir") ?? "asc";

  useEffect(() => {
    if (!code) {
      return;
    }
    void getSubjectShard(code).then(setSubject).catch(() => setSubject(null));
  }, [code]);

  const sortedCourses = [...(subject?.courses ?? [])].sort((a, b) => {
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

  const topCourses = sortedCourses.slice(0, 24);

  return (
    <section className="space-y-5 rounded-3xl border border-[var(--duck-border)] bg-white/80 p-8 shadow-sm">
      <h1 className="text-3xl font-extrabold">{(code ?? "SUBJ").toUpperCase()} Subject</h1>
      <AggregateSummaryCard label="Subject aggregate" aggregate={subject?.aggregate} />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--duck-border)] bg-white p-3">
        <label className="text-sm font-semibold text-[var(--duck-muted)]" htmlFor="sort-select">
          Sort
        </label>
        <select
          id="sort-select"
          className="rounded-lg border border-[var(--duck-border)] px-2 py-1 text-sm"
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
          className="rounded-lg border border-[var(--duck-border)] px-3 py-1 text-sm font-semibold"
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.set("dir", direction === "asc" ? "desc" : "asc");
            setSearchParams(next);
          }}
        >
          Direction: {direction}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {topCourses.map((course) => (
          <Link
            key={course.courseCode}
            to={`/course/${course.courseCode}`}
            className="rounded-2xl border border-[var(--duck-border)] bg-white p-4 transition hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-[var(--duck-muted)]">{course.number}</p>
            <p className="text-lg font-bold">{course.courseCode}</p>
            <p className="mt-1 text-sm text-[var(--duck-muted)]">{course.title}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]">
              Mean {course.aggregate.mean?.toFixed(2) ?? "N/A"} · Mode {course.aggregate.mode ?? "N/A"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
