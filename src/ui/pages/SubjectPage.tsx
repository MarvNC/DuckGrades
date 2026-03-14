import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSubjectShard, type SubjectShard } from "../../lib/dataClient";

export function SubjectPage() {
  const { code } = useParams();
  const [subject, setSubject] = useState<SubjectShard | null>(null);

  useEffect(() => {
    if (!code) {
      return;
    }
    void getSubjectShard(code).then(setSubject).catch(() => setSubject(null));
  }, [code]);

  const topCourses = subject?.courses.slice(0, 10) ?? [];

  return (
    <section className="space-y-5 rounded-3xl border border-[var(--duck-border)] bg-white/80 p-8 shadow-sm">
      <h1 className="text-3xl font-extrabold">{(code ?? "SUBJ").toUpperCase()} Subject</h1>
      <p className="text-[var(--duck-muted)]">
        Mean: <span className="font-semibold text-[var(--duck-fg)]">{subject?.aggregate.mean?.toFixed(2) ?? "N/A"}</span> | Coverage:{" "}
        <span className="font-semibold text-[var(--duck-fg)]">
          {subject?.aggregate.coverage !== null && subject?.aggregate.coverage !== undefined
            ? `${(subject.aggregate.coverage * 100).toFixed(1)}%`
            : "N/A"}
        </span>
      </p>
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
          </Link>
        ))}
      </div>
    </section>
  );
}
