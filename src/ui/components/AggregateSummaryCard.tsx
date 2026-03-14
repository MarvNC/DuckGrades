import type { Aggregate } from "../../lib/dataClient";

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
    <section className="rounded-2xl border border-[var(--duck-border)] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--duck-muted)]">{label}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]">Mean</p>
          <p className="text-lg font-extrabold">{formatMean(aggregate?.mean)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]">Median</p>
          <p className="text-lg font-extrabold">{formatMedian(aggregate?.median)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]">Mode</p>
          <p className="text-lg font-extrabold">{aggregate?.mode ?? "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]">Coverage</p>
          <p className="text-lg font-extrabold">{formatCoverage(aggregate?.coverage)}</p>
        </div>
      </div>
    </section>
  );
}
