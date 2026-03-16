import { useEffect, useMemo, useState } from 'react';
import fuzzysort from 'fuzzysort';
import {
  getSubjectsOverviewShard,
  type SubjectOverview,
  type SubjectsOverviewShard,
} from '../../lib/dataClient';
import { AggregateSummaryCard } from '../components/AggregateSummaryCard';
import { EntityAggregateCard } from '../components/EntityAggregateCard';
import { PageControlBar } from '../components/PageControlBar';
import { PrefetchLink } from '../components/PrefetchLink';
import { usePageTitle } from '../usePageTitle';
import { MetaChip } from '../components/MetaChip';

type SubjectSortKey = 'code' | 'students' | 'courses' | 'mean';

const SORT_OPTIONS: Array<{ key: SubjectSortKey; label: string }> = [
  { key: 'code', label: 'A-Z' },
  { key: 'students', label: 'Students' },
  { key: 'courses', label: 'Courses' },
  { key: 'mean', label: 'GPA' },
];

function sortSubjects(
  subjects: SubjectOverview[],
  sortKey: SubjectSortKey,
  descending: boolean
): SubjectOverview[] {
  const direction = descending ? -1 : 1;

  return [...subjects].sort((a, b) => {
    if (sortKey === 'code') {
      return direction * a.code.localeCompare(b.code);
    }

    if (sortKey === 'students') {
      const delta = a.aggregate.totalNonWReported - b.aggregate.totalNonWReported;
      if (delta !== 0) {
        return direction * delta;
      }
      return a.code.localeCompare(b.code);
    }

    if (sortKey === 'courses') {
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
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [subjectQuery, setSubjectQuery] = useState('');
  const [sortKey, setSortKey] = useState<SubjectSortKey>('students');
  const [sortDescending, setSortDescending] = useState(true);

  usePageTitle('All UO Subjects Grade Distributions and Statistics');

  useEffect(() => {
    setLoadState('loading');
    void getSubjectsOverviewShard()
      .then((value) => {
        setOverview(value);
        setLoadState('ready');
      })
      .catch(() => {
        setOverview(null);
        setLoadState('error');
      });
  }, []);

  useEffect(() => {
    if (sortKey === 'code') {
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
          (subject) => subject.code.toLowerCase().replace(/[^a-z0-9]+/g, ''),
          (subject) => subject.title.toLowerCase().replace(/[^a-z0-9]+/g, ''),
        ],
        threshold: query.length <= 4 ? 0.3 : 0.2,
        limit: subjects.length,
      })
      .map((result) => result.obj);
  }, [overview?.subjects, subjectQuery]);

  const visibleSubjects = useMemo(() => {
    return sortSubjects(filteredSubjects, sortKey, sortDescending);
  }, [filteredSubjects, sortDescending, sortKey]);

  const totalStudents = overview?.aggregate.totalNonWReported ?? 0;

  return (
    <section className="space-y-4 rounded-3xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--duck-fg)]">
          Subject overview
        </h1>
        {overview ? (
          <div className="flex flex-wrap gap-1.5">
            {[
              `${overview.totals.subjectCount} subjects`,
              `${overview.totals.courseCount.toLocaleString()} courses`,
              `${overview.totals.sectionCount.toLocaleString()} sections`,
              `${overview.totals.professorCount.toLocaleString()} professors`,
              `${totalStudents.toLocaleString()} students`,
            ].map((chip) => (
              <MetaChip key={chip} chip={chip} />
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between lg:gap-5">
          <p className="min-w-0 text-sm text-[var(--duck-muted)] lg:max-w-4xl">
            Browse all subjects and compare grade distributions and summary statistics across the
            university.
          </p>
          <div className="lg:self-stretch lg:border-l lg:border-[var(--duck-border)] lg:pl-4">
            <AggregateSummaryCard
              aggregate={overview?.aggregate}
              showDistributionStudentCount={false}
              embedded
            />
          </div>
        </div>
      </div>

      {loadState === 'loading' ? (
        <p className="text-sm text-[var(--duck-muted)]">Loading subject overview...</p>
      ) : null}
      {loadState === 'error' ? (
        <p className="text-sm text-[var(--duck-danger-text)]">
          Unable to load subject overview data right now.
        </p>
      ) : null}

      {loadState === 'ready' && overview ? (
        <PageControlBar
          filter={{
            id: 'subjects-overview-filter',
            value: subjectQuery,
            placeholder: 'Filter subjects...',
            onChange: setSubjectQuery,
          }}
          sort={{
            options: SORT_OPTIONS,
            activeKey: sortKey,
            descending: sortDescending,
            onChangeKey: (key) => setSortKey(key as SubjectSortKey),
            onToggleDirection: () => setSortDescending((v) => !v),
          }}
          countLabel={`${visibleSubjects.length}/${overview.subjects.length}`}
        />
      ) : null}

      {loadState === 'ready' && overview && visibleSubjects.length === 0 ? (
        <p className="text-sm text-[var(--duck-muted)]">No subjects match your search.</p>
      ) : null}

      {loadState === 'ready' ? (
        <div className="space-y-2.5">
          {visibleSubjects.map((subject) => (
            <PrefetchLink key={subject.code} to={`/subject/${subject.code}`} className="block">
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
            </PrefetchLink>
          ))}
        </div>
      ) : null}
    </section>
  );
}
