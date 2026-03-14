import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProfessorShard, type ProfessorShard } from "../../lib/dataClient";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";
import { SectionDrilldown } from "../components/SectionDrilldown";

export function ProfessorPage() {
  const { id } = useParams();
  const [professor, setProfessor] = useState<ProfessorShard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!id) {
      return;
    }
    setLoadState("loading");
    void getProfessorShard(id)
      .then((value) => {
        setProfessor(value);
        setLoadState("ready");
      })
      .catch(() => {
        setProfessor(null);
        setLoadState("error");
      });
  }, [id]);

  return (
    <section className="space-y-5 rounded-3xl border border-[var(--duck-border)] bg-white/80 p-8 shadow-sm">
      <h1 className="text-3xl font-extrabold">{professor?.name ?? `Professor ${id}`}</h1>
      {professor ? (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--duck-border)] bg-[#f6faef] px-2.5 py-1 text-xs font-semibold text-[var(--duck-muted)]">
            {professor.courses.length} courses
          </span>
          <span className="rounded-full border border-[var(--duck-border)] bg-[#f6faef] px-2.5 py-1 text-xs font-semibold text-[var(--duck-muted)]">
            {professor.aggregate.totalNonWReported} reported non-W
          </span>
        </div>
      ) : null}
      <AggregateSummaryCard label="Professor aggregate" aggregate={professor?.aggregate} />
      {loadState === "error" ? <p className="text-sm text-amber-700">Unable to load this professor shard right now.</p> : null}
      {loadState === "ready" && (professor?.courses.length ?? 0) === 0 ? (
        <p className="text-sm text-[var(--duck-muted)]">No visible course data for this professor.</p>
      ) : null}
      <div className="space-y-3">
        {(professor?.courses ?? []).slice(0, 10).map((course) => (
          <article key={course.courseCode} className="rounded-2xl border border-[var(--duck-border)] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link to={`/course/${course.courseCode}`} className="text-lg font-bold hover:underline">
                  {course.courseCode}
                </Link>
                <p className="mt-1 text-sm text-[var(--duck-muted)]">{course.title}</p>
              </div>
              <p className="text-sm font-semibold text-[var(--duck-muted)]">Mean {course.aggregate.mean?.toFixed(2) ?? "N/A"}</p>
            </div>
            <SectionDrilldown sections={course.sections} identityPrefix={course.courseCode} />
          </article>
        ))}
      </div>
    </section>
  );
}
