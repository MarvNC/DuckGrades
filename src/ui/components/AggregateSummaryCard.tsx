import type { Aggregate } from "../../lib/dataClient";
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

function formatMean(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return value.toFixed(2);
}

function formatMedian(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return value.toFixed(2);
}

export function AggregateSummaryCard({ aggregate, label }: AggregateSummaryCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Mean</p>
          <p className="text-lg font-extrabold text-[var(--duck-fg)]">{formatMean(aggregate?.mean)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Median</p>
          <p className="text-lg font-extrabold text-[var(--duck-fg)]">{formatMedian(aggregate?.median)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Mode</p>
          <p className="text-lg font-extrabold text-[var(--duck-fg)]">{aggregate?.mode ?? "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Coverage</p>
          <p className="text-lg font-extrabold text-[var(--duck-fg)]">{formatCoverage(aggregate?.coverage)}</p>
        </div>
      </div>
      <div className="mt-4">
        <GradeDistributionStrip aggregate={aggregate} />
      </div>
    </section>
  );
}
