import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCourseShard, type CourseShard } from "../../lib/dataClient";
import fuzzysort from "fuzzysort";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";
import { EntityAggregateCard } from "../components/EntityAggregateCard";
import { SectionDrilldown } from "../components/SectionDrilldown";
import { usePageTitle } from "../usePageTitle";

export function CoursePage() {
  const { code } = useParams();
  const [course, setCourse] = useState<CourseShard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [instructorQuery, setInstructorQuery] = useState("");

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

  const totalSections = useMemo(() => {
    return (course?.instructors ?? []).reduce((sum, instructor) => sum + instructor.sectionCount, 0);
  }, [course?.instructors]);

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <Link
        className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        to={course?.subject ? `/subject/${course.subject}` : "/subjects"}
      >
        Back to subjects
      </Link>

      <div className="space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">{displayCourseCode}</h1>
        <p className="text-sm text-slate-600">{course?.title ?? "Loading course details..."}</p>
        {course?.description ? <p className="max-w-4xl text-sm leading-relaxed text-slate-700">{course.description}</p> : null}
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

      {loadState === "loading" ? <p className="text-sm text-slate-600">Loading course shard...</p> : null}
      {loadState === "error" ? <p className="text-sm text-amber-700">Unable to load this course shard right now.</p> : null}
      {loadState === "ready" && (course?.instructors.length ?? 0) === 0 ? <p className="text-sm text-slate-600">No visible instructor data for this course.</p> : null}
      {loadState === "ready" && course && course.aggregate.coverage !== null && course.aggregate.coverage < 0.99 ? (
        <p className="text-sm text-slate-600">
          Visible grade coverage is {(course.aggregate.coverage * 100).toFixed(1)}%; source redaction may hide some section-level buckets.
        </p>
      ) : null}

      {loadState === "ready" && course ? (
        <>
          <div className="sticky top-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500" htmlFor="course-instructor-search">
                Find instructor
              </label>
              <input
                id="course-instructor-search"
                type="search"
                value={instructorQuery}
                onChange={(event) => setInstructorQuery(event.target.value)}
                placeholder="Search by instructor name"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[var(--duck-fg)] shadow-sm outline-none transition focus:border-[#4d8152] focus:ring-2 focus:ring-[#4d8152]/20 sm:flex-1"
              />
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                {visibleInstructors.length} of {course.instructors.length}
              </p>
            </div>
          </div>

          {visibleInstructors.length === 0 ? <p className="text-sm text-slate-600">No instructors match your search.</p> : null}

          <div className="space-y-2.5">
            {visibleInstructors.map((instructor) => (
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
