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

type ClassSizeBucket = {
  key: string;
  label: string;
  min: number;
  max: number | null;
  courseCount: number;
};

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

function buildClassSizeBuckets(points: AnalyticsShard['courseSizeVsGpa']): ClassSizeBucket[] {
  const buckets: ClassSizeBucket[] = [
    { key: '1-9', label: '1-9', min: 1, max: 9, courseCount: 0 },
    { key: '10-19', label: '10-19', min: 10, max: 19, courseCount: 0 },
    { key: '20-29', label: '20-29', min: 20, max: 29, courseCount: 0 },
    { key: '30-39', label: '30-39', min: 30, max: 39, courseCount: 0 },
    { key: '40-49', label: '40-49', min: 40, max: 49, courseCount: 0 },
    { key: '50-64', label: '50-64', min: 50, max: 64, courseCount: 0 },
    { key: '65-79', label: '65-79', min: 65, max: 79, courseCount: 0 },
    { key: '80-99', label: '80-99', min: 80, max: 99, courseCount: 0 },
    { key: '100-149', label: '100-149', min: 100, max: 149, courseCount: 0 },
    { key: '150+', label: '150+', min: 150, max: null, courseCount: 0 },
  ];

  for (const point of points) {
    const bucket = buckets.find((candidate) => {
      if (candidate.max === null) {
        return point.avgClassSize >= candidate.min;
      }
      return point.avgClassSize >= candidate.min && point.avgClassSize <= candidate.max;
    });

    if (bucket) {
      bucket.courseCount += 1;
    }
  }

  return buckets;
}

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsShard | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
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

  const scatterPoints = useMemo(() => {
    return [...(analytics?.courseSizeVsGpa ?? [])].sort(
      (left, right) => left.avgClassSize - right.avgClassSize
    );
  }, [analytics?.courseSizeVsGpa]);

  const scatterData = useMemo<uPlot.AlignedData>(() => {
    const points = scatterPoints;
    const x = points.map((point) => point.avgClassSize);
    const byLevel = LEVEL_ORDER.map((level) =>
      points.map((point) => (point.level === level ? point.meanGpa : null))
    );
    return [x, ...byLevel];
  }, [scatterPoints]);

  const classSizeBuckets = useMemo(() => {
    return buildClassSizeBuckets(analytics?.courseSizeVsGpa ?? []);
  }, [analytics?.courseSizeVsGpa]);

  const classSizeDistributionData = useMemo<uPlot.AlignedData>(() => {
    const rows = classSizeBuckets;
    const x = rows.map((_, index) => index + 1);
    const courses = rows.map((row) => row.courseCount);
    return [x, courses];
  }, [classSizeBuckets]);

  const visibleSubjects = useMemo(
    () => sortSubjects(analytics?.subjectSummaries ?? [], subjectSortKey, subjectSortDescending),
    [analytics?.subjectSummaries, subjectSortDescending, subjectSortKey]
  );

  const overallChartTitle =
    trendTerms[0]?.termDesc && trendTerms[trendTerms.length - 1]?.termDesc
      ? `${trendTerms[0].termDesc} to ${trendTerms[trendTerms.length - 1].termDesc}`
      : 'All available terms';

  function onSortByColumn(key: SubjectSortKey) {
    if (subjectSortKey === key) {
      setSubjectSortDescending((value) => !value);
      return;
    }
    setSubjectSortKey(key);
    setSubjectSortDescending(key !== 'code');
  }

  function sortIndicator(key: SubjectSortKey): string {
    if (subjectSortKey !== key) {
      return '';
    }
    return subjectSortDescending ? ' ↓' : ' ↑';
  }

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
              getTooltip={({ idx }) => {
                const row = trendTerms[idx];
                if (!row) {
                  return null;
                }
                return {
                  title: row.termDesc,
                  items: [
                    {
                      label: 'Mean GPA',
                      value: row.aggregate.mean?.toFixed(3) ?? 'N/A',
                      color: 'var(--duck-chart-1)',
                    },
                    {
                      label: 'Students',
                      value: row.aggregate.totalNonWReported.toLocaleString(),
                      color: 'var(--duck-chart-3)',
                    },
                  ],
                };
              }}
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
              getTooltip={({ idx }) => {
                const row = trendTerms[idx];
                if (!row) {
                  return null;
                }

                return {
                  title: row.termDesc,
                  items: LEVEL_ORDER.map((level) => {
                    const value = analytics.termByLevel[level]?.find(
                      (termValue) => termValue.term === row.term
                    )?.aggregate.mean;
                    return {
                      label: LEVEL_LABELS[level],
                      value: value === null || value === undefined ? 'N/A' : value.toFixed(3),
                      color: levelToken(level),
                    };
                  }),
                };
              }}
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
                      title={`Interquartile range: ${level.q1 === null ? 'N/A' : level.q1.toFixed(2)} to ${level.q3 === null ? 'N/A' : level.q3.toFixed(2)}`}
                      style={{
                        left: `${gpaToPercent(level.q1)}%`,
                        width: `${Math.max(2, gpaToPercent(level.q3) - gpaToPercent(level.q1))}%`,
                      }}
                    />
                    <div
                      className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-[var(--duck-accent-strong)]"
                      title={`Median GPA: ${level.aggregate.median === null ? 'N/A' : level.aggregate.median.toFixed(3)}`}
                      style={{ left: `${gpaToPercent(level.aggregate.median)}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--duck-focus)] bg-[var(--duck-surface)]"
                      title={`Mean GPA: ${level.aggregate.mean === null ? 'N/A' : level.aggregate.mean.toFixed(3)}`}
                      style={{ left: `${gpaToPercent(level.aggregate.mean)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 text-xs font-semibold text-[var(--duck-muted-strong)] sm:grid-cols-2 sm:gap-2 lg:grid-cols-8">
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
              getTooltip={({ idx }) => {
                const point = scatterPoints[idx];
                if (!point) {
                  return null;
                }
                return {
                  title: `${point.courseCode} (${LEVEL_LABELS[point.level]})`,
                  items: [
                    {
                      label: 'Mean GPA',
                      value: point.meanGpa.toFixed(3),
                      color: levelToken(point.level),
                    },
                    {
                      label: 'Avg class size',
                      value: point.avgClassSize.toFixed(2),
                    },
                    {
                      label: 'Students',
                      value: point.totalStudents.toLocaleString(),
                    },
                    {
                      label: 'Sections',
                      value: point.sectionCount.toLocaleString(),
                    },
                  ],
                };
              }}
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
                        const item = classSizeBuckets[Math.round(split) - 1];
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
                ],
                series: [
                  {},
                  {
                    label: 'Course count',
                    stroke: theme.chart2,
                    fill: `${theme.chart2}66`,
                    width: 1,
                    paths: uPlot.paths!.bars!({ size: [0.72, 96], align: 1 }),
                    points: { show: false },
                  },
                ],
              })}
              getTooltip={({ idx }) => {
                const bucket = classSizeBuckets[idx];
                if (!bucket) {
                  return null;
                }
                return {
                  title: `Avg class size ${bucket.label}`,
                  items: [
                    {
                      label: 'Courses',
                      value: bucket.courseCount.toLocaleString(),
                      color: 'var(--duck-chart-2)',
                    },
                  ],
                };
              }}
            />
          </section>

          <section className="space-y-3 rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--duck-fg)]">
                  Subject GPA distribution
                </h2>
                <p className="text-sm text-[var(--duck-muted)]">
                  Sort by clicking a column header.
                </p>
              </div>
              <p className="text-xs font-semibold tracking-[0.1em] text-[var(--duck-muted)] uppercase">
                {visibleSubjects.length} subjects
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['code', 'Subject'],
                  ['mean', 'Mean GPA'],
                  ['students', 'Students'],
                  ['sections', 'Sections'],
                ] as Array<[SubjectSortKey, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSortByColumn(key)}
                  className="rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--duck-muted-strong)] transition hover:bg-[var(--duck-surface-muted)]"
                >
                  {label}
                  <span className="text-[var(--duck-accent-strong)]">{sortIndicator(key)}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2 lg:hidden">
              {visibleSubjects.map((subject) => (
                <article
                  key={subject.code}
                  className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/subject/${subject.code}`}
                        className="font-bold text-[var(--duck-accent-strong)] transition hover:underline"
                      >
                        {subject.code}
                      </Link>
                      <p className="text-xs text-[var(--duck-muted)]">{subject.title}</p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--duck-fg)]">
                      {subject.aggregate.mean?.toFixed(3) ?? 'N/A'}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--duck-muted-strong)]">
                    <p>
                      <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                        Median
                      </span>{' '}
                      {formatGradeStat(subject.aggregate.median)}
                    </p>
                    <p>
                      <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                        Mode
                      </span>{' '}
                      {formatGradeCode(subject.aggregate.mode)}
                    </p>
                    <p>
                      <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                        Students
                      </span>{' '}
                      {subject.aggregate.totalNonWReported.toLocaleString()}
                    </p>
                    <p>
                      <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                        Sections
                      </span>{' '}
                      {subject.sectionCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-2">
                    <GradeDistributionStrip
                      aggregate={subject.aggregate}
                      size="sm"
                      showStudentCount={false}
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-[var(--duck-border)] lg:block">
              <table className="w-full min-w-[860px] border-collapse">
                <thead className="bg-[var(--duck-surface-soft)]">
                  <tr className="text-left text-xs font-semibold tracking-[0.1em] text-[var(--duck-muted)] uppercase">
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => onSortByColumn('code')}>
                        Subject
                        <span className="text-[var(--duck-accent-strong)]">
                          {sortIndicator('code')}
                        </span>
                      </button>
                    </th>
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => onSortByColumn('mean')}>
                        Mean
                        <span className="text-[var(--duck-accent-strong)]">
                          {sortIndicator('mean')}
                        </span>
                      </button>
                    </th>
                    <th className="px-3 py-2">Median</th>
                    <th className="px-3 py-2">Mode</th>
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => onSortByColumn('students')}>
                        Students
                        <span className="text-[var(--duck-accent-strong)]">
                          {sortIndicator('students')}
                        </span>
                      </button>
                    </th>
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => onSortByColumn('sections')}>
                        Sections
                        <span className="text-[var(--duck-accent-strong)]">
                          {sortIndicator('sections')}
                        </span>
                      </button>
                    </th>
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
