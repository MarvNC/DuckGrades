import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCourseShard, type CourseShard } from "../../lib/dataClient";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";

export function CoursePage() {
  const { code } = useParams();
  const [course, setCourse] = useState<CourseShard | null>(null);

  useEffect(() => {
    if (!code) {
      return;
    }
    void getCourseShard(code).then(setCourse).catch(() => setCourse(null));
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
      <AggregateSummaryCard label="Course aggregate" aggregate={course?.aggregate} />
      <div className="grid gap-3 sm:grid-cols-2">
        {(course?.instructors ?? []).slice(0, 8).map((instructor) => (
          <Link
            key={instructor.professorId}
            to={`/professor/${instructor.professorId}`}
            className="rounded-2xl border border-[var(--duck-border)] bg-white p-4 transition hover:shadow-sm"
          >
            <p className="text-lg font-bold">{instructor.name}</p>
            <p className="mt-1 text-sm text-[var(--duck-muted)]">{instructor.sectionCount} sections</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
