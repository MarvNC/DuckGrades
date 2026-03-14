import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCourseShard, type CourseShard } from "../../lib/dataClient";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";
import { SectionDrilldown } from "../components/SectionDrilldown";

export function CoursePage() {
  const { code } = useParams();
  const [course, setCourse] = useState<CourseShard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!code) {
      return;
    }
    setLoadState("loading");
    void getCourseShard(code)
      .then((value) => {
        setCourse(value);
        setLoadState("ready");
      })
      .catch(() => {
        setCourse(null);
        setLoadState("error");
      });
  }, [code]);

  return (
    <section className="space-y-5 rounded-3xl border border-[var(--duck-border)] bg-white/80 p-8 shadow-sm">
      <Link
        className="inline-flex rounded-full border border-[var(--duck-border)] px-3 py-1 text-sm font-semibold"
        to={`/subject/${course?.subject ?? "CS"}`}
      >
        Back to subject
      </Link>
      <h1 className="text-3xl font-extrabold">{course?.courseCode ?? (code ?? "COURSE").toUpperCase()}</h1>
      <p className="text-[var(--duck-muted)]">{course?.title ?? "Loading course details..."}</p>
      {course ? (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--duck-border)] bg-[#f6faef] px-2.5 py-1 text-xs font-semibold text-[var(--duck-muted)]">
            Subject {course.subject}
          </span>
          <span className="rounded-full border border-[var(--duck-border)] bg-[#f6faef] px-2.5 py-1 text-xs font-semibold text-[var(--duck-muted)]">
            {course.instructors.length} instructors
          </span>
        </div>
      ) : null}
      <AggregateSummaryCard label="Course aggregate" aggregate={course?.aggregate} />
      {loadState === "loading" ? <p className="text-sm text-[var(--duck-muted)]">Loading course shard...</p> : null}
      {loadState === "error" ? <p className="text-sm text-amber-700">Unable to load this course shard right now.</p> : null}
      {loadState === "ready" && (course?.instructors.length ?? 0) === 0 ? (
        <p className="text-sm text-[var(--duck-muted)]">No visible instructor data for this course.</p>
      ) : null}
      {loadState === "ready" && course && course.aggregate.coverage !== null && course.aggregate.coverage < 0.99 ? (
        <p className="text-sm text-[var(--duck-muted)]">
          Visible grade coverage is {(course.aggregate.coverage * 100).toFixed(1)}%; source redaction may hide some section-level buckets.
        </p>
      ) : null}
      <div className="space-y-3">
        {(course?.instructors ?? []).slice(0, 10).map((instructor) => (
          <article key={instructor.professorId} className="rounded-2xl border border-[var(--duck-border)] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link to={`/professor/${instructor.professorId}`} className="text-lg font-bold hover:underline">
                  {instructor.name}
                </Link>
                <p className="mt-1 text-sm text-[var(--duck-muted)]">{instructor.sectionCount} sections</p>
              </div>
              <p className="text-sm font-semibold text-[var(--duck-muted)]">Mean {instructor.aggregate.mean?.toFixed(2) ?? "N/A"}</p>
            </div>
            <SectionDrilldown sections={instructor.sections} identityPrefix={instructor.professorId} />
          </article>
        ))}
      </div>
    </section>
  );
}
