import { Layers, Users } from "lucide-react";
import type { Aggregate } from "../../lib/dataClient";
import { formatGradeCode, formatGradeStat } from "../../lib/grades";
import { GradeDistributionStrip } from "./GradeDistributionStrip";

type AggregateSummaryCardProps = {
  aggregate: Aggregate | null | undefined;
  label?: string;
  metaChips?: string[];
  showDistributionStudentCount?: boolean;
  embedded?: boolean;
};

function renderMetaChip(chip: string) {
  const normalized = chip.trim().toLowerCase();
  const icon = normalized.endsWith(" sections") ? <Layers className="h-3 w-3" aria-hidden="true" /> : normalized.endsWith(" students") ? <Users className="h-3 w-3" aria-hidden="true" /> : null;

  return (
    <span key={chip} className="inline-flex items-center gap-1 rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--duck-muted-strong)]">
      {icon}
      <span>{chip}</span>
    </span>
  );
}

export function AggregateSummaryCard({ aggregate, label, metaChips, showDistributionStudentCount = true, embedded = false }: AggregateSummaryCardProps) {
  const hasMetaChips = (metaChips ?? []).length > 0;

  return (
    <section className={embedded ? "pt-1" : "rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3.5 shadow-sm sm:p-4"}>
      {label ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--duck-muted)]">{label}</p> : null}

      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${hasMetaChips ? "sm:justify-between sm:gap-4" : "sm:justify-end"} ${label ? "mt-2.5" : ""}`}>
        {hasMetaChips ? (
          <div className="min-w-0 sm:flex-1">
            <div className="flex flex-wrap gap-1.5">{(metaChips ?? []).map(renderMetaChip)}</div>
          </div>
        ) : null}

        <div className="flex w-full flex-col items-start gap-1.5 sm:w-auto sm:items-end">
          <GradeDistributionStrip aggregate={aggregate} size="md" showStudentCount={showDistributionStudentCount} />
          <div className="flex flex-wrap justify-start gap-x-3 gap-y-1 text-[10px] font-normal text-[var(--duck-muted)] opacity-70 sm:justify-end">
            <span>
              <span className="uppercase tracking-[0.08em] text-[var(--duck-muted)]">Mean</span> {formatGradeStat(aggregate?.mean)}
            </span>
            <span>
              <span className="uppercase tracking-[0.08em] text-[var(--duck-muted)]">Median</span> {formatGradeStat(aggregate?.median)}
            </span>
            <span>
              <span className="uppercase tracking-[0.08em] text-[var(--duck-muted)]">Mode</span> {formatGradeCode(aggregate?.mode)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
