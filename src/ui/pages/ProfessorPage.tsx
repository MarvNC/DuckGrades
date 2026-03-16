import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProfessorShard, isNotFoundDataError, type ProfessorShard } from '../../lib/dataClient';
import { getTermRangeChip } from '../../lib/termUtils';
import { AggregateSummaryCard } from '../components/AggregateSummaryCard';
import { EntityAggregateCard } from '../components/EntityAggregateCard';
import { PageControlBar } from '../components/PageControlBar';
import { SectionDrilldown } from '../components/SectionDrilldown';
import { NotFoundPage } from './NotFoundPage';
import { usePageTitle } from '../usePageTitle';
import { MetaChip } from '../components/MetaChip';

type ProfessorCourseSortKey = 'code' | 'students' | 'sections' | 'mean';

const SORT_OPTIONS: Array<{ key: ProfessorCourseSortKey; label: string }> = [
  { key: 'code', label: 'A-Z' },
  { key: 'students', label: 'Students' },

  { key: 'mean', label: 'GPA' },
];

function sortCourses(
  courses: ProfessorShard['courses'],
  sortKey: ProfessorCourseSortKey,
  descending: boolean
): ProfessorShard['courses'] {
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

export function ProfessorPage() {
  const { id } = useParams();
  const [professor, setProfessor] = useState<ProfessorShard | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'not-found'>(
    'loading'
  );
  const [sortKey, setSortKey] = useState<ProfessorCourseSortKey>('code');
  const [sortDescending, setSortDescending] = useState(false);

  const professorDisplayName = professor?.name ?? `Professor ${id}`;
  const pageTitle = `${professorDisplayName} Grade Distributions and Statistics`;

  usePageTitle(pageTitle);

  useEffect(() => {
    if (!id) {
      return;
    }
    setLoadState('loading');
    void getProfessorShard(id)
      .then((value) => {
        setProfessor(value);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        setProfessor(null);
        setLoadState(isNotFoundDataError(error) ? 'not-found' : 'error');
      });
  }, [id]);

  useEffect(() => {
    if (sortKey === 'code') {
      setSortDescending(false);
      return;
    }
    setSortDescending(true);
  }, [sortKey]);

  const courses = useMemo(() => {
    return professor?.courses ?? [];
  }, [professor?.courses]);

  const visibleCourses = useMemo(() => {
    return sortCourses(courses, sortKey, sortDescending);
  }, [courses, sortDescending, sortKey]);

  const sectionCount = useMemo(() => {
    return courses.reduce((sum, course) => sum + course.sectionCount, 0);
  }, [courses]);

  const totalStudents = professor?.aggregate.totalNonWReported ?? 0;

  const termRangeChip = useMemo(() => {
    const allSections = (professor?.courses ?? []).flatMap((c) => c.sections);
    return getTermRangeChip(allSections);
  }, [professor?.courses]);

  if (loadState === 'not-found') {
    return <NotFoundPage title={`${professorDisplayName} was not found`} />;
  }

  return (
    <section className="space-y-4 rounded-3xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">
          {professorDisplayName}
        </h1>
        {professor ? (
          <div className="flex flex-wrap gap-1.5">
            {[
              `${courses.length} courses`,
              `${sectionCount} sections`,
              `${totalStudents.toLocaleString()} students`,
              termRangeChip,
            ]
              .filter((value): value is string => Boolean(value))
              .map((chip) => (
                <MetaChip key={chip} chip={chip} />
              ))}
          </div>
        ) : null}

        <div className="flex justify-start lg:justify-end">
          <AggregateSummaryCard
            aggregate={professor?.aggregate}
            showDistributionStudentCount={false}
            embedded
          />
        </div>
      </div>
      {loadState === 'loading' ? (
        <p className="text-sm text-[var(--duck-muted)]">Loading professor shard...</p>
      ) : null}
      {loadState === 'error' ? (
        <p className="text-sm text-[var(--duck-danger-text)]">
          Unable to load this professor shard right now.
        </p>
      ) : null}
      {loadState === 'ready' && courses.length === 0 ? (
        <p className="text-sm text-[var(--duck-muted)]">
          No visible course data for this professor.
        </p>
      ) : null}
      {loadState === 'ready' && courses.length > 0 ? (
        <PageControlBar
          sort={{
            options: SORT_OPTIONS,
            activeKey: sortKey,
            descending: sortDescending,
            onChangeKey: (key) => setSortKey(key as ProfessorCourseSortKey),
            onToggleDirection: () => setSortDescending((v) => !v),
          }}
          countLabel={`${visibleCourses.length}/${courses.length}`}
        />
      ) : null}

      <div className="space-y-2.5">
        {visibleCourses.map((course) => (
          <EntityAggregateCard
            key={course.courseCode}
            title={course.courseCode}
            titleHref={`/course/${course.courseCode}`}
            subtitle={course.title}
            aggregate={course.aggregate}
            inlineMetaChips={[
              `${course.sectionCount} sections`,
              `${course.aggregate.totalNonWReported.toLocaleString()} students`,
            ]}
            distributionSize="sm"
            showStudentCountInDistribution={false}
          >
            <SectionDrilldown sections={course.sections} identityPrefix={course.courseCode} />
          </EntityAggregateCard>
        ))}
      </div>
    </section>
  );
}
