import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSubjectShard, type SubjectShard } from "../../lib/dataClient";
import { formatGradeCode, formatGradeStat } from "../../lib/grades";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";
import { GradeDistributionStrip } from "../components/GradeDistributionStrip";

export function SubjectPage() {
  const { code } = useParams();
  const [subject, setSubject] = useState<SubjectShard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

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

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">{(subject?.subjectCode ?? code ?? "SUBJ").toUpperCase()} Subject</h1>
        {subject ? (
          <p className="text-sm text-slate-600">
            {courses.length} courses · {subject.aggregate.totalNonWReported.toLocaleString()} reported non-W students
          </p>
        ) : null}
      </div>

      <AggregateSummaryCard label="Subject aggregate" aggregate={subject?.aggregate} />

      {loadState === "loading" ? <p className="text-sm text-slate-600">Loading subject data...</p> : null}
      {loadState === "error" ? <p className="text-sm text-amber-700">Unable to load this subject shard right now.</p> : null}
      {loadState === "ready" && courses.length === 0 ? <p className="text-sm text-slate-600">No visible course data for this subject.</p> : null}

      {loadState === "ready" ? (
        <div className="space-y-2.5">
          {courses.map((course) => (
            <Link
              key={course.courseCode}
              to={`/course/${course.courseCode}`}
              className="block rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 sm:flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-lg font-bold tracking-tight text-[var(--duck-fg)]">{course.courseCode}</p>
                      <p className="truncate text-sm text-slate-600">{course.title}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                      {course.sectionCount} sections
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Mean {formatGradeStat(course.aggregate.mean)}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Median {formatGradeStat(course.aggregate.median)}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Mode {formatGradeCode(course.aggregate.mode)}</span>
                  </div>
                </div>

                <div className="sm:w-[30rem] lg:w-[33rem]">
                  <GradeDistributionStrip aggregate={course.aggregate} size="sm" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
