import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import fuzzysort from "fuzzysort";
import { getSubjectsOverviewShard, type SubjectOverview, type SubjectsOverviewShard } from "../../lib/dataClient";
import { AggregateSummaryCard } from "../components/AggregateSummaryCard";
import { EntityAggregateCard } from "../components/EntityAggregateCard";

type SubjectSortKey = "code" | "students" | "courses" | "mean";

const SORT_OPTIONS: Array<{ key: SubjectSortKey; label: string }> = [
  { key: "code", label: "Code" },
  { key: "students", label: "Students" },
  { key: "courses", label: "Courses" },
  { key: "mean", label: "Mean" },
];

function sortSubjects(subjects: SubjectOverview[], sortKey: SubjectSortKey, descending: boolean): SubjectOverview[] {
  const direction = descending ? -1 : 1;

  return [...subjects].sort((a, b) => {
    if (sortKey === "code") {
      return direction * a.code.localeCompare(b.code);
    }

    if (sortKey === "students") {
      const delta = a.aggregate.totalNonWReported - b.aggregate.totalNonWReported;
      if (delta !== 0) {
        return direction * delta;
      }
      return a.code.localeCompare(b.code);
    }

    if (sortKey === "courses") {
      const delta = a.courseCount - b.courseCount;
      if (delta !== 0) {
        return direction * delta;
      }
      return a.code.localeCompare(b.code);
    }

    const left = a.aggregate.mean ?? -1;
    const right = b.aggregate.mean ?? -1;
    const delta = left - right;
    if (delta !== 0) {
      return direction * delta;
    }
    return a.code.localeCompare(b.code);
  });
}

export function SubjectsOverviewPage() {
  const [overview, setOverview] = useState<SubjectsOverviewShard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [subjectQuery, setSubjectQuery] = useState("");
  const [sortKey, setSortKey] = useState<SubjectSortKey>("code");
  const [sortDescending, setSortDescending] = useState(false);

  useEffect(() => {
    setLoadState("loading");
    void getSubjectsOverviewShard()
      .then((value) => {
        setOverview(value);
        setLoadState("ready");
      })
      .catch(() => {
        setOverview(null);
        setLoadState("error");
      });
  }, []);

  useEffect(() => {
    if (sortKey === "code") {
      setSortDescending(false);
      return;
    }
    setSortDescending(true);
  }, [sortKey]);

  const filteredSubjects = useMemo(() => {
    const subjects = overview?.subjects ?? [];
    const query = subjectQuery.trim();
    if (!query) {
      return subjects;
    }
    return fuzzysort
      .go(query, subjects, {
        keys: [
          (subject) => subject.code,
          (subject) => subject.title,
          (subject) => subject.code.toLowerCase().replace(/[^a-z0-9]+/g, ""),
          (subject) => subject.title.toLowerCase().replace(/[^a-z0-9]+/g, ""),
        ],
        threshold: query.length <= 4 ? 0.3 : 0.2,
        limit: subjects.length,
      })
      .map((result) => result.obj);
  }, [overview?.subjects, subjectQuery]);

  const visibleSubjects = useMemo(() => {
    return sortSubjects(filteredSubjects, sortKey, sortDescending);
  }, [filteredSubjects, sortDescending, sortKey]);

  const topSubjects = useMemo(() => {
    return [...(overview?.subjects ?? [])]
      .sort((a, b) => b.aggregate.totalNonWReported - a.aggregate.totalNonWReported || a.code.localeCompare(b.code))
      .slice(0, 5);
  }, [overview?.subjects]);

  const totalStudents = overview?.aggregate.totalNonWReported ?? 0;
  const coverage = overview?.aggregate.coverage ?? null;

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">Subject overview</h1>
        <p className="text-sm text-slate-600">Browse all subjects and compare high-level grade trends across the university.</p>
      </div>

      <AggregateSummaryCard
        label="University aggregate"
        aggregate={overview?.aggregate}
        showDistributionStudentCount={false}
        metaChips={
          overview
            ? [
                `${overview.totals.subjectCount} subjects`,
                `${overview.totals.courseCount.toLocaleString()} courses`,
                `${overview.totals.sectionCount.toLocaleString()} sections`,
                `${overview.totals.professorCount.toLocaleString()} professors`,
                `${totalStudents.toLocaleString()} students`,
              ]
            : undefined
        }
      />

      {loadState === "ready" && coverage !== null && coverage < 0.99 ? (
        <p className="text-sm text-slate-600">
          Visible grade coverage is {(coverage * 100).toFixed(1)}%; source redaction may hide some grade buckets.
        </p>
      ) : null}
      {loadState === "loading" ? <p className="text-sm text-slate-600">Loading subject overview...</p> : null}
      {loadState === "error" ? <p className="text-sm text-amber-700">Unable to load subject overview data right now.</p> : null}

      {loadState === "ready" && topSubjects.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3.5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Most enrolled subjects</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {topSubjects.map((subject) => (
              <Link
                key={subject.code}
                to={`/subject/${subject.code}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-[var(--duck-fg)]"
              >
                {subject.code}
                <span className="ml-1.5 text-slate-500">{subject.title}</span>
                <span className="ml-1.5 text-slate-500">{subject.aggregate.totalNonWReported.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {loadState === "ready" && overview ? (
        <div className="sticky top-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500" htmlFor="subjects-overview-search">
              Search subjects
            </label>
            <input
              id="subjects-overview-search"
              type="search"
              value={subjectQuery}
              onChange={(event) => setSubjectQuery(event.target.value)}
              placeholder="Type a subject code or title"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[var(--duck-fg)] shadow-sm outline-none transition focus:border-[#4d8152] focus:ring-2 focus:ring-[#4d8152]/20 lg:flex-1"
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500" htmlFor="subjects-overview-sort">
                Sort
              </label>
              <select
                id="subjects-overview-sort"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SubjectSortKey)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#4d8152] focus:ring-2 focus:ring-[#4d8152]/20"
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
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sortDescending ? "Desc" : "Asc"}
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                {visibleSubjects.length} of {overview.subjects.length}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {loadState === "ready" && overview && visibleSubjects.length === 0 ? <p className="text-sm text-slate-600">No subjects match your search.</p> : null}

      {loadState === "ready" ? (
        <div className="space-y-2.5">
          {visibleSubjects.map((subject) => (
            <Link key={subject.code} to={`/subject/${subject.code}`} className="block transition hover:-translate-y-0.5">
              <EntityAggregateCard
                title={subject.code}
                subtitle={subject.title}
                aggregate={subject.aggregate}
                inlineMetaChips={[
                  `${subject.courseCount} courses`,
                  `${subject.sectionCount} sections`,
                  `${subject.professorCount} professors`,
                  `${subject.aggregate.totalNonWReported.toLocaleString()} students`,
                ]}
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
