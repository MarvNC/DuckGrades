import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProfessorShard, type ProfessorShard } from "../../lib/dataClient";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";

export function ProfessorPage() {
  const { id } = useParams();
  const [professor, setProfessor] = useState<ProfessorShard | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    void getProfessorShard(id).then(setProfessor).catch(() => setProfessor(null));
  }, [id]);

  return (
    <section className="space-y-5 rounded-3xl border border-[var(--duck-border)] bg-white/80 p-8 shadow-sm">
      <h1 className="text-3xl font-extrabold">{professor?.name ?? `Professor ${id}`}</h1>
      <AggregateSummaryCard label="Professor aggregate" aggregate={professor?.aggregate} />
      <div className="grid gap-3 sm:grid-cols-2">
        {(professor?.courses ?? []).slice(0, 8).map((course) => (
          <Link
            key={course.courseCode}
            to={`/course/${course.courseCode}`}
            className="rounded-2xl border border-[var(--duck-border)] bg-white p-4 transition hover:shadow-sm"
          >
            <p className="text-lg font-bold">{course.courseCode}</p>
            <p className="mt-1 text-sm text-[var(--duck-muted)]">{course.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
