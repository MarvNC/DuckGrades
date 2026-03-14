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
    <section className="space-y-5 rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">{professor?.name ?? `Professor ${id}`}</h1>
      {professor ? (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2.5 py-1 text-xs font-semibold text-slate-600">
            {professor.courses.length} courses
          </span>
          <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2.5 py-1 text-xs font-semibold text-slate-600">
            {professor.aggregate.totalNonWReported} reported non-W
          </span>
        </div>
      ) : null}
      <AggregateSummaryCard label="Professor aggregate" aggregate={professor?.aggregate} />
      {loadState === "loading" ? <p className="text-sm text-slate-600">Loading professor shard...</p> : null}
      {loadState === "error" ? <p className="text-sm text-amber-700">Unable to load this professor shard right now.</p> : null}
      {loadState === "ready" && (professor?.courses.length ?? 0) === 0 ? (
        <p className="text-sm text-slate-600">No visible course data for this professor.</p>
      ) : null}
      {loadState === "ready" && professor && professor.aggregate.coverage !== null && professor.aggregate.coverage < 0.99 ? (
        <p className="text-sm text-slate-600">
          Visible grade coverage is {(professor.aggregate.coverage * 100).toFixed(1)}%; source redaction may hide some section-level buckets.
        </p>
      ) : null}
      <div className="space-y-3">
        {(professor?.courses ?? []).slice(0, 10).map((course) => (
          <article key={course.courseCode} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link to={`/course/${course.courseCode}`} className="text-lg font-bold hover:underline">
                  {course.courseCode}
                </Link>
                <p className="mt-1 text-sm text-slate-600">{course.title}</p>
              </div>
              <p className="text-sm font-semibold text-slate-600">Mean {course.aggregate.mean?.toFixed(2) ?? "N/A"}</p>
            </div>
            <SectionDrilldown sections={course.sections} identityPrefix={course.courseCode} />
          </article>
        ))}
      </div>
    </section>
  );
}
