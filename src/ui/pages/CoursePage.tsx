import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCourseShard, type CourseShard } from "../../lib/dataClient";
import { formatGradeCode, formatGradeStat } from "../../lib/grades";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";
import { GradeDistributionStrip } from "../components/GradeDistributionStrip";
import { SectionDrilldown } from "../components/SectionDrilldown";

export function CoursePage() {
  const { code } = useParams();
  const [course, setCourse] = useState<CourseShard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [instructorQuery, setInstructorQuery] = useState("");

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
    const query = instructorQuery.trim().toLowerCase();
    if (!query) {
      return instructors;
    }
    return instructors.filter((instructor) => instructor.name.toLowerCase().includes(query));
  }, [course?.instructors, instructorQuery]);

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <Link
        className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        to={`/subject/${course?.subject ?? "CS"}`}
      >
        Back to subject
      </Link>

      <div className="space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">{course?.courseCode ?? (code ?? "COURSE").toUpperCase()}</h1>
        <p className="text-sm text-slate-600">{course?.title ?? "Loading course details..."}</p>
      </div>

      {course ? (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2.5 py-1 text-xs font-semibold text-slate-600">Subject {course.subject}</span>
          <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2.5 py-1 text-xs font-semibold text-slate-600">{course.instructors.length} instructors</span>
        </div>
      ) : null}

      <AggregateSummaryCard label="Course aggregate" aggregate={course?.aggregate} />

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
              <article key={instructor.professorId} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                  <div className="min-w-0 lg:flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link to={`/professor/${instructor.professorId}`} className="text-lg font-bold tracking-tight text-[var(--duck-fg)] hover:underline">
                          {instructor.name}
                        </Link>
                        <p className="text-sm text-slate-600">{instructor.sectionCount} sections</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                        {instructor.aggregate.totalNonWReported.toLocaleString()} reported
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Mean {formatGradeStat(instructor.aggregate.mean)}</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Median {formatGradeStat(instructor.aggregate.median)}</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Mode {formatGradeCode(instructor.aggregate.mode)}</span>
                    </div>
                  </div>

                  <div className="sm:w-[24rem] lg:w-[28rem]">
                    <GradeDistributionStrip aggregate={instructor.aggregate} size="sm" />
                  </div>
                </div>

                <SectionDrilldown sections={instructor.sections} identityPrefix={instructor.professorId} />
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
