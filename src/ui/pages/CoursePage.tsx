import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import uPlot from 'uplot';
import { getCourseShard, isNotFoundDataError, type CourseShard } from '../../lib/dataClient';
import { abbreviateTermDesc, getTermRangeChip } from '../../lib/termUtils';
import fuzzysort from 'fuzzysort';
import { AggregateSummaryCard } from '../components/AggregateSummaryCard';
import { EntityAggregateCard } from '../components/EntityAggregateCard';
import { SectionDrilldown } from '../components/SectionDrilldown';
import { NotFoundPage } from './NotFoundPage';
import { usePageTitle } from '../usePageTitle';
import { MetaChip } from '../components/MetaChip';
import { UPlotChart } from '../components/charts/UPlotChart';
import type { SearchLayoutContext } from '../AppLayout';

type InstructorSortKey = 'name' | 'students' | 'sections' | 'mean';

const SORT_OPTIONS: Array<{ key: InstructorSortKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'students', label: 'Students' },
  { key: 'sections', label: 'Sections' },
  { key: 'mean', label: 'Mean' },
];

function sortInstructors(
  instructors: CourseShard['instructors'],
  sortKey: InstructorSortKey,
  descending: boolean
): CourseShard['instructors'] {
  const direction = descending ? -1 : 1;

  return [...instructors].sort((a, b) => {
    if (sortKey === 'name') {
      return direction * a.name.localeCompare(b.name);
    }

    if (sortKey === 'students') {
      const delta = a.aggregate.totalNonWReported - b.aggregate.totalNonWReported;
      if (delta !== 0) {
        return direction * delta;
      }
      return a.name.localeCompare(b.name);
    }

    if (sortKey === 'sections') {
      const delta = a.sectionCount - b.sectionCount;
      if (delta !== 0) {
        return direction * delta;
      }
      return a.name.localeCompare(b.name);
    }

    const left = a.aggregate.mean ?? -1;
    const right = b.aggregate.mean ?? -1;
    const delta = left - right;
    if (delta !== 0) {
      return direction * delta;
    }
    return a.name.localeCompare(b.name);
  });
}

export function CoursePage() {
  const { setPageBar } = useOutletContext<SearchLayoutContext>();
  const { code } = useParams();
  const [course, setCourse] = useState<CourseShard | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'not-found'>(
    'loading'
  );
  const [instructorQuery, setInstructorQuery] = useState('');
  const [sortKey, setSortKey] = useState<InstructorSortKey>('students');
  const [sortDescending, setSortDescending] = useState(true);

  const displayCourseCode = course?.courseCode ?? (code ?? 'COURSE').toUpperCase();
  const pageTitle = course?.title
    ? `${displayCourseCode} - ${course.title} Grade Distributions and Statistics`
    : `${displayCourseCode} Grade Distributions and Statistics`;

  usePageTitle(pageTitle);

  useEffect(() => {
    if (!code) {
      return;
    }
    setLoadState('loading');
    void getCourseShard(code)
      .then((value) => {
        setCourse(value);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        setCourse(null);
        setLoadState(isNotFoundDataError(error) ? 'not-found' : 'error');
      });
  }, [code]);

  useEffect(() => {
    if (sortKey === 'name') {
      setSortDescending(false);
      return;
    }
    setSortDescending(true);
  }, [sortKey]);

  const visibleInstructors = useMemo(() => {
    const instructors = course?.instructors ?? [];
    const query = instructorQuery.trim();
    if (!query) {
      return instructors;
    }
    return fuzzysort
      .go(query, instructors, {
        keys: [
          (instructor) => instructor.name,
          (instructor) => instructor.name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
        ],
        threshold: query.length <= 4 ? 0.3 : 0.2,
        limit: instructors.length,
      })
      .map((result) => result.obj);
  }, [course?.instructors, instructorQuery]);

  const sortedInstructors = useMemo(() => {
    return sortInstructors(visibleInstructors, sortKey, sortDescending);
  }, [sortDescending, sortKey, visibleInstructors]);

  // Register page bar (filter + sort + count) into the header
  useEffect(() => {
    const total = course?.instructors.length ?? 0;
    setPageBar({
      filter: {
        id: 'course-instructor-filter',
        value: instructorQuery,
        placeholder: 'Filter instructors...',
        onChange: setInstructorQuery,
      },
      sort: {
        options: SORT_OPTIONS,
        activeKey: sortKey,
        descending: sortDescending,
        onChangeKey: (key) => setSortKey(key as InstructorSortKey),
        onToggleDirection: () => setSortDescending((v) => !v),
      },
      countLabel: total > 0 ? `${sortedInstructors.length}/${total}` : undefined,
    });
    return () => setPageBar(null);
  }, [
    instructorQuery,
    sortKey,
    sortDescending,
    sortedInstructors.length,
    course?.instructors.length,
    setPageBar,
  ]);

  const totalSections = useMemo(() => {
    return (course?.instructors ?? []).reduce(
      (sum, instructor) => sum + instructor.sectionCount,
      0
    );
  }, [course?.instructors]);

  const termRangeChip = useMemo(() => {
    const allSections = (course?.instructors ?? []).flatMap((i) => i.sections);
    return getTermRangeChip(allSections);
  }, [course?.instructors]);

  const termAggregates = useMemo(() => {
    return course?.termAggregates ?? [];
  }, [course?.termAggregates]);

  const termLabels = useMemo(() => {
    return termAggregates.map((row) => abbreviateTermDesc(row.termDesc));
  }, [termAggregates]);

  const termChartData = useMemo((): uPlot.AlignedData => {
    const x = termAggregates.map((_, index) => index);
    const gpa = termAggregates.map((row) => row.aggregate.mean);
    const students = termAggregates.map((row) => row.aggregate.totalNonWReported);
    return [x, gpa, students];
  }, [termAggregates]);

  const termChartTitle =
    termAggregates[0]?.termDesc && termAggregates[termAggregates.length - 1]?.termDesc
      ? `${termAggregates[0].termDesc} to ${termAggregates[termAggregates.length - 1].termDesc}`
      : 'All available terms';

  const backToName = course?.subjectTitle ?? course?.subject ?? 'subjects';

  if (loadState === 'not-found') {
    return <NotFoundPage title={`Course ${displayCourseCode} was not found`} />;
  }

  return (
    <section className="space-y-4 rounded-3xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <Link
        className="inline-flex rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)] px-3 py-1 text-sm font-semibold text-[var(--duck-muted-strong)] transition hover:bg-[var(--duck-surface-soft)]"
        to={course?.subject ? `/subject/${course.subject}` : '/subjects'}
      >
        Back to {backToName}
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">
          {displayCourseCode}
          {course?.title ? (
            <>
              <span className="pr-0.5 pl-1 text-[var(--duck-muted)]">-</span>
              <span className="text-[var(--duck-muted-strong)]">{course.title}</span>
            </>
          ) : (
            ''
          )}
        </h1>
        {course ? (
          <div className="flex flex-wrap gap-1.5">
            {[
              course.subjectTitle ? course.subjectTitle : null,
              `${totalSections} sections`,
              `${course.instructors.length} instructors`,
              `${course.aggregate.totalNonWReported.toLocaleString()} students`,
              termRangeChip,
            ]
              .filter((value): value is string => Boolean(value))
              .map((chip) => (
                <MetaChip key={chip} chip={chip} />
              ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between lg:gap-5">
          <div className="min-w-0 lg:max-w-4xl">
            {course?.description ? (
              <p className="mt-1 text-sm leading-relaxed text-[var(--duck-muted-strong)]">
                {course.description}
              </p>
            ) : null}
          </div>
          <div className="lg:self-stretch lg:border-l lg:border-[var(--duck-border)] lg:pl-4">
            <AggregateSummaryCard
              aggregate={course?.aggregate}
              showDistributionStudentCount={false}
              embedded
            />
          </div>
        </div>
      </div>

      {loadState === 'ready' && termAggregates.length > 1 ? (
        <section className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--duck-fg)]">Average GPA over time</h2>
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
              {termChartTitle}
            </p>
          </div>
          <UPlotChart
            ariaLabel="Course average GPA and enrollment over time"
            className="w-full"
            height={250}
            data={termChartData}
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
                        if (compact && idx % 6 !== 0) {
                          return '';
                        }
                        return termLabels[idx] ?? '';
                      }),
                    size: compact ? 26 : 46,
                    labelSize: compact ? 0 : 10,
                    labelGap: compact ? 0 : 8,
                    labelFont: '600 11px Sora',
                    label: compact ? '' : 'TERM',
                    font: compact ? '600 9px Sora' : '600 10px Sora',
                  },
                  {
                    stroke: theme.border,
                    grid: { stroke: theme.border, width: 1 },
                    size: compact ? 28 : 46,
                    label: compact ? '' : 'MEAN GPA',
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
              const row = termAggregates[idx];
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
      ) : null}

      {loadState === 'loading' ? (
        <p className="text-sm text-[var(--duck-muted)]">Loading course shard...</p>
      ) : null}
      {loadState === 'error' ? (
        <p className="text-sm text-[var(--duck-danger-text)]">
          Unable to load this course shard right now.
        </p>
      ) : null}
      {loadState === 'ready' && (course?.instructors.length ?? 0) === 0 ? (
        <p className="text-sm text-[var(--duck-muted)]">
          No visible instructor data for this course.
        </p>
      ) : null}
      {loadState === 'ready' &&
      course &&
      course.aggregate.coverage !== null &&
      course.aggregate.coverage < 0.99 ? (
        <p className="text-sm text-[var(--duck-muted)]">
          Visible grade coverage is {(course.aggregate.coverage * 100).toFixed(1)}%; source
          redaction may hide some section-level buckets.
        </p>
      ) : null}

      {/* Filter + sort controls are in the sticky header via setPageBar */}

      {loadState === 'ready' && course ? (
        <>
          {sortedInstructors.length === 0 ? (
            <p className="text-sm text-[var(--duck-muted)]">No instructors match your search.</p>
          ) : null}

          <div className="space-y-2.5">
            {sortedInstructors.map((instructor) => (
              <EntityAggregateCard
                key={instructor.professorId}
                title={instructor.name}
                titleHref={`/professor/${instructor.professorId}`}
                aggregate={instructor.aggregate}
                inlineMetaChips={[
                  `${instructor.sectionCount} sections`,
                  `${instructor.aggregate.totalNonWReported.toLocaleString()} students`,
                ]}
                distributionSize="sm"
                showStudentCountInDistribution={false}
              >
                <SectionDrilldown
                  sections={instructor.sections}
                  identityPrefix={instructor.professorId}
                />
              </EntityAggregateCard>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
