import { useEffect, useMemo, useState } from 'react';
import uPlot from 'uplot';
import { getAnalyticsShard, type AnalyticsLevel, type AnalyticsShard } from '../../lib/dataClient';
import { NUMERICAL_GRADE_ORDER, computeNumericalStats, formatGradeStat } from '../../lib/grades';
import { abbreviateTermDesc } from '../../lib/termUtils';
import { MetaChip } from '../components/MetaChip';
import { usePageTitle } from '../usePageTitle';
import { createGPAChartOptions } from '../components/charts/chartUtils';
import { UPlotChart, type DuckChartTheme } from '../components/charts/UPlotChart';
import { ChartSkeleton, LoadingText, ErrorMessage } from '../components/Skeletons';

type ClassSizeBucket = {
  key: string;
  label: string;
  min: number;
  max: number;
  courseCount: number;
};

const CLASS_SIZE_BUCKET_WIDTH = 5;

const LEVEL_ORDER: AnalyticsLevel[] = ['100', '200', '300', '400', '500+'];
const LEVEL_LABELS: Record<AnalyticsLevel, string> = {
  '100': '100-level',
  '200': '200-level',
  '300': '300-level',
  '400': '400-level',
  '500+': '500+ level',
};

type OverallGradeCode = 'P' | 'N' | 'OTHER' | 'W' | (typeof NUMERICAL_GRADE_ORDER)[number];

type OverallGradeBucket = {
  code: OverallGradeCode;
  label: string;
  detailLabel: string;
  color: string;
  count: number;
};

const NON_NUMERICAL_GRADE_BUCKETS: Array<Omit<OverallGradeBucket, 'count'>> = [
  {
    code: 'P',
    label: 'P',
    detailLabel: 'Pass',
    color: 'var(--duck-chart-2)',
  },
  {
    code: 'N',
    label: 'NP',
    detailLabel: 'No Pass',
    color: 'var(--duck-chart-3)',
  },
  {
    code: 'OTHER',
    label: 'O',
    detailLabel: 'Other',
    color: 'var(--duck-chart-4)',
  },
  {
    code: 'W',
    label: 'W',
    detailLabel: 'Withdrawn',
    color: 'var(--duck-chart-5)',
  },
];

function numericalGradeLabel(code: (typeof NUMERICAL_GRADE_ORDER)[number]): string {
  return code
    .replace('AP', 'A+')
    .replace('AM', 'A-')
    .replace('BP', 'B+')
    .replace('BM', 'B-')
    .replace('CP', 'C+')
    .replace('CM', 'C-')
    .replace('DP', 'D+')
    .replace('DM', 'D-');
}

function numericalGradeColor(index: number): string {
  const hue = 10 + (index / (NUMERICAL_GRADE_ORDER.length - 1)) * 128;
  return `hsl(${hue} 62% 58%)`;
}

function nonNumericalChartColor(theme: DuckChartTheme, code: 'P' | 'N' | 'OTHER' | 'W'): string {
  if (code === 'P') {
    return theme.chart2;
  }
  if (code === 'N') {
    return theme.chart3;
  }
  if (code === 'OTHER') {
    return theme.chart4;
  }
  return theme.chart5;
}

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

function buildClassSizeBuckets(points: AnalyticsShard['courseSizeVsGpa']): ClassSizeBucket[] {
  const maxClassSize = points.reduce(
    (currentMax, point) => Math.max(currentMax, Math.ceil(point.avgClassSize)),
    CLASS_SIZE_BUCKET_WIDTH
  );
  const upperBound = Math.ceil(maxClassSize / CLASS_SIZE_BUCKET_WIDTH) * CLASS_SIZE_BUCKET_WIDTH;
  const buckets: ClassSizeBucket[] = [];

  for (let min = 1; min <= upperBound; min += CLASS_SIZE_BUCKET_WIDTH) {
    const max = min + CLASS_SIZE_BUCKET_WIDTH - 1;
    buckets.push({
      key: `${min}-${max}`,
      label: `${min}-${max}`,
      min,
      max,
      courseCount: 0,
    });
  }

  for (const point of points) {
    const classSize = Math.max(1, Math.ceil(point.avgClassSize));
    const rawIndex = Math.floor((classSize - 1) / CLASS_SIZE_BUCKET_WIDTH);
    const bucketIndex = Math.min(rawIndex, buckets.length - 1);
    buckets[bucketIndex].courseCount += 1;
  }

  return buckets;
}

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsShard | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

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

  const overallGradeBuckets = useMemo<OverallGradeBucket[]>(() => {
    const totals = {
      P: 0,
      N: 0,
      OTHER: 0,
      W: 0,
      ...Object.fromEntries(NUMERICAL_GRADE_ORDER.map((grade) => [grade, 0])),
    } as Record<OverallGradeCode, number>;

    for (const row of analytics?.termAggregates ?? []) {
      totals.P += row.aggregate.nonNumericalCounts.P ?? 0;
      totals.N += row.aggregate.nonNumericalCounts.N ?? 0;
      totals.OTHER += row.aggregate.nonNumericalCounts.OTHER ?? 0;
      totals.W += row.aggregate.withdrawals ?? 0;
      for (const grade of NUMERICAL_GRADE_ORDER) {
        totals[grade] += row.aggregate.numericalCounts[grade] ?? 0;
      }
    }

    return [
      ...NON_NUMERICAL_GRADE_BUCKETS.map((bucket) => ({
        ...bucket,
        count: totals[bucket.code],
      })),
      ...NUMERICAL_GRADE_ORDER.map((grade, index) => ({
        code: grade,
        label: numericalGradeLabel(grade),
        detailLabel: numericalGradeLabel(grade),
        color: numericalGradeColor(index),
        count: totals[grade],
      })),
    ];
  }, [analytics?.termAggregates]);

  const overallGradeTotal = useMemo(
    () => overallGradeBuckets.reduce((sum, bucket) => sum + bucket.count, 0),
    [overallGradeBuckets]
  );

  const overallGradeStats = useMemo(() => {
    const numericalCounts = Object.fromEntries(
      NUMERICAL_GRADE_ORDER.map((grade) => {
        const bucket = overallGradeBuckets.find((value) => value.code === grade);
        return [grade, bucket?.count ?? 0];
      })
    ) as Partial<Record<(typeof NUMERICAL_GRADE_ORDER)[number], number>>;

    const stats = computeNumericalStats(numericalCounts);
    return {
      mean: formatGradeStat(stats.mean),
      median: formatGradeStat(stats.median),
    };
  }, [overallGradeBuckets]);

  const overallGradeDistributionData = useMemo<uPlot.AlignedData>(() => {
    const x = overallGradeBuckets.map((_, index) => index + 1);
    const perGradeSeries = overallGradeBuckets.map((bucket, bucketIndex) =>
      x.map((_, index) => (index === bucketIndex ? bucket.count : null))
    );
    return [x, ...perGradeSeries];
  }, [overallGradeBuckets]);

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
    const x = rows.map((_, index) => index);
    const courses = rows.map((row) => row.courseCount);
    return [x, courses];
  }, [classSizeBuckets]);

  const overallChartTitle =
    trendTerms[0]?.termDesc && trendTerms[trendTerms.length - 1]?.termDesc
      ? `${trendTerms[0].termDesc} to ${trendTerms[trendTerms.length - 1].termDesc}`
      : 'All available terms';

  return (
    <section className="space-y-4 rounded-3xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3.5 shadow-sm backdrop-blur-sm sm:p-6">
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
        <div className="space-y-4">
          <LoadingText message="Loading analytics..." />
          <ChartSkeleton height={270} />
          <ChartSkeleton height={260} />
          <ChartSkeleton height={280} />
        </div>
      ) : null}
      {loadState === 'error' ? (
        <ErrorMessage message="Grade data is temporarily unavailable. Please try again later." />
      ) : null}

      {loadState === 'ready' && analytics ? (
        <>
          <section className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-bold text-[var(--duck-fg)]">
                Overall grade distribution
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                  {overallGradeTotal.toLocaleString()} grade outcomes
                </p>
                <span className="rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--duck-muted-strong)] uppercase">
                  Mean {overallGradeStats.mean}
                </span>
                <span className="rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--duck-muted-strong)] uppercase">
                  Median {overallGradeStats.median}
                </span>
              </div>
            </div>
            <UPlotChart
              ariaLabel="Overall historical grade distribution"
              className="w-full"
              height={270}
              data={overallGradeDistributionData}
              buildOptions={({ width, height, theme }) => {
                const compact = width < 640;
                const xSeries = overallGradeDistributionData[0] as number[];
                return {
                  width,
                  height,
                  padding: compact ? [8, 8, 10, 26] : [12, 14, 20, 42],
                  scales: {
                    x: {
                      time: false,
                      range: [0.5, overallGradeBuckets.length + 0.5],
                    },
                    y: { auto: true },
                  },
                  cursor: { drag: { x: false, y: false } },
                  legend: { show: false },
                  axes: [
                    {
                      stroke: theme.border,
                      grid: { stroke: theme.border, width: 1 },
                      splits: () => xSeries,
                      values: (_self, splits) =>
                        splits.map((split) => {
                          const index = Math.round(split) - 1;
                          const bucket = overallGradeBuckets[index];
                          if (!bucket) {
                            return '';
                          }
                          if (compact && index > 3 && (index - 4) % 2 === 1 && index !== 16) {
                            return '';
                          }
                          return bucket.label;
                        }),
                      size: compact ? 26 : 42,
                      label: compact ? '' : 'GRADE',
                      labelColor: theme.muted,
                      labelSize: compact ? 0 : 10,
                      labelGap: compact ? 0 : 8,
                      font: compact ? '600 9px Sora' : '600 10px Sora',
                    },
                    {
                      stroke: theme.border,
                      grid: { stroke: theme.border, width: 1 },
                      size: compact ? 32 : 58,
                      label: compact ? '' : 'COUNT',
                      labelColor: theme.muted,
                      labelSize: compact ? 0 : 10,
                      labelGap: compact ? 0 : 14,
                      font: compact ? '600 9px Sora' : '600 10px Sora',
                    },
                  ],
                  series: [
                    {},
                    ...overallGradeBuckets.map((bucket) => {
                      const resolvedColor =
                        bucket.code === 'P' ||
                        bucket.code === 'N' ||
                        bucket.code === 'OTHER' ||
                        bucket.code === 'W'
                          ? nonNumericalChartColor(theme, bucket.code)
                          : bucket.color;
                      return {
                        label: bucket.label,
                        stroke: resolvedColor,
                        fill: resolvedColor,
                        width: 1,
                        paths: uPlot.paths!.bars!({
                          size: compact ? [0.86, 96] : [0.72, 96],
                          align: 0,
                          radius: compact ? 0.14 : 0.2,
                        }),
                        points: { show: false },
                      };
                    }),
                  ],
                };
              }}
              getTooltip={({ idx }) => {
                const bucket = overallGradeBuckets[idx];
                if (!bucket) {
                  return null;
                }
                const percent =
                  overallGradeTotal > 0 ? (bucket.count / overallGradeTotal) * 100 : 0;
                return {
                  title: bucket.detailLabel,
                  items: [
                    {
                      label: 'Count',
                      value: bucket.count.toLocaleString(),
                      color: bucket.color,
                    },
                    {
                      label: 'Share',
                      value: `${percent.toFixed(1)}%`,
                    },
                  ],
                };
              }}
            />
          </section>

          <section className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[var(--duck-fg)]">Average GPA over time</h2>
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                {overallChartTitle}
              </p>
            </div>
            <UPlotChart
              ariaLabel="Average GPA and enrollment over time"
              className="w-full"
              height={260}
              data={overallTrendData}
              buildOptions={({ width, height, theme }) =>
                createGPAChartOptions({
                  width,
                  height,
                  theme,
                  termLabels: trendTermLabels,
                  compactSkipInterval: 8,
                })
              }
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

          <section className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3 shadow-sm sm:p-5">
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
              className="w-full"
              height={280}
              data={levelTrendData}
              buildOptions={({ width, height, theme }) => {
                const compact = width < 640;
                return {
                  width,
                  height,
                  padding: compact ? [8, 8, 10, 26] : [12, 14, 20, 42],
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
                        splits.map((split) => {
                          const idx = Math.round(split);
                          if (compact && idx % 8 !== 0) {
                            return '';
                          }
                          return trendTermLabels[idx] ?? '';
                        }),
                      size: compact ? 26 : 46,
                      label: compact ? '' : 'TERM',
                      labelColor: theme.muted,
                      labelSize: compact ? 0 : 10,
                      labelGap: compact ? 0 : 8,
                      font: compact ? '600 9px Sora' : '600 10px Sora',
                    },
                    {
                      stroke: theme.border,
                      grid: { stroke: theme.border, width: 1 },
                      size: compact ? 28 : 46,
                      label: compact ? '' : 'MEAN GPA',
                      labelColor: theme.muted,
                      labelSize: compact ? 0 : 10,
                      labelGap: compact ? 0 : 8,
                      font: compact ? '600 9px Sora' : '600 10px Sora',
                    },
                  ],
                  series: [
                    {},
                    ...LEVEL_ORDER.map((level) => ({
                      label: LEVEL_LABELS[level],
                      stroke: levelColor(theme, level),
                      width: compact ? 1.4 : 2,
                      points: { show: false },
                    })),
                  ],
                };
              }}
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

          <section className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-[var(--duck-fg)]">GPA vs class size</h2>
                <p className="text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                  {analytics.courseSizeVsGpa.length.toLocaleString()} courses
                </p>
              </div>
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
              ariaLabel="GPA versus class size scatter chart"
              className="w-full"
              height={300}
              data={scatterData}
              buildOptions={({ width, height, theme }) => {
                const compact = width < 640;
                return {
                  width,
                  height,
                  padding: compact ? [8, 8, 10, 26] : [12, 14, 20, 42],
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
                      size: compact ? 26 : 42,
                      label: compact ? '' : 'AVERAGE CLASS SIZE',
                      labelColor: theme.muted,
                      labelSize: compact ? 0 : 10,
                      labelGap: compact ? 0 : 8,
                      font: compact ? '600 9px Sora' : '600 10px Sora',
                    },
                    {
                      stroke: theme.border,
                      grid: { stroke: theme.border, width: 1 },
                      size: compact ? 28 : 46,
                      label: compact ? '' : 'MEAN GPA',
                      labelColor: theme.muted,
                      labelSize: compact ? 0 : 10,
                      labelGap: compact ? 0 : 8,
                      font: compact ? '600 9px Sora' : '600 10px Sora',
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
                        size: compact ? 3.5 : 5,
                        width: 1,
                        stroke: levelColor(theme, level),
                        fill: levelColor(theme, level),
                      },
                    })),
                  ],
                };
              }}
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

          <section className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-bold text-[var(--duck-fg)]">Class size distribution</h2>
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
                Courses per size bucket
              </p>
            </div>
            <UPlotChart
              ariaLabel="Histogram of class sizes"
              className="w-full"
              height={250}
              data={classSizeDistributionData}
              buildOptions={({ width, height, theme }) => {
                const compact = width < 640;
                const maxVisibleLabels = compact ? 6 : 12;
                const labelStride = Math.max(
                  1,
                  Math.ceil(classSizeBuckets.length / maxVisibleLabels)
                );
                return {
                  width,
                  height,
                  padding: compact ? [8, 8, 10, 26] : [12, 14, 20, 42],
                  scales: {
                    x: {
                      time: false,
                      range: (_self, min, max) => [min - 0.5, max + 0.5],
                    },
                    y: { auto: true },
                  },
                  cursor: { drag: { x: false, y: false } },
                  legend: { show: false },
                  axes: [
                    {
                      stroke: theme.border,
                      grid: { stroke: theme.border, width: 1 },
                      splits: () =>
                        (classSizeDistributionData[0] as number[]).filter((_, i) => {
                          const isLastBucket = i === classSizeBuckets.length - 1;
                          return isLastBucket || i % labelStride === 0;
                        }),
                      values: (_self, splits) =>
                        splits.map((split) => {
                          const index = Math.round(split);
                          const item = classSizeBuckets[index];
                          if (!item) {
                            return '';
                          }
                          return item.label;
                        }),
                      size: compact ? 26 : 42,
                      label: compact ? '' : 'AVG CLASS SIZE',
                      labelColor: theme.muted,
                      labelSize: compact ? 0 : 10,
                      labelGap: compact ? 0 : 8,
                      font: compact ? '600 9px Sora' : '600 10px Sora',
                    },
                    {
                      stroke: theme.border,
                      grid: { stroke: theme.border, width: 1 },
                      size: compact ? 28 : 46,
                      label: compact ? '' : 'COURSES',
                      labelColor: theme.muted,
                      labelSize: compact ? 0 : 10,
                      labelGap: compact ? 0 : 8,
                      font: compact ? '600 9px Sora' : '600 10px Sora',
                    },
                  ],
                  series: [
                    {},
                    {
                      label: 'Course count',
                      stroke: theme.chart2,
                      fill: `${theme.chart2}66`,
                      width: 1,
                      paths: uPlot.paths!.bars!({
                        size: compact ? [0.86, 96] : [0.72, 96],
                        align: 1,
                      }),
                      points: { show: false },
                    },
                  ],
                };
              }}
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
        </>
      ) : null}
    </section>
  );
}
