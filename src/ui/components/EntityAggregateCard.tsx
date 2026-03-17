import { useState, type ReactNode } from 'react';
import { MetaChip } from './MetaChip';
import { ChevronDown } from 'lucide-react';
import { type Aggregate } from '../../lib/dataClient';
import { formatGradeCode, formatGradeStat } from '../../lib/grades';
import { GradeDistributionStrip } from './GradeDistributionStrip';
import { PrefetchLink } from './PrefetchLink';

type EntityAggregateCardProps = {
  title: string;
  titleHref?: string;
  subtitle?: string;
  inlineMetaChips?: string[];
  aggregate: Aggregate | null | undefined;
  distributionSize?: 'sm' | 'md';
  showStudentCountInDistribution?: boolean;
  /** When true the card is forced open regardless of user toggle state */
  forceOpen?: boolean;
  children?: ReactNode;
};

export function EntityAggregateCard({
  title,
  titleHref,
  subtitle,
  inlineMetaChips,
  aggregate,
  distributionSize = 'sm',
  showStudentCountInDistribution = false,
  forceOpen = false,
  children,
}: EntityAggregateCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isExpandable = Boolean(children);
  const effectivelyOpen = forceOpen || isOpen;

  return (
    <article
      className={`relative rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--duck-border-strong)] hover:bg-[var(--duck-surface-soft)] hover:shadow-md ${isExpandable ? 'cursor-pointer' : ''}`}
      onClick={(e) => {
        if (isExpandable && !(e.target as HTMLElement).closest('a')) {
          setIsOpen(!isOpen);
        }
      }}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          <div className="flex flex-wrap items-center">
            {titleHref ? (
              <PrefetchLink
                to={titleHref}
                className="text-lg font-bold tracking-tight text-[var(--duck-fg)] hover:underline"
              >
                {title}
              </PrefetchLink>
            ) : (
              <p className="text-lg font-bold tracking-tight text-[var(--duck-fg)]">{title}</p>
            )}

            {subtitle ? (
              <p className="max-w-full truncate text-lg font-bold tracking-tight text-[var(--duck-muted-strong)]">
                <span className="px-1.5 text-[var(--duck-muted)]">-</span>
                <span>{subtitle}</span>
              </p>
            ) : null}
          </div>

          {(inlineMetaChips ?? []).length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(inlineMetaChips ?? []).map((chip) => (
                <MetaChip key={chip} chip={chip} />
              ))}
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
      {isExpandable && !effectivelyOpen ? (
        <ChevronDown
          className="absolute bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 text-[var(--duck-muted)]/60"
          aria-hidden="true"
        />
      ) : null}
      {children && effectivelyOpen ? (
        <div
          id={`section-drilldown-${title}`}
          className="mt-4 border-t border-[var(--duck-border)] pt-4"
        >
          {children}
        </div>
      ) : null}
    </article>
  );
}
