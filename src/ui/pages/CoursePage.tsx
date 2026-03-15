import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCourseShard, type CourseShard } from "../../lib/dataClient";
import fuzzysort from "fuzzysort";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";
import { EntityAggregateCard } from "../components/EntityAggregateCard";
import { SectionDrilldown } from "../components/SectionDrilldown";
import { usePageTitle } from "../usePageTitle";

type InstructorSortKey = "name" | "students" | "sections" | "mean";

const SORT_OPTIONS: Array<{ key: InstructorSortKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "students", label: "Students" },
  { key: "sections", label: "Sections" },
  { key: "mean", label: "Mean" },
];

function sortInstructors(
  instructors: CourseShard["instructors"],
  sortKey: InstructorSortKey,
  descending: boolean,
): CourseShard["instructors"] {
  const direction = descending ? -1 : 1;

  return [...instructors].sort((a, b) => {
    if (sortKey === "name") {
      return direction * a.name.localeCompare(b.name);
    }

    if (sortKey === "students") {
      const delta = a.aggregate.totalNonWReported - b.aggregate.totalNonWReported;
      if (delta !== 0) {
        return direction * delta;
      }
      return a.name.localeCompare(b.name);
    }

    if (sortKey === "sections") {
      const delta = a.sectionCount - b.sectionCount;
      if (delta !== 0) {
        return direction * delta;
      }
      return a.name.localeCompare(b.name);
    }

    const left = a.aggregate.mean ?? -1;
    const right = b.aggregate.mean ?? -1;
    const delta = left - right;
    if (delta !== 0) {
      return direction * delta;
    }
    return a.name.localeCompare(b.name);
  });
}

export function CoursePage() {
  const { code } = useParams();
  const [course, setCourse] = useState<CourseShard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [instructorQuery, setInstructorQuery] = useState("");
  const [sortKey, setSortKey] = useState<InstructorSortKey>("students");
  const [sortDescending, setSortDescending] = useState(true);

  const displayCourseCode = course?.courseCode ?? (code ?? "COURSE").toUpperCase();
  const pageTitle = course?.title
    ? `${displayCourseCode} ${course.title} Grade Distributions and Statistics`
    : `${displayCourseCode} Grade Distributions and Statistics`;

  usePageTitle(pageTitle);

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

  useEffect(() => {
    if (sortKey === "name") {
      setSortDescending(false);
      return;
    }
    setSortDescending(true);
  }, [sortKey]);

  const visibleInstructors = useMemo(() => {
    const instructors = course?.instructors ?? [];
    const query = instructorQuery.trim();
    if (!query) {
      return instructors;
    }
    return fuzzysort
      .go(query, instructors, {
        keys: [(instructor) => instructor.name, (instructor) => instructor.name.toLowerCase().replace(/[^a-z0-9]+/g, "")],
        threshold: query.length <= 4 ? 0.3 : 0.2,
        limit: instructors.length,
      })
      .map((result) => result.obj);
  }, [course?.instructors, instructorQuery]);

  const sortedInstructors = useMemo(() => {
    return sortInstructors(visibleInstructors, sortKey, sortDescending);
  }, [sortDescending, sortKey, visibleInstructors]);

  const totalSections = useMemo(() => {
    return (course?.instructors ?? []).reduce((sum, instructor) => sum + instructor.sectionCount, 0);
  }, [course?.instructors]);

  const backToName = course?.subjectTitle ?? course?.subject ?? "subjects";

  return (
    <section className="space-y-4 rounded-3xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <Link
        className="inline-flex rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)] px-3 py-1 text-sm font-semibold text-[var(--duck-muted-strong)] transition hover:bg-[var(--duck-surface-soft)]"
        to={course?.subject ? `/subject/${course.subject}` : "/subjects"}
      >
        Back to {backToName}
      </Link>

      <div className="space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">{displayCourseCode}</h1>
        <p className="text-sm text-[var(--duck-muted)]">{course?.title ?? "Loading course details..."}</p>
        {course?.description ? <p className="max-w-4xl text-sm leading-relaxed text-[var(--duck-muted-strong)]">{course.description}</p> : null}
      </div>

      <AggregateSummaryCard
        label="Course aggregate"
        aggregate={course?.aggregate}
        showDistributionStudentCount={false}
        metaChips={
          course
            ? [
                `Subject ${course.subject}`,
                course.subjectTitle ? course.subjectTitle : null,
                `${totalSections} sections`,
                `${course.instructors.length} instructors`,
                `${course.aggregate.totalNonWReported.toLocaleString()} students`,
              ].filter((value): value is string => Boolean(value))
            : undefined
        }
      />

      {loadState === "loading" ? <p className="text-sm text-[var(--duck-muted)]">Loading course shard...</p> : null}
      {loadState === "error" ? <p className="text-sm text-[var(--duck-danger-text)]">Unable to load this course shard right now.</p> : null}
      {loadState === "ready" && (course?.instructors.length ?? 0) === 0 ? <p className="text-sm text-[var(--duck-muted)]">No visible instructor data for this course.</p> : null}
      {loadState === "ready" && course && course.aggregate.coverage !== null && course.aggregate.coverage < 0.99 ? (
        <p className="text-sm text-[var(--duck-muted)]">
          Visible grade coverage is {(course.aggregate.coverage * 100).toFixed(1)}%; source redaction may hide some section-level buckets.
        </p>
      ) : null}

      {loadState === "ready" && course ? (
        <>
          <div className="sticky top-4 z-20 rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]" htmlFor="course-instructor-search">
                Find instructor
              </label>
              <input
                id="course-instructor-search"
                type="search"
                value={instructorQuery}
                onChange={(event) => setInstructorQuery(event.target.value)}
                placeholder="Search by instructor name"
                className="w-full rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-3 py-2 text-sm font-medium text-[var(--duck-fg)] shadow-sm outline-none transition focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20 sm:flex-1"
              />
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]" htmlFor="course-instructor-sort">
                Sort
              </label>
              <select
                id="course-instructor-sort"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as InstructorSortKey)}
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
                disabled={sortKey === "name"}
                className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--duck-muted-strong)] transition hover:bg-[var(--duck-surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sortDescending ? "Desc" : "Asc"}
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]">
                {sortedInstructors.length} of {course.instructors.length}
              </p>
            </div>
          </div>

          {sortedInstructors.length === 0 ? <p className="text-sm text-[var(--duck-muted)]">No instructors match your search.</p> : null}

          <div className="space-y-2.5">
            {sortedInstructors.map((instructor) => (
              <EntityAggregateCard
                key={instructor.professorId}
                title={instructor.name}
                titleHref={`/professor/${instructor.professorId}`}
                aggregate={instructor.aggregate}
                inlineMetaChips={[`${instructor.sectionCount} sections`, `${instructor.aggregate.totalNonWReported.toLocaleString()} students`]}
                distributionSize="sm"
                showStudentCountInDistribution={false}
              >
                <SectionDrilldown
                  sections={instructor.sections}
                  identityPrefix={instructor.professorId}
                  reportedTotal={instructor.aggregate.totalNonWReported}
                />
              </EntityAggregateCard>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
