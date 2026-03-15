import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import uPlot from 'uplot';
import { BarChart3 } from 'lucide-react';
import {
  getAnalyticsShard,
  type AnalyticsLevel,
  type AnalyticsShard,
  type AnalyticsSubjectSummary,
} from '../../lib/dataClient';
import { abbreviateTermDesc } from '../../lib/termUtils';
import { formatGradeCode, formatGradeStat } from '../../lib/grades';
import { GradeDistributionStrip } from '../components/GradeDistributionStrip';
import { MetaChip } from '../components/MetaChip';
import { usePageTitle } from '../usePageTitle';
import { UPlotChart, type DuckChartTheme } from '../components/charts/UPlotChart';

type SubjectSortKey = 'code' | 'mean' | 'students' | 'sections';

const LEVEL_ORDER: AnalyticsLevel[] = ['100', '200', '300', '400', '500+'];
const LEVEL_LABELS: Record<AnalyticsLevel, string> = {
  '100': '100-level',
  '200': '200-level',
  '300': '300-level',
  '400': '400-level',
  '500+': '500+ level',
};

function levelColor(theme: DuckChartTheme, level: AnalyticsLevel): string {
  if (level === '100') {
    return theme.level100;
  }
  if (level === '200') {
    return theme.level200;
  }
  if (level === '300') {
    return theme.level300;
  }
  if (level === '400') {
    return theme.level400;
  }
  return theme.level500;
}

function levelToken(level: AnalyticsLevel): string {
  if (level === '100') {
    return 'var(--duck-level-100)';
  }
  if (level === '200') {
    return 'var(--duck-level-200)';
  }
  if (level === '300') {
    return 'var(--duck-level-300)';
  }
  if (level === '400') {
    return 'var(--duck-level-400)';
  }
  return 'var(--duck-level-500)';
}

function toTickLabels(termDescriptions: string[]): string[] {
  return termDescriptions.map((value) => abbreviateTermDesc(value));
}

function gpaToPercent(value: number | null): number {
  if (value === null) {
    return 0;
  }
  return Math.min(100, Math.max(0, (value / 4.3) * 100));
}

function sortSubjects(
  subjects: AnalyticsSubjectSummary[],
  sortKey: SubjectSortKey,
  descending: boolean
): AnalyticsSubjectSummary[] {
  const direction = descending ? -1 : 1;
  return [...subjects].sort((left, right) => {
    if (sortKey === 'code') {
      return direction * left.code.localeCompare(right.code);
    }
    if (sortKey === 'students') {
      return (
        direction * (left.aggregate.totalNonWReported - right.aggregate.totalNonWReported) ||
        left.code.localeCompare(right.code)
      );
    }
    if (sortKey === 'sections') {
      return (
        direction * (left.sectionCount - right.sectionCount) || left.code.localeCompare(right.code)
      );
    }

    const leftMean = left.aggregate.mean ?? -1;
    const rightMean = right.aggregate.mean ?? -1;
    return direction * (leftMean - rightMean) || left.code.localeCompare(right.code);
  });
}

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsShard | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectSortKey, setSubjectSortKey] = useState<SubjectSortKey>('mean');
  const [subjectSortDescending, setSubjectSortDescending] = useState(true);

  usePageTitle('Grade Analytics Dashboard');

  useEffect(() => {
    setLoadState('loading');
    void getAnalyticsShard()
      .then((value) => {
        setAnalytics(value);
        setLoadState('ready');
      })
      .catch(() => {
        setAnalytics(null);
        setLoadState('error');
      });
  }, []);

  const trendTerms = useMemo(() => {
    const rows = analytics?.termAggregates ?? [];
    return rows.filter((row) => !/\blaw\b/i.test(row.termDesc));
  }, [analytics?.termAggregates]);

  const trendTermLabels = useMemo(
    () => toTickLabels(trendTerms.map((row) => row.termDesc)),
    [trendTerms]
  );

  const overallTrendData = useMemo<uPlot.AlignedData>(() => {
    const rows = trendTerms;
    const x = rows.map((_, index) => index);
    const gpa = rows.map((row) => row.aggregate.mean);
    const students = rows.map((row) => row.aggregate.totalNonWReported);
    return [x, gpa, students];
  }, [trendTerms]);

  const levelTrendData = useMemo<uPlot.AlignedData>(() => {
    const rows = trendTerms;
    const x = rows.map((_, index) => index);
    const series = LEVEL_ORDER.map((level) => {
      const meanByTerm = new Map(
        (analytics?.termByLevel[level] ?? []).map((item) => [item.term, item])
      );
      return rows.map((row) => meanByTerm.get(row.term)?.aggregate.mean ?? null);
    });

    return [x, ...series];
  }, [analytics?.termByLevel, trendTerms]);

  const scatterData = useMemo<uPlot.AlignedData>(() => {
    const points = [...(analytics?.courseSizeVsGpa ?? [])].sort(
      (left, right) => left.avgClassSize - right.avgClassSize
    );
    const x = points.map((point) => point.avgClassSize);
    const byLevel = LEVEL_ORDER.map((level) =>
      points.map((point) => (point.level === level ? point.meanGpa : null))
    );
    return [x, ...byLevel];
  }, [analytics?.courseSizeVsGpa]);

  const classSizeDistributionData = useMemo<uPlot.AlignedData>(() => {
    const rows = analytics?.classSizeDistribution ?? [];
    const x = rows.map((_, index) => index + 1);
    const courses = rows.map((row) => row.courseCount);
    const students = rows.map((row) => row.studentCount);
    return [x, courses, students];
  }, [analytics?.classSizeDistribution]);

  const filteredSubjects = useMemo(() => {
    const subjects = analytics?.subjectSummaries ?? [];
    const query = subjectQuery.trim().toLowerCase();
    if (!query) {
      return subjects;
    }
    return subjects.filter(
      (subject) =>
        subject.code.toLowerCase().includes(query) || subject.title.toLowerCase().includes(query)
    );
  }, [analytics?.subjectSummaries, subjectQuery]);

  const visibleSubjects = useMemo(
    () => sortSubjects(filteredSubjects, subjectSortKey, subjectSortDescending),
    [filteredSubjects, subjectSortDescending, subjectSortKey]
  );

  const overallChartTitle =
    trendTerms[0]?.termDesc && trendTerms[trendTerms.length - 1]?.termDesc
      ? `${trendTerms[0].termDesc} to ${trendTerms[trendTerms.length - 1].termDesc}`
      : 'All available terms';

  return (
    <section className="space-y-4 rounded-3xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">Analytics</h1>
        <p className="text-sm leading-relaxed text-[var(--duck-muted)] sm:text-[0.95rem]">
          Compare how grades shift over time, by level, by subject, and by class size.
        </p>
        {analytics ? (
          <div className="flex flex-wrap gap-1.5">
            {[
              `${analytics.totals.termCount} terms`,
              `${analytics.totals.subjectCount} subjects`,
              `${analytics.totals.courseCount.toLocaleString()} courses`,
              `${analytics.totals.sectionCount.toLocaleString()} sections`,
            ].map((chip) => (
              <MetaChip key={chip} chip={chip} />
            ))}
          </div>
        ) : null}
      </div>

      {loadState === 'loading' ? (
        <p className="text-sm text-[var(--duck-muted)]">Loading analytics shard...</p>
      ) : null}
      {loadState === 'error' ? (
        <p className="text-sm text-[var(--duck-danger-text)]">
          Unable to load analytics data right now. Rebuild data with <code>bun run build:data</code>
          and try again.
        </p>
      ) : null}

      {loadState === 'ready' && analytics ? (
        <>
          <section className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[var(--duck-fg)]">Average GPA over time</h2>
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                {overallChartTitle}
              </p>
            </div>
            <UPlotChart
              ariaLabel="Average GPA and enrollment over time"
              className="w-full overflow-x-auto"
              height={260}
              data={overallTrendData}
              buildOptions={({ width, height, theme }) => ({
                width,
                height,
                padding: [12, 14, 20, 42],
                scales: {
                  x: { time: false },
                  y: { range: [0, 4.3] },
                  students: { auto: true },
                },
                cursor: { drag: { x: false, y: false } },
                legend: { show: false },
                axes: [
                  {
                    stroke: theme.border,
                    grid: { stroke: theme.border, width: 1 },
                    values: (_self, splits) =>
                      splits.map((split) => trendTermLabels[Math.round(split)] ?? ''),
                    size: 46,
                    labelSize: 10,
                    labelGap: 8,
                    labelFont: '600 11px Sora',
                    label: 'TERM',
                    labelColor: theme.muted,
                    font: '600 10px Sora',
                  },
                  {
                    stroke: theme.border,
                    grid: { stroke: theme.border, width: 1 },
                    size: 46,
                    label: 'MEAN GPA',
                    labelColor: theme.muted,
                    labelSize: 10,
                    labelGap: 8,
                    font: '600 10px Sora',
                  },
                  {
                    side: 1,
                    scale: 'students',
                    stroke: theme.border,
                    grid: { show: false },
                    size: 54,
                    values: (_self, splits) =>
                      splits.map((value) =>
                        Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })
                      ),
                    label: 'STUDENTS',
                    labelColor: theme.muted,
                    labelSize: 10,
                    labelGap: 8,
                    font: '600 10px Sora',
                  },
                ],
                series: [
                  {},
                  {
                    label: 'Mean GPA',
                    scale: 'y',
                    stroke: theme.chart1,
                    width: 2,
                    points: { size: 4, stroke: theme.chart1, fill: theme.surface },
                  },
                  {
                    label: 'Students',
                    scale: 'students',
                    stroke: theme.chart3,
                    width: 1.5,
                    points: { show: false },
                    dash: [6, 4],
                  },
                ],
              })}
            />
          </section>

          <section className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[var(--duck-fg)]">
                GPA trends by course level
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {LEVEL_ORDER.map((level) => (
                  <span
                    key={level}
                    className="inline-flex items-center rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--duck-muted-strong)]"
                  >
                    <span
                      className="mr-1.5 h-2 w-2 rounded-full"
                      style={{ backgroundColor: levelToken(level) }}
                      aria-hidden="true"
                    />
                    {LEVEL_LABELS[level]}
                  </span>
                ))}
              </div>
            </div>
            <UPlotChart
              ariaLabel="GPA trends by level"
              className="w-full overflow-x-auto"
              height={280}
              data={levelTrendData}
              buildOptions={({ width, height, theme }) => ({
                width,
                height,
                padding: [12, 14, 20, 42],
                scales: {
                  x: { time: false },
                  y: { range: [0, 4.3] },
                },
                cursor: { drag: { x: false, y: false } },
                legend: { show: false },
                axes: [
                  {
                    stroke: theme.border,
                    grid: { stroke: theme.border, width: 1 },
                    values: (_self, splits) =>
                      splits.map((split) => trendTermLabels[Math.round(split)] ?? ''),
                    size: 46,
                    label: 'TERM',
                    labelColor: theme.muted,
                    labelSize: 10,
                    labelGap: 8,
                    font: '600 10px Sora',
                  },
                  {
                    stroke: theme.border,
                    grid: { stroke: theme.border, width: 1 },
                    size: 46,
                    label: 'MEAN GPA',
                    labelColor: theme.muted,
                    labelSize: 10,
                    labelGap: 8,
                    font: '600 10px Sora',
                  },
                ],
                series: [
                  {},
                  ...LEVEL_ORDER.map((level) => ({
                    label: LEVEL_LABELS[level],
                    stroke: levelColor(theme, level),
                    width: 2,
                    points: { show: false },
                  })),
                ],
              })}
            />
          </section>

          <section className="space-y-4 rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[var(--duck-fg)]">
                Distribution stats by level
              </h2>
              <BarChart3 className="h-4 w-4 text-[var(--duck-muted)]" aria-hidden="true" />
            </div>

            <div className="space-y-2.5">
              {analytics.levelAggregates.map((level) => (
                <article
                  key={level.level}
                  className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[var(--duck-fg)]">
                      {LEVEL_LABELS[level.level]}
                    </h3>
                    <p className="text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                      {level.aggregate.totalNonWReported.toLocaleString()} students
                    </p>
                  </div>
                  <div className="relative mb-2 h-8 rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)]">
                    <div
                      className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-[var(--duck-surface-muted)]"
                      style={{
                        left: `${gpaToPercent(level.q1)}%`,
                        width: `${Math.max(2, gpaToPercent(level.q3) - gpaToPercent(level.q1))}%`,
                      }}
                    />
                    <div
                      className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-[var(--duck-accent-strong)]"
                      style={{ left: `${gpaToPercent(level.aggregate.median)}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--duck-focus)] bg-[var(--duck-surface)]"
                      style={{ left: `${gpaToPercent(level.aggregate.mean)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-[var(--duck-muted-strong)] sm:grid-cols-4 lg:grid-cols-8">
                    <p>
                      <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                        Mean
                      </span>{' '}
                      {formatGradeStat(level.aggregate.mean)}
                    </p>
                    <p>
                      <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                        Median
                      </span>{' '}
                      {formatGradeStat(level.aggregate.median)}
                    </p>
                    <p>
                      <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                        Mode
                      </span>{' '}
                      {formatGradeCode(level.aggregate.mode)}
                    </p>
                    <p>
                      <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                        Q1
                      </span>{' '}
                      {level.q1 === null ? 'N/A' : level.q1.toFixed(2)}
                    </p>
                    <p>
                      <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                        Q3
                      </span>{' '}
                      {level.q3 === null ? 'N/A' : level.q3.toFixed(2)}
                    </p>
                    <p>
                      <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                        Min
                      </span>{' '}
                      {level.min === null ? 'N/A' : level.min.toFixed(2)}
                    </p>
                    <p>
                      <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                        Max
                      </span>{' '}
                      {level.max === null ? 'N/A' : level.max.toFixed(2)}
                    </p>
                    <p>
                      <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                        Coverage
                      </span>{' '}
                      {level.aggregate.coverage === null
                        ? 'N/A'
                        : `${(level.aggregate.coverage * 100).toFixed(1)}%`}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-bold text-[var(--duck-fg)]">GPA vs class size</h2>
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                {analytics.courseSizeVsGpa.length.toLocaleString()} courses
              </p>
            </div>
            <UPlotChart
              ariaLabel="GPA versus class size scatter chart"
              className="w-full overflow-x-auto"
              height={300}
              data={scatterData}
              buildOptions={({ width, height, theme }) => ({
                width,
                height,
                padding: [12, 14, 20, 42],
                scales: {
                  x: { time: false },
                  y: { range: [0, 4.3] },
                },
                cursor: { drag: { x: false, y: false } },
                legend: { show: false },
                axes: [
                  {
                    stroke: theme.border,
                    grid: { stroke: theme.border, width: 1 },
                    size: 42,
                    label: 'AVERAGE CLASS SIZE',
                    labelColor: theme.muted,
                    labelSize: 10,
                    labelGap: 8,
                    font: '600 10px Sora',
                  },
                  {
                    stroke: theme.border,
                    grid: { stroke: theme.border, width: 1 },
                    size: 46,
                    label: 'MEAN GPA',
                    labelColor: theme.muted,
                    labelSize: 10,
                    labelGap: 8,
                    font: '600 10px Sora',
                  },
                ],
                series: [
                  {},
                  ...LEVEL_ORDER.map((level) => ({
                    label: LEVEL_LABELS[level],
                    stroke: 'transparent',
                    width: 1,
                    points: {
                      show: true,
                      size: 5,
                      width: 1,
                      stroke: levelColor(theme, level),
                      fill: levelColor(theme, level),
                    },
                  })),
                ],
              })}
            />
          </section>

          <section className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-bold text-[var(--duck-fg)]">Class size distribution</h2>
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                Courses per size bucket
              </p>
            </div>
            <UPlotChart
              ariaLabel="Histogram of class sizes"
              className="w-full overflow-x-auto"
              height={250}
              data={classSizeDistributionData}
              buildOptions={({ width, height, theme }) => ({
                width,
                height,
                padding: [12, 14, 20, 42],
                scales: {
                  x: { time: false },
                  y: { auto: true },
                  students: { auto: true },
                },
                cursor: { drag: { x: false, y: false } },
                legend: { show: false },
                axes: [
                  {
                    stroke: theme.border,
                    grid: { stroke: theme.border, width: 1 },
                    splits: () => classSizeDistributionData[0] as number[],
                    values: (_self, splits) =>
                      splits.map((split) => {
                        const item = analytics.classSizeDistribution[Math.round(split) - 1];
                        return item?.label ?? '';
                      }),
                    size: 42,
                    label: 'AVG CLASS SIZE',
                    labelColor: theme.muted,
                    labelSize: 10,
                    labelGap: 8,
                    font: '600 10px Sora',
                  },
                  {
                    stroke: theme.border,
                    grid: { stroke: theme.border, width: 1 },
                    size: 46,
                    label: 'COURSES',
                    labelColor: theme.muted,
                    labelSize: 10,
                    labelGap: 8,
                    font: '600 10px Sora',
                  },
                  {
                    side: 1,
                    scale: 'students',
                    stroke: theme.border,
                    grid: { show: false },
                    values: (_self, splits) =>
                      splits.map((value) =>
                        Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })
                      ),
                    size: 56,
                    label: 'STUDENTS',
                    labelColor: theme.muted,
                    labelSize: 10,
                    labelGap: 8,
                    font: '600 10px Sora',
                  },
                ],
                series: [
                  {},
                  {
                    label: 'Course count',
                    stroke: theme.chart2,
                    fill: `${theme.chart2}66`,
                    width: 1,
                    paths: uPlot.paths!.bars!({ size: [0.7, 88], align: 1 }),
                    points: { show: false },
                  },
                  {
                    label: 'Student count',
                    scale: 'students',
                    stroke: theme.chart4,
                    width: 1.5,
                    points: { size: 4, stroke: theme.chart4, fill: theme.surface },
                  },
                ],
              })}
            />
          </section>

          <section className="space-y-3 rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <h2 className="text-base font-bold text-[var(--duck-fg)]">
                Subject GPA distribution table
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className="text-xs font-semibold tracking-[0.1em] text-[var(--duck-muted)] uppercase"
                  htmlFor="analytics-subject-search"
                >
                  Search
                </label>
                <input
                  id="analytics-subject-search"
                  type="search"
                  value={subjectQuery}
                  onChange={(event) => setSubjectQuery(event.target.value)}
                  placeholder="Code or title"
                  className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-3 py-2 text-sm font-medium text-[var(--duck-fg)] shadow-sm transition outline-none focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20"
                />
                <label
                  className="text-xs font-semibold tracking-[0.1em] text-[var(--duck-muted)] uppercase"
                  htmlFor="analytics-subject-sort"
                >
                  Sort
                </label>
                <select
                  id="analytics-subject-sort"
                  value={subjectSortKey}
                  onChange={(event) => {
                    const next = event.target.value as SubjectSortKey;
                    setSubjectSortKey(next);
                    setSubjectSortDescending(next !== 'code');
                  }}
                  className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--duck-muted-strong)] transition outline-none focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20"
                >
                  <option value="mean">Mean GPA</option>
                  <option value="students">Students</option>
                  <option value="sections">Sections</option>
                  <option value="code">Code</option>
                </select>
                <button
                  type="button"
                  disabled={subjectSortKey === 'code'}
                  onClick={() => setSubjectSortDescending((value) => !value)}
                  className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--duck-muted-strong)] transition hover:bg-[var(--duck-surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {subjectSortDescending ? 'Desc' : 'Asc'}
                </button>
                <p className="text-xs font-semibold tracking-[0.1em] text-[var(--duck-muted)] uppercase">
                  {visibleSubjects.length} subjects
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--duck-border)]">
              <table className="w-full min-w-[980px] border-collapse">
                <thead className="bg-[var(--duck-surface-soft)]">
                  <tr className="text-left text-xs font-semibold tracking-[0.1em] text-[var(--duck-muted)] uppercase">
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Mean</th>
                    <th className="px-3 py-2">Median</th>
                    <th className="px-3 py-2">Mode</th>
                    <th className="px-3 py-2">Students</th>
                    <th className="px-3 py-2">Sections</th>
                    <th className="px-3 py-2">Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSubjects.map((subject) => (
                    <tr
                      key={subject.code}
                      className="border-t border-[var(--duck-border)] align-top"
                    >
                      <td className="px-3 py-2.5">
                        <Link
                          to={`/subject/${subject.code}`}
                          className="font-bold text-[var(--duck-accent-strong)] transition hover:underline"
                        >
                          {subject.code}
                        </Link>
                        <p className="text-xs text-[var(--duck-muted)]">{subject.title}</p>
                      </td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-[var(--duck-fg)]">
                        {subject.aggregate.mean?.toFixed(3) ?? 'N/A'}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-[var(--duck-muted-strong)]">
                        {formatGradeStat(subject.aggregate.median)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-[var(--duck-muted-strong)]">
                        {formatGradeCode(subject.aggregate.mode)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-[var(--duck-muted-strong)]">
                        {subject.aggregate.totalNonWReported.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-[var(--duck-muted-strong)]">
                        {subject.sectionCount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <GradeDistributionStrip
                          aggregate={subject.aggregate}
                          size="sm"
                          showStudentCount={false}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
