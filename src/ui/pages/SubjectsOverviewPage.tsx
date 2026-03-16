import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import fuzzysort from 'fuzzysort';
import {
  getSubjectsOverviewShard,
  type SubjectOverview,
  type SubjectsOverviewShard,
} from '../../lib/dataClient';
import { AggregateSummaryCard } from '../components/AggregateSummaryCard';
import { EntityAggregateCard } from '../components/EntityAggregateCard';
import { usePageTitle } from '../usePageTitle';
import { MetaChip } from '../components/MetaChip';
import type { SearchLayoutContext } from '../AppLayout';

type SubjectSortKey = 'code' | 'students' | 'courses' | 'mean';

const SORT_OPTIONS: Array<{ key: SubjectSortKey; label: string }> = [
  { key: 'code', label: 'Code' },
  { key: 'students', label: 'Students' },
  { key: 'courses', label: 'Courses' },
  { key: 'mean', label: 'Mean' },
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
  const { setPageBar } = useOutletContext<SearchLayoutContext>();
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

  // Register page bar (filter + sort + count) into the header
  useEffect(() => {
    setPageBar({
      filter: {
        id: 'subjects-overview-filter',
        value: subjectQuery,
        placeholder: 'Filter subjects...',
        onChange: setSubjectQuery,
      },
      sort: {
        options: SORT_OPTIONS,
        activeKey: sortKey,
        descending: sortDescending,
        onChangeKey: (key) => setSortKey(key as SubjectSortKey),
        onToggleDirection: () => setSortDescending((v) => !v),
      },
      countLabel: overview ? `${visibleSubjects.length}/${overview.subjects.length}` : undefined,
    });
    return () => setPageBar(null);
  }, [subjectQuery, sortKey, sortDescending, visibleSubjects.length, overview, setPageBar]);

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

      {/* Filter + sort controls are in the sticky header via setPageBar */}

      {loadState === 'ready' && overview && visibleSubjects.length === 0 ? (
        <p className="text-sm text-[var(--duck-muted)]">No subjects match your search.</p>
      ) : null}

      {loadState === 'ready' ? (
        <div className="space-y-2.5">
          {visibleSubjects.map((subject) => (
            <Link
              key={subject.code}
              to={`/subject/${subject.code}`}
              className="block transition hover:-translate-y-0.5"
            >
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
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
