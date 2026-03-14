import type { Aggregate } from "../../lib/dataClient";
import { formatGradeCode, formatGradeStat } from "../../lib/grades";
import { GradeDistributionStrip } from "./GradeDistributionStrip";

type AggregateSummaryCardProps = {
  aggregate: Aggregate | null | undefined;
  label: string;
  metaChips?: string[];
  showDistributionStudentCount?: boolean;
};

export function AggregateSummaryCard({ aggregate, label, metaChips, showDistributionStudentCount = true }: AggregateSummaryCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>

      <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          <div className="flex flex-wrap gap-1.5">
            {(metaChips ?? []).map((chip) => (
              <span key={chip} className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                {chip}
              </span>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500">
            <span>
              <span className="uppercase tracking-[0.08em] text-slate-400">Mean</span> {formatGradeStat(aggregate?.mean)}
            </span>
            <span>
              <span className="uppercase tracking-[0.08em] text-slate-400">Median</span> {formatGradeStat(aggregate?.median)}
            </span>
            <span>
              <span className="uppercase tracking-[0.08em] text-slate-400">Mode</span> {formatGradeCode(aggregate?.mode)}
            </span>
          </div>
        </div>

        <div className="flex w-full justify-end sm:w-auto">
          <GradeDistributionStrip aggregate={aggregate} size="md" showStudentCount={showDistributionStudentCount} />
        </div>
      </div>
    </section>
  );
}
