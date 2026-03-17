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
  hero?: boolean;
};

export function AggregateSummaryCard({
  aggregate,
  label,
  metaChips,
  showDistributionStudentCount = true,
  embedded = false,
  hero = false,
}: AggregateSummaryCardProps) {
  const hasMetaChips = (metaChips ?? []).length > 0;

  return (
    <section
      className={
        embedded
          ? hero
            ? ''
            : 'pt-1'
          : 'rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3.5 shadow-sm sm:p-4'
      }
    >
      {label ? (
        <p className="text-xs font-semibold tracking-[0.12em] text-[var(--duck-muted)] uppercase">
          {label}
        </p>
      ) : null}

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center ${hasMetaChips ? 'sm:justify-between sm:gap-4' : 'sm:justify-center'} ${label ? 'mt-2.5' : ''}`}
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

        <div
          className={`flex w-full flex-col gap-2 ${hero ? 'items-center' : 'items-start sm:w-auto sm:items-end'} ${hero ? 'sm:gap-3' : 'gap-1.5'}`}
        >
          <GradeDistributionStrip
            aggregate={aggregate}
            size={hero ? 'lg' : 'md'}
            showStudentCount={showDistributionStudentCount}
          />
          <div
            className={`flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-normal text-[var(--duck-muted)] opacity-70 ${hero ? 'justify-center' : 'justify-start sm:justify-end'}`}
          >
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
