import { useEffect, useMemo, useState } from 'react';
import uPlot from 'uplot';
import { getAnalyticsShard, type AnalyticsLevel, type AnalyticsShard } from '../../lib/dataClient';
import { abbreviateTermDesc } from '../../lib/termUtils';
import { MetaChip } from '../components/MetaChip';
import { usePageTitle } from '../usePageTitle';
import { UPlotChart, type DuckChartTheme } from '../components/charts/UPlotChart';

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
              buildOptions={({ width, height, theme }) => {
                const compact = width < 640;
                return {
                  width,
                  height,
                  padding: compact ? [8, 8, 10, 26] : [12, 14, 20, 42],
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
                        splits.map((split) => {
                          const idx = Math.round(split);
                          if (compact && idx % 8 !== 0) {
                            return '';
                          }
                          return trendTermLabels[idx] ?? '';
                        }),
                      size: compact ? 26 : 46,
                      labelSize: compact ? 0 : 10,
                      labelGap: compact ? 0 : 8,
                      labelFont: '600 11px Sora',
                      label: compact ? '' : 'TERM',
                      labelColor: theme.muted,
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
                    {
                      side: 1,
                      scale: 'students',
                      stroke: theme.border,
                      grid: { show: false },
                      size: compact ? 0 : 54,
                      values: (_self: uPlot, splits: number[]) =>
                        splits.map((value: number) =>
                          compact
                            ? ''
                            : Number(value).toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })
                        ),
                      label: compact ? '' : 'STUDENTS',
                      labelColor: theme.muted,
                      labelSize: compact ? 0 : 10,
                      labelGap: compact ? 0 : 8,
                      font: compact ? '600 9px Sora' : '600 10px Sora',
                    },
                  ],
                  series: [
                    {},
                    {
                      label: 'Mean GPA',
                      scale: 'y',
                      stroke: theme.chart1,
                      width: compact ? 1.6 : 2,
                      points: { size: compact ? 3 : 4, stroke: theme.chart1, fill: theme.surface },
                    },
                    {
                      label: 'Students',
                      scale: 'students',
                      stroke: theme.chart3,
                      width: compact ? 1.2 : 1.5,
                      points: { show: false },
                      dash: [6, 4],
                    },
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
                      splits: () => classSizeDistributionData[0] as number[],
                      values: (_self, splits) =>
                        splits.map((split) => {
                          const index = Math.round(split);
                          const item = classSizeBuckets[index];
                          if (!item) {
                            return '';
                          }
                          const isLastBucket = index === classSizeBuckets.length - 1;
                          if (!isLastBucket && index % labelStride !== 0) {
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
