import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getProfessorShard, type ProfessorShard } from "../../lib/dataClient";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";
import { EntityAggregateCard } from "../components/EntityAggregateCard";
import { SectionDrilldown } from "../components/SectionDrilldown";
import { usePageTitle } from "../usePageTitle";

export function ProfessorPage() {
  const { id } = useParams();
  const [professor, setProfessor] = useState<ProfessorShard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const professorDisplayName = professor?.name ?? `Professor ${id}`;
  const pageTitle = `${professorDisplayName} Grade Distributions and Statistics`;

  usePageTitle(pageTitle);

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

  const courses = useMemo(() => {
    return [...(professor?.courses ?? [])].sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  }, [professor?.courses]);

  const sectionCount = useMemo(() => {
    return courses.reduce((sum, course) => sum + course.sectionCount, 0);
  }, [courses]);

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">{professorDisplayName}</h1>
      {professor ? (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2.5 py-1 text-xs font-semibold text-slate-600">
            {courses.length} courses
          </span>
          <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2.5 py-1 text-xs font-semibold text-slate-600">
            {sectionCount} sections
          </span>
        </div>
      ) : null}
      <AggregateSummaryCard label="Professor aggregate" aggregate={professor?.aggregate} />
      {loadState === "loading" ? <p className="text-sm text-slate-600">Loading professor shard...</p> : null}
      {loadState === "error" ? <p className="text-sm text-amber-700">Unable to load this professor shard right now.</p> : null}
      {loadState === "ready" && courses.length === 0 ? <p className="text-sm text-slate-600">No visible course data for this professor.</p> : null}
      {loadState === "ready" && professor && professor.aggregate.coverage !== null && professor.aggregate.coverage < 0.99 ? (
        <p className="text-sm text-slate-600">
          Visible grade coverage is {(professor.aggregate.coverage * 100).toFixed(1)}%; source redaction may hide some section-level buckets.
        </p>
      ) : null}

      <div className="space-y-2.5">
        {courses.map((course) => (
          <EntityAggregateCard
            key={course.courseCode}
            title={course.courseCode}
            titleHref={`/course/${course.courseCode}`}
            subtitle={course.title}
            aggregate={course.aggregate}
            inlineMetaChips={[`${course.sectionCount} sections`, `${course.aggregate.totalNonWReported.toLocaleString()} students`]}
            distributionSize="sm"
            showStudentCountInDistribution={false}
          >
            <SectionDrilldown sections={course.sections} identityPrefix={course.courseCode} />
          </EntityAggregateCard>
        ))}
      </div>
    </section>
  );
}
