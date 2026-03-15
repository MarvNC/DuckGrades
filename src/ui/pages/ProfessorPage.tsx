import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getProfessorShard, type ProfessorShard } from "../../lib/dataClient";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";
import { EntityAggregateCard } from "../components/EntityAggregateCard";
import { SectionDrilldown } from "../components/SectionDrilldown";
import { usePageTitle } from "../usePageTitle";

type ProfessorCourseSortKey = "code" | "students" | "sections" | "mean";

const SORT_OPTIONS: Array<{ key: ProfessorCourseSortKey; label: string }> = [
  { key: "code", label: "Code" },
  { key: "students", label: "Students" },
  { key: "sections", label: "Sections" },
  { key: "mean", label: "Mean" },
];

function sortCourses(courses: ProfessorShard["courses"], sortKey: ProfessorCourseSortKey, descending: boolean): ProfessorShard["courses"] {
  const direction = descending ? -1 : 1;

  return [...courses].sort((a, b) => {
    if (sortKey === "code") {
      return direction * a.courseCode.localeCompare(b.courseCode);
    }

    if (sortKey === "students") {
      const delta = a.aggregate.totalNonWReported - b.aggregate.totalNonWReported;
      if (delta !== 0) {
        return direction * delta;
      }
      return a.courseCode.localeCompare(b.courseCode);
    }

    if (sortKey === "sections") {
      const delta = a.sectionCount - b.sectionCount;
      if (delta !== 0) {
        return direction * delta;
      }
      return a.courseCode.localeCompare(b.courseCode);
    }

    const left = a.aggregate.mean ?? -1;
    const right = b.aggregate.mean ?? -1;
    const delta = left - right;
    if (delta !== 0) {
      return direction * delta;
    }
    return a.courseCode.localeCompare(b.courseCode);
  });
}

export function ProfessorPage() {
  const { id } = useParams();
  const [professor, setProfessor] = useState<ProfessorShard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [sortKey, setSortKey] = useState<ProfessorCourseSortKey>("code");
  const [sortDescending, setSortDescending] = useState(false);

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

  useEffect(() => {
    if (sortKey === "code") {
      setSortDescending(false);
      return;
    }
    setSortDescending(true);
  }, [sortKey]);

  const courses = useMemo(() => {
    return professor?.courses ?? [];
  }, [professor?.courses]);

  const visibleCourses = useMemo(() => {
    return sortCourses(courses, sortKey, sortDescending);
  }, [courses, sortDescending, sortKey]);

  const sectionCount = useMemo(() => {
    return courses.reduce((sum, course) => sum + course.sectionCount, 0);
  }, [courses]);

  const totalStudents = professor?.aggregate.totalNonWReported ?? 0;

  return (
    <section className="space-y-4 rounded-3xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">{professorDisplayName}</h1>
      <AggregateSummaryCard
        label="Professor aggregate"
        aggregate={professor?.aggregate}
        showDistributionStudentCount={false}
        metaChips={
          professor
            ? [`${courses.length} courses`, `${sectionCount} sections`, `${totalStudents.toLocaleString()} students`]
            : undefined
        }
      />
      {loadState === "loading" ? <p className="text-sm text-[var(--duck-muted)]">Loading professor shard...</p> : null}
      {loadState === "error" ? <p className="text-sm text-[var(--duck-danger-text)]">Unable to load this professor shard right now.</p> : null}
      {loadState === "ready" && courses.length === 0 ? <p className="text-sm text-[var(--duck-muted)]">No visible course data for this professor.</p> : null}
      {loadState === "ready" && professor && professor.aggregate.coverage !== null && professor.aggregate.coverage < 0.99 ? (
        <p className="text-sm text-[var(--duck-muted)]">
          Visible grade coverage is {(professor.aggregate.coverage * 100).toFixed(1)}%; source redaction may hide some section-level buckets.
        </p>
      ) : null}

      {loadState === "ready" && courses.length > 0 ? (
        <div className="z-20 rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]" htmlFor="professor-course-sort">
              Sort
            </label>
            <select
              id="professor-course-sort"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as ProfessorCourseSortKey)}
              className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--duck-muted-strong)] outline-none transition focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortDescending((value) => !value)}
              disabled={sortKey === "code"}
              className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--duck-muted-strong)] transition hover:bg-[var(--duck-surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sortDescending ? "Desc" : "Asc"}
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]">
              {visibleCourses.length} of {courses.length}
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-2.5">
        {visibleCourses.map((course) => (
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
