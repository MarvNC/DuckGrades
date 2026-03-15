import { MetaChip } from './MetaChip';
import type { Aggregate } from '../../lib/dataClient';
import { formatGradeCode, formatGradeStat } from '../../lib/grades';
import { GradeDistributionStrip } from './GradeDistributionStrip';

type AggregateSummaryCardProps = {
  aggregate: Aggregate | null | undefined;
  label?: string;
  metaChips?: string[];
  showDistributionStudentCount?: boolean;
  embedded?: boolean;
};

export function AggregateSummaryCard({
  aggregate,
  label,
  metaChips,
  showDistributionStudentCount = true,
  embedded = false,
}: AggregateSummaryCardProps) {
  const hasMetaChips = (metaChips ?? []).length > 0;

  return (
    <section
      className={
        embedded
          ? 'pt-1'
          : 'rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3.5 shadow-sm sm:p-4'
      }
    >
      {label ? (
        <p className="text-xs font-semibold tracking-[0.12em] text-[var(--duck-muted)] uppercase">
          {label}
        </p>
      ) : null}

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center ${hasMetaChips ? 'sm:justify-between sm:gap-4' : 'sm:justify-end'} ${label ? 'mt-2.5' : ''}`}
      >
        {hasMetaChips ? (
          <div className="min-w-0 sm:flex-1">
            <div className="flex flex-wrap gap-1.5">
              {(metaChips ?? []).map((chip) => (
                <MetaChip key={chip} chip={chip} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex w-full flex-col items-start gap-1.5 sm:w-auto sm:items-end">
          <GradeDistributionStrip
            aggregate={aggregate}
            size="md"
            showStudentCount={showDistributionStudentCount}
          />
          <div className="flex flex-wrap justify-start gap-x-3 gap-y-1 text-[10px] font-normal text-[var(--duck-muted)] opacity-70 sm:justify-end">
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
    </section>
  );
}
