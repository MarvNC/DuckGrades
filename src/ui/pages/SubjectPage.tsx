import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getSubjectShard,
  isNotFoundDataError,
  prefetchRouteData,
  type SubjectShard,
} from '../../lib/dataClient';
import fuzzysort from 'fuzzysort';
import { AggregateSummaryCard } from '../components/AggregateSummaryCard';
import { EntityAggregateCard } from '../components/EntityAggregateCard';
import { NotFoundPage } from './NotFoundPage';
import { usePageTitle } from '../usePageTitle';

type SubjectCourseSortKey = 'code' | 'students' | 'sections' | 'mean';

const SORT_OPTIONS: Array<{ key: SubjectCourseSortKey; label: string }> = [
  { key: 'code', label: 'Code' },
  { key: 'students', label: 'Students' },
  { key: 'sections', label: 'Sections' },
  { key: 'mean', label: 'Mean' },
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
    ? `${displaySubjectCode} ${subjectTitle} Grade Distributions and Statistics`
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

  if (loadState === 'not-found') {
    return <NotFoundPage title={`Subject ${displaySubjectCode} was not found`} />;
  }

  return (
    <section className="space-y-4 rounded-3xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">
          {displaySubjectCode}
          {subject?.subjectTitle ? ` - ${subject.subjectTitle}` : ''}
        </h1>
        {loadState === 'ready' && subject ? (
          <div className="flex flex-wrap gap-1.5">
            {[
              `${courses.length} courses`,
              `${sectionCount} sections`,
              'professorCount' in subject ? `${subject.professorCount ?? '...'} professors` : null,
              `${subject.aggregate.totalNonWReported.toLocaleString()} students`,
            ]
              .filter((value): value is string => Boolean(value))
              .map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--duck-muted-strong)]"
                >
                  {chip}
                </span>
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
        <div className="z-20 rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label
              className="text-xs font-semibold tracking-[0.1em] text-[var(--duck-muted)] uppercase"
              htmlFor="subject-course-search"
            >
              Search courses
            </label>
            <input
              id="subject-course-search"
              type="search"
              value={courseQuery}
              onChange={(event) => setCourseQuery(event.target.value)}
              placeholder="Code, number, or title"
              className="w-full rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-3 py-2 text-sm font-medium text-[var(--duck-fg)] shadow-sm transition outline-none focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20 sm:flex-1"
            />
            <label
              className="text-xs font-semibold tracking-[0.1em] text-[var(--duck-muted)] uppercase"
              htmlFor="subject-course-sort"
            >
              Sort
            </label>
            <select
              id="subject-course-sort"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SubjectCourseSortKey)}
              className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--duck-muted-strong)] transition outline-none focus:border-[var(--duck-focus)] focus:ring-2 focus:ring-[var(--duck-focus)]/20"
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
              disabled={sortKey === 'code'}
              className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--duck-muted-strong)] transition hover:bg-[var(--duck-surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sortDescending ? 'Desc' : 'Asc'}
            </button>
            <p className="text-xs font-semibold tracking-[0.1em] text-[var(--duck-muted)] uppercase">
              {visibleCourses.length} of {courses.length}
            </p>
          </div>
        </div>
      ) : null}

      {loadState === 'ready' && courses.length > 0 && visibleCourses.length === 0 ? (
        <p className="text-sm text-[var(--duck-muted)]">No courses match your search.</p>
      ) : null}

      {loadState === 'ready' ? (
        <div className="space-y-2.5">
          {visibleCourses.map((course) => (
            <Link
              key={course.courseCode}
              to={`/course/${course.courseCode}`}
              className="block transition hover:-translate-y-0.5"
              onMouseEnter={() => prefetchRouteData(`/course/${course.courseCode}`)}
              onFocus={() => prefetchRouteData(`/course/${course.courseCode}`)}
            >
              <EntityAggregateCard
                title={course.courseCode}
                subtitle={course.title}
                aggregate={course.aggregate}
                inlineMetaChips={[
                  `${course.sectionCount} sections`,
                  `${course.aggregate.totalNonWReported.toLocaleString()} students`,
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
