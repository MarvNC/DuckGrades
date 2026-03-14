import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCourseShard, getSubjectShard, type SubjectShard } from "../../lib/dataClient";
import { formatGradeCode, formatGradeStat } from "../../lib/grades";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";
import { GradeDistributionStrip } from "../components/GradeDistributionStrip";

export function SubjectPage() {
  const { code } = useParams();
  const [subject, setSubject] = useState<SubjectShard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [courseQuery, setCourseQuery] = useState("");
  const [professorCount, setProfessorCount] = useState<number | null>(null);

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

  useEffect(() => {
    if (!subject || courses.length === 0) {
      setProfessorCount(0);
      return;
    }

    let cancelled = false;
    setProfessorCount(null);

    void Promise.all(
      courses.map((course) =>
        getCourseShard(course.courseCode)
          .then((courseShard) => courseShard.instructors.map((instructor) => instructor.professorId))
          .catch(() => []),
      ),
    ).then((professorGroups) => {
      if (cancelled) {
        return;
      }
      const unique = new Set<string>();
      for (const group of professorGroups) {
        for (const professorId of group) {
          unique.add(professorId);
        }
      }
      setProfessorCount(unique.size);
    });

    return () => {
      cancelled = true;
    };
  }, [courses, subject]);

  const filteredCourses = useMemo(() => {
    const query = courseQuery.trim().toLowerCase();
    if (!query) {
      return courses;
    }
    return courses.filter((course) => {
      return (
        course.courseCode.toLowerCase().includes(query) ||
        course.number.toLowerCase().includes(query) ||
        course.title.toLowerCase().includes(query)
      );
    });
  }, [courseQuery, courses]);

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">{(subject?.subjectCode ?? code ?? "SUBJ").toUpperCase()} Subject</h1>
      </div>

      <AggregateSummaryCard
        label="Subject aggregate"
        aggregate={subject?.aggregate}
        metaChips={
          loadState === "ready" && subject
            ? [
                `${courses.length} courses`,
                `${sectionCount} sections`,
                `${professorCount === null ? "..." : professorCount} professors`,
              ]
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
              className="block rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 sm:flex-1">
                  <div className="min-w-0">
                    <p className="text-lg font-bold tracking-tight text-[var(--duck-fg)]">{course.courseCode}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                      <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2 py-0.5">{course.sectionCount} sections</span>
                      <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2 py-0.5">{course.aggregate.totalNonWReported.toLocaleString()} students</span>
                    </div>
                    <p className="truncate text-sm text-slate-600">{course.title}</p>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Mean {formatGradeStat(course.aggregate.mean)}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Median {formatGradeStat(course.aggregate.median)}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Mode {formatGradeCode(course.aggregate.mode)}</span>
                  </div>
                </div>

                <div className="flex w-full justify-end sm:w-auto sm:pl-2">
                  <GradeDistributionStrip aggregate={course.aggregate} size="sm" showStudentCount={false} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
