import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import uPlot from 'uplot';
import { getCourseShard, isNotFoundDataError, type CourseShard } from '../../lib/dataClient';
import type { SearchLayoutContext } from '../AppLayout';
import { abbreviateTermDesc, getTermRangeChip } from '../../lib/termUtils';
import fuzzysort from 'fuzzysort';
import { AggregateSummaryCard } from '../components/AggregateSummaryCard';
import { EntityAggregateCard } from '../components/EntityAggregateCard';
import { PageControlBar } from '../components/PageControlBar';
import { SectionDrilldown } from '../components/SectionDrilldown';
import { NotFoundPage } from './NotFoundPage';
import { usePageTitle } from '../usePageTitle';
import { MetaChip } from '../components/MetaChip';
import { createGPAChartOptions } from '../components/charts/chartUtils';
import { UPlotChart } from '../components/charts/UPlotChart';
import { CourseTopicsPanel } from '../components/CourseTopicsPanel';
import {
  EntityCardSkeletonList,
  LoadingText,
  ErrorMessage,
  EmptyState,
} from '../components/Skeletons';

type InstructorSortKey = 'name' | 'students' | 'sections' | 'mean';

const SORT_OPTIONS: Array<{ key: InstructorSortKey; label: string }> = [
  { key: 'name', label: 'A-Z' },
  { key: 'students', label: 'Students' },

  { key: 'mean', label: 'GPA' },
];

type InstructorWithFiltered = CourseShard['instructors'][number] & {
  filteredSections: CourseShard['instructors'][number]['sections'];
};

function sortInstructors(
  instructors: InstructorWithFiltered[],
  sortKey: InstructorSortKey,
  descending: boolean
): InstructorWithFiltered[] {
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
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const { scrollToPageControlBar } = useOutletContext<SearchLayoutContext>();
  const [course, setCourse] = useState<CourseShard | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'not-found'>(
    'loading'
  );
  const topicParam = searchParams.get('topic') ?? '';
  const [filterQuery, setFilterQuery] = useState(topicParam);
  const [filterMode, setFilterMode] = useState<'instructor' | 'course'>(
    topicParam ? 'course' : 'instructor'
  );
  const [sortKey, setSortKey] = useState<InstructorSortKey>('students');
  const [sortDescending, setSortDescending] = useState(true);

  const displayCourseCode = course?.courseCode ?? (code ?? 'COURSE').toUpperCase();
  const pageTitle = course?.title
    ? `${displayCourseCode} - ${course.title} Grade Distributions and Statistics`
    : `${displayCourseCode} Grade Distributions and Statistics`;

  usePageTitle(pageTitle);

  // When navigating to a new course (or the same course with a different ?topic),
  // sync the filter state from the URL.
  useEffect(() => {
    setFilterQuery(topicParam);
    setFilterMode(topicParam ? 'course' : 'instructor');
  }, [code, topicParam]);

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

  /**
   * When filtering by instructor name: fuzzy-match instructor names, return matching instructors
   * with their full section lists.
   *
   * When filtering by course title: for each instructor keep only sections whose csvTitle matches
   * the query; drop instructors whose filtered section list is empty. Returns a mapped array
   * that pairs each instructor with its (possibly filtered) sections.
   */
  const visibleInstructors = useMemo(() => {
    const instructors = course?.instructors ?? [];
    const query = filterQuery.trim();

    if (!query) {
      // No filter active — return instructors unchanged (sections stay as-is)
      return instructors.map((inst) => ({ ...inst, filteredSections: inst.sections }));
    }

    if (filterMode === 'instructor') {
      return fuzzysort
        .go(query, instructors, {
          keys: [
            (instructor) => instructor.name,
            (instructor) => instructor.name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
          ],
          threshold: query.length <= 4 ? 0.3 : 0.2,
          limit: instructors.length,
        })
        .map((result) => ({ ...result.obj, filteredSections: result.obj.sections }));
    }

    // filterMode === 'course': filter sections by csvTitle within each instructor
    const results: Array<
      (typeof instructors)[number] & { filteredSections: (typeof instructors)[number]['sections'] }
    > = [];
    for (const instructor of instructors) {
      const matchingSections = fuzzysort
        .go(query, instructor.sections, {
          keys: [
            (s) => s.csvTitle ?? '',
            (s) => (s.csvTitle ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ''),
          ],
          threshold: query.length <= 4 ? 0.3 : 0.2,
          limit: instructor.sections.length,
        })
        .map((r) => r.obj);
      if (matchingSections.length > 0) {
        results.push({ ...instructor, filteredSections: matchingSections });
      }
    }
    return results;
  }, [course?.instructors, filterQuery, filterMode]);

  const sortedInstructors = useMemo(() => {
    return sortInstructors(visibleInstructors, sortKey, sortDescending);
  }, [sortDescending, sortKey, visibleInstructors]);

  const totalSections = useMemo(() => {
    return (course?.instructors ?? []).reduce(
      (sum, instructor) => sum + instructor.sectionCount,
      0
    );
  }, [course?.instructors]);

  const allSections = useMemo(() => {
    return (course?.instructors ?? []).flatMap((instructor) => instructor.sections);
  }, [course?.instructors]);

  const termRangeChip = useMemo(() => {
    return getTermRangeChip(allSections);
  }, [allSections]);

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
    <section className="space-y-3 sm:space-y-4">
      <Link
        className="inline-flex items-center rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)] px-3 py-1 text-sm font-semibold text-[var(--duck-muted-strong)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--duck-border-strong)] hover:bg-[var(--duck-surface-soft)] hover:text-[var(--duck-accent-strong)] hover:shadow-md"
        to={course?.subject ? `/subject/${course.subject}` : '/subjects'}
      >
        Back to {backToName}
      </Link>

      <div className="space-y-4">
        <div className="space-y-3">
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

          {course?.description ? (
            <p className="max-w-4xl text-base leading-relaxed text-[var(--duck-fg)]">
              {course.description}
            </p>
          ) : null}

          {course ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
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
        </div>

        <div className="rounded-2xl border border-[var(--duck-border)] bg-gradient-to-br from-[var(--duck-surface)] to-[var(--duck-surface-soft)] p-4 shadow-sm sm:p-5">
          <AggregateSummaryCard
            aggregate={course?.aggregate}
            showDistributionStudentCount={false}
            embedded
            hero
          />
        </div>
      </div>

      {loadState === 'ready' && course ? (
        <CourseTopicsPanel
          sections={allSections}
          onTopicClick={(title) => {
            setFilterMode('course');
            setFilterQuery(title);
            // Give React a tick to flush state, then scroll the filter bar into view
            setTimeout(() => scrollToPageControlBar(), 0);
          }}
        />
      ) : null}

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
            buildOptions={({ width, height, theme }) =>
              createGPAChartOptions({
                width,
                height,
                theme,
                termLabels,
                compactSkipInterval: 6,
              })
            }
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
        <div className="space-y-4">
          <LoadingText message="Loading course data..." />
          <EntityCardSkeletonList count={3} />
        </div>
      ) : null}
      {loadState === 'error' ? (
        <ErrorMessage message="Course data is temporarily unavailable. Please try again later." />
      ) : null}
      {loadState === 'ready' && (course?.instructors.length ?? 0) === 0 ? (
        <EmptyState
          message="No instructor data available for this course."
          suggestion="This course may not have any graded sections on record."
        />
      ) : null}
      {loadState === 'ready' && course && course.instructors.length > 0 ? (
        <PageControlBar
          filter={{
            id: 'course-filter',
            value: filterQuery,
            placeholder:
              filterMode === 'instructor' ? 'Filter instructors...' : 'Filter by course name...',
            onChange: (v) => {
              setFilterQuery(v);
            },
          }}
          filterMode={{
            options: [
              { key: 'instructor', label: 'Instructor' },
              { key: 'course', label: 'Course Name' },
            ],
            activeKey: filterMode,
            onChangeKey: (key) => {
              setFilterMode(key as 'instructor' | 'course');
              setFilterQuery('');
            },
          }}
          sort={{
            options: SORT_OPTIONS,
            activeKey: sortKey,
            descending: sortDescending,
            onChangeKey: (key) => setSortKey(key as InstructorSortKey),
            onToggleDirection: () => setSortDescending((v) => !v),
          }}
          countLabel={`${sortedInstructors.length}/${course.instructors.length}`}
        />
      ) : null}

      {loadState === 'ready' && course ? (
        <>
          {sortedInstructors.length === 0 ? (
            <EmptyState
              message={
                filterMode === 'instructor'
                  ? 'No instructors match your search.'
                  : 'No sections match that course name.'
              }
              suggestion="Try a shorter search term or clear filters to see all results."
            />
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
                forceOpen={filterMode === 'course' && filterQuery.trim().length > 0}
              >
                <SectionDrilldown
                  sections={instructor.filteredSections}
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
