import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import uPlot from 'uplot';
import { getSubjectShard, isNotFoundDataError, type SubjectShard } from '../../lib/dataClient';
import { PrefetchLink } from '../components/PrefetchLink';
import { abbreviateTermDesc, termRangeChipFromDescriptions } from '../../lib/termUtils';
import fuzzysort from 'fuzzysort';
import { AggregateSummaryCard } from '../components/AggregateSummaryCard';
import { EntityAggregateCard } from '../components/EntityAggregateCard';
import { PageControlBar } from '../components/PageControlBar';
import { NotFoundPage } from './NotFoundPage';
import { usePageTitle } from '../usePageTitle';
import { MetaChip } from '../components/MetaChip';
import { UPlotChart } from '../components/charts/UPlotChart';

type SubjectCourseSortKey = 'code' | 'students' | 'sections' | 'mean';

const SORT_OPTIONS: Array<{ key: SubjectCourseSortKey; label: string }> = [
  { key: 'code', label: 'A-Z' },
  { key: 'students', label: 'Students' },

  { key: 'mean', label: 'GPA' },
];

function sortCourses(
  courses: SubjectShard['courses'],
  sortKey: SubjectCourseSortKey,
  descending: boolean
): SubjectShard['courses'] {
  const direction = descending ? -1 : 1;

  return [...courses].sort((a, b) => {
    if (sortKey === 'code') {
      return direction * a.courseCode.localeCompare(b.courseCode);
    }

    if (sortKey === 'students') {
      const delta = a.aggregate.totalNonWReported - b.aggregate.totalNonWReported;
      if (delta !== 0) {
        return direction * delta;
      }
      return a.courseCode.localeCompare(b.courseCode);
    }

    if (sortKey === 'sections') {
      const delta = a.sectionCount - b.sectionCount;
      if (delta !== 0) {
        return direction * delta;
      }
      return a.courseCode.localeCompare(b.courseCode);
    }

    const left = a.aggregate.mean ?? -1;
    const right = b.aggregate.mean ?? -1;
    const delta = left - right;
    if (delta !== 0) {
      return direction * delta;
    }
    return a.courseCode.localeCompare(b.courseCode);
  });
}

export function SubjectPage() {
  const { code } = useParams();
  const [subject, setSubject] = useState<SubjectShard | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'not-found'>(
    'loading'
  );
  const [courseQuery, setCourseQuery] = useState('');
  const [sortKey, setSortKey] = useState<SubjectCourseSortKey>('code');
  const [sortDescending, setSortDescending] = useState(false);

  const displaySubjectCode = (subject?.subjectCode ?? code ?? 'Subject').toUpperCase();
  const subjectTitle = subject?.subjectTitle;
  const pageTitle = subjectTitle
    ? `${displaySubjectCode} - ${subjectTitle} Grade Distributions and Statistics`
    : `${displaySubjectCode} Grade Distributions and Statistics`;

  usePageTitle(pageTitle);

  useEffect(() => {
    if (!code) {
      return;
    }
    setLoadState('loading');
    void getSubjectShard(code)
      .then((value) => {
        setSubject(value);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        setSubject(null);
        setLoadState(isNotFoundDataError(error) ? 'not-found' : 'error');
      });
  }, [code]);

  const courses = useMemo(() => {
    return subject?.courses ?? [];
  }, [subject?.courses]);

  useEffect(() => {
    if (sortKey === 'code') {
      setSortDescending(false);
      return;
    }
    setSortDescending(true);
  }, [sortKey]);

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
          (course) => course.courseCode.toLowerCase().replace(/[^a-z0-9]+/g, ''),
        ],
        threshold: query.length <= 4 ? 0.3 : 0.2,
        limit: courses.length,
      })
      .map((result) => result.obj);
  }, [courseQuery, courses]);

  const visibleCourses = useMemo(() => {
    return sortCourses(filteredCourses, sortKey, sortDescending);
  }, [filteredCourses, sortDescending, sortKey]);

  const termAggregates = useMemo(() => {
    return subject?.termAggregates ?? [];
  }, [subject?.termAggregates]);

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

  if (loadState === 'not-found') {
    return <NotFoundPage title={`Subject ${displaySubjectCode} was not found`} />;
  }

  return (
    <section className="space-y-4 rounded-3xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">
          {displaySubjectCode}
          {subject?.subjectTitle ? (
            <>
              <span className="pr-0.5 pl-1 text-[var(--duck-muted)]">-</span>
              <span className="text-[var(--duck-muted-strong)]">{subject.subjectTitle}</span>
            </>
          ) : (
            ''
          )}
        </h1>
        {loadState === 'ready' && subject ? (
          <div className="flex flex-wrap gap-1.5">
            {[
              `${courses.length} courses`,
              `${sectionCount} sections`,
              'professorCount' in subject ? `${subject.professorCount ?? '...'} professors` : null,
              `${subject.aggregate.totalNonWReported.toLocaleString()} students`,
              termRangeChipFromDescriptions(subject.firstTerm, subject.lastTerm),
            ]
              .filter((value): value is string => Boolean(value))
              .map((chip) => (
                <MetaChip key={chip} chip={chip} />
              ))}
          </div>
        ) : null}

        <div
          className={`flex flex-col gap-2.5 lg:flex-row lg:items-start lg:gap-5 ${subject?.subjectDescription ? 'lg:justify-between' : 'lg:justify-end'}`}
        >
          {subject?.subjectDescription ? (
            <p className="min-w-0 text-sm leading-relaxed text-[var(--duck-muted-strong)] lg:max-w-4xl">
              {subject.subjectDescription}
            </p>
          ) : null}
          <div className="lg:self-stretch lg:border-l lg:border-[var(--duck-border)] lg:pl-4">
            <AggregateSummaryCard
              aggregate={subject?.aggregate}
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
            ariaLabel="Subject average GPA and enrollment over time"
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
        <p className="text-sm text-[var(--duck-muted)]">Loading subject data...</p>
      ) : null}
      {loadState === 'error' ? (
        <p className="text-sm text-[var(--duck-danger-text)]">
          Unable to load this subject shard right now.
        </p>
      ) : null}
      {loadState === 'ready' && courses.length === 0 ? (
        <p className="text-sm text-[var(--duck-muted)]">No visible course data for this subject.</p>
      ) : null}

      {loadState === 'ready' && courses.length > 0 ? (
        <PageControlBar
          filter={{
            id: 'subject-course-filter',
            value: courseQuery,
            placeholder: 'Filter courses...',
            onChange: setCourseQuery,
          }}
          sort={{
            options: SORT_OPTIONS,
            activeKey: sortKey,
            descending: sortDescending,
            onChangeKey: (key) => setSortKey(key as SubjectCourseSortKey),
            onToggleDirection: () => setSortDescending((v) => !v),
          }}
          countLabel={`${visibleCourses.length}/${courses.length}`}
        />
      ) : null}

      {loadState === 'ready' && courses.length > 0 && visibleCourses.length === 0 ? (
        <p className="text-sm text-[var(--duck-muted)]">No courses match your search.</p>
      ) : null}

      {loadState === 'ready' ? (
        <div className="space-y-2.5">
          {visibleCourses.map((course) => (
            <PrefetchLink
              key={course.courseCode}
              to={`/course/${course.courseCode}`}
              className="block"
            >
              <EntityAggregateCard
                title={course.courseCode}
                subtitle={course.title}
                aggregate={course.aggregate}
                inlineMetaChips={[
                  `${course.sectionCount} sections`,
                  'professorCount' in course
                    ? `${course.professorCount ?? '...'} professors`
                    : null,
                  `${course.aggregate.totalNonWReported.toLocaleString()} students`,
                ].filter((value): value is string => Boolean(value))}
                distributionSize="sm"
                showStudentCountInDistribution={false}
              />
            </PrefetchLink>
          ))}
        </div>
      ) : null}
    </section>
  );
}
