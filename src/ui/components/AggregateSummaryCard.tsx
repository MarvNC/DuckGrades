import type { Aggregate } from "../../lib/dataClient";
import { formatGradeCode, formatGradeStat } from "../../lib/grades";
import { GradeDistributionStrip } from "./GradeDistributionStrip";

type AggregateSummaryCardProps = {
  aggregate: Aggregate | null | undefined;
  label: string;
};

function formatCoverage(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function AggregateSummaryCard({ aggregate, label }: AggregateSummaryCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Mean</p>
          <p className="text-sm font-bold text-[var(--duck-fg)] sm:text-base">{formatGradeStat(aggregate?.mean)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Median</p>
          <p className="text-sm font-bold text-[var(--duck-fg)] sm:text-base">{formatGradeStat(aggregate?.median)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Mode</p>
          <p className="text-sm font-bold text-[var(--duck-fg)] sm:text-base">{formatGradeCode(aggregate?.mode)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Coverage</p>
          <p className="text-sm font-bold text-[var(--duck-fg)] sm:text-base">{formatCoverage(aggregate?.coverage)}</p>
        </div>
      </div>
      <div className="mt-4">
        <GradeDistributionStrip aggregate={aggregate} size="md" />
      </div>
    </section>
  );
}
