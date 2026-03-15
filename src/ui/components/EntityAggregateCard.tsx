import type { ReactNode } from 'react';
import { Layers, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { prefetchRouteData, type Aggregate } from '../../lib/dataClient';
import { formatGradeCode, formatGradeStat } from '../../lib/grades';
import { GradeDistributionStrip } from './GradeDistributionStrip';

type EntityAggregateCardProps = {
  title: string;
  titleHref?: string;
  subtitle?: string;
  inlineMetaChips?: string[];
  aggregate: Aggregate | null | undefined;
  distributionSize?: 'sm' | 'md';
  showStudentCountInDistribution?: boolean;
  children?: ReactNode;
};

function renderMetaChip(chip: string) {
  const normalized = chip.trim().toLowerCase();
  const icon = normalized.endsWith(' sections') ? (
    <Layers className="h-3 w-3" aria-hidden="true" />
  ) : normalized.endsWith(' students') ? (
    <Users className="h-3 w-3" aria-hidden="true" />
  ) : null;

  return (
    <span
      key={chip}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--duck-muted-strong)]"
    >
      {icon}
      <span>{chip}</span>
    </span>
  );
}

export function EntityAggregateCard({
  title,
  titleHref,
  subtitle,
  inlineMetaChips,
  aggregate,
  distributionSize = 'sm',
  showStudentCountInDistribution = false,
  children,
}: EntityAggregateCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3.5 shadow-sm">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {titleHref ? (
              <Link
                to={titleHref}
                className="text-lg font-bold tracking-tight text-[var(--duck-fg)] hover:underline"
                onMouseEnter={() => prefetchRouteData(titleHref)}
                onFocus={() => prefetchRouteData(titleHref)}
              >
                {title}
              </Link>
            ) : (
              <p className="text-lg font-bold tracking-tight text-[var(--duck-fg)]">{title}</p>
            )}

            {subtitle ? (
              <p className="max-w-full truncate text-base font-medium text-[var(--duck-muted-strong)]">
                <span className="px-0.5 text-[var(--duck-muted)]">·</span>
                <span>{subtitle}</span>
              </p>
            ) : null}
          </div>

          {(inlineMetaChips ?? []).length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(inlineMetaChips ?? []).map(renderMetaChip)}
            </div>
          ) : null}
        </div>

        <div className="flex w-full flex-col items-end gap-1.5 sm:w-auto sm:pl-2">
          <GradeDistributionStrip
            aggregate={aggregate}
            size={distributionSize}
            showStudentCount={showStudentCountInDistribution}
          />
          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[10px] font-normal text-[var(--duck-muted)] opacity-70">
            <span>
              <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">Mean</span>{' '}
              {formatGradeStat(aggregate?.mean)}
            </span>
            <span>
              <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">Median</span>{' '}
              {formatGradeStat(aggregate?.median)}
            </span>
            <span>
              <span className="tracking-[0.08em] text-[var(--duck-muted)] uppercase">Mode</span>{' '}
              {formatGradeCode(aggregate?.mode)}
            </span>
          </div>
        </div>
      </div>

      {children ? <div className="mt-2">{children}</div> : null}
    </article>
  );
}
