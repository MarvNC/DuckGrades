import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSubjectShard, prefetchRouteData, type SubjectShard } from "../../lib/dataClient";
import fuzzysort from "fuzzysort";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";
import { EntityAggregateCard } from "../components/EntityAggregateCard";
import { usePageTitle } from "../usePageTitle";

export function SubjectPage() {
  const { code } = useParams();
  const [subject, setSubject] = useState<SubjectShard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [courseQuery, setCourseQuery] = useState("");

  const displaySubjectCode = (subject?.subjectCode ?? code ?? "Subject").toUpperCase();
  const subjectTitle = subject?.subjectTitle;
  const pageTitle = subjectTitle
    ? `${displaySubjectCode} ${subjectTitle} Grade Distributions and Statistics`
    : `${displaySubjectCode} Grade Distributions and Statistics`;

  usePageTitle(pageTitle);

  useEffect(() => {
    if (!code) {
      return;
    }
    setLoadState("loading");
    void getSubjectShard(code)
      .then((value) => {
        setSubject(value);
        setLoadState("ready");
      })
      .catch(() => {
        setSubject(null);
        setLoadState("error");
      });
  }, [code]);

  const courses = useMemo(() => {
    return [...(subject?.courses ?? [])].sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  }, [subject?.courses]);

  const sectionCount = useMemo(() => {
    return courses.reduce((sum, course) => sum + course.sectionCount, 0);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const query = courseQuery.trim();
    if (!query) {
      return courses;
    }
    return fuzzysort
      .go(query, courses, {
        keys: [
          (course) => course.courseCode,
          (course) => course.number,
          (course) => course.title,
          (course) => course.courseCode.toLowerCase().replace(/[^a-z0-9]+/g, ""),
        ],
        threshold: query.length <= 4 ? 0.3 : 0.2,
        limit: courses.length,
      })
      .map((result) => result.obj);
  }, [courseQuery, courses]);

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <Link
        className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        to="/subjects"
      >
        All subjects
      </Link>

      <div className="space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">
          {displaySubjectCode}
          {subject?.subjectTitle ? ` - ${subject.subjectTitle}` : ""}
        </h1>
        {subject?.subjectDescription ? <p className="max-w-4xl text-sm leading-relaxed text-slate-700">{subject.subjectDescription}</p> : null}
      </div>

      <AggregateSummaryCard
        label="Subject aggregate"
        aggregate={subject?.aggregate}
        showDistributionStudentCount={false}
        metaChips={
          loadState === "ready" && subject
            ? [
                `${courses.length} courses`,
                `${sectionCount} sections`,
                "professorCount" in subject ? `${subject.professorCount ?? "..."} professors` : null,
                `${subject.aggregate.totalNonWReported.toLocaleString()} students`,
              ].filter((value): value is string => Boolean(value))
            : undefined
        }
      />

      {loadState === "loading" ? <p className="text-sm text-slate-600">Loading subject data...</p> : null}
      {loadState === "error" ? <p className="text-sm text-amber-700">Unable to load this subject shard right now.</p> : null}
      {loadState === "ready" && courses.length === 0 ? <p className="text-sm text-slate-600">No visible course data for this subject.</p> : null}

      {loadState === "ready" && courses.length > 0 ? (
        <div className="sticky top-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500" htmlFor="subject-course-search">
              Search courses
            </label>
            <input
              id="subject-course-search"
              type="search"
              value={courseQuery}
              onChange={(event) => setCourseQuery(event.target.value)}
              placeholder="Code, number, or title"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[var(--duck-fg)] shadow-sm outline-none transition focus:border-[#4d8152] focus:ring-2 focus:ring-[#4d8152]/20 sm:flex-1"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              {filteredCourses.length} of {courses.length}
            </p>
          </div>
        </div>
      ) : null}

      {loadState === "ready" && courses.length > 0 && filteredCourses.length === 0 ? <p className="text-sm text-slate-600">No courses match your search.</p> : null}

      {loadState === "ready" ? (
        <div className="space-y-2.5">
          {filteredCourses.map((course) => (
            <Link
              key={course.courseCode}
              to={`/course/${course.courseCode}`}
              className="block transition hover:-translate-y-0.5"
              onMouseEnter={() => prefetchRouteData(`/course/${course.courseCode}`)}
              onFocus={() => prefetchRouteData(`/course/${course.courseCode}`)}
            >
              <EntityAggregateCard
                title={course.courseCode}
                subtitle={course.title}
                aggregate={course.aggregate}
                inlineMetaChips={[`${course.sectionCount} sections`, `${course.aggregate.totalNonWReported.toLocaleString()} students`]}
                distributionSize="sm"
                showStudentCountInDistribution={false}
              />
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
