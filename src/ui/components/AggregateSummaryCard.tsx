import type { Aggregate } from "../../lib/dataClient";
import { formatGradeCode, formatGradeStat } from "../../lib/grades";
import { GradeDistributionStrip } from "./GradeDistributionStrip";

type AggregateSummaryCardProps = {
  aggregate: Aggregate | null | undefined;
  label: string;
  metaChips?: string[];
  totalStudentsOverride?: number | null;
};

export function AggregateSummaryCard({ aggregate, label, metaChips, totalStudentsOverride }: AggregateSummaryCardProps) {
  const totalStudents = totalStudentsOverride ?? aggregate?.totalNonWReported ?? aggregate?.totalVisibleNonW ?? 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
          {totalStudents.toLocaleString()} students
        </span>
      </div>

      <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
            {(metaChips ?? []).map((chip) => (
              <span key={chip} className="rounded-full border border-slate-200 bg-[#f7faf2] px-2 py-0.5">
                {chip}
              </span>
            ))}
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Mean {formatGradeStat(aggregate?.mean)}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Median {formatGradeStat(aggregate?.median)}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Mode {formatGradeCode(aggregate?.mode)}</span>
          </div>
        </div>

        <div className="flex w-full justify-end sm:w-auto">
          <GradeDistributionStrip aggregate={aggregate} size="md" showStudentCount={false} />
        </div>
      </div>
    </section>
  );
}
