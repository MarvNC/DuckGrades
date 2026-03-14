import type { Aggregate } from "../../lib/dataClient";
import type { SectionRow } from "../../lib/dataClient";
import { NON_NUMERICAL_GRADE_ORDER, NUMERICAL_GRADE_ORDER } from "../../lib/grades";
import { GradeDistributionStrip } from "./GradeDistributionStrip";

type SectionDrilldownProps = {
  sections: SectionRow[];
  summaryLabel?: string;
  identityPrefix: string;
};

function visibleNumericalCount(section: SectionRow): number {
  return Object.entries(section.counts)
    .filter(([grade]) => grade !== "W")
    .reduce((sum, [, value]) => sum + (value ?? 0), 0);
}

function buildSectionAggregate(section: SectionRow): Aggregate {
  const numericalCounts: Record<string, number> = {};
  const nonNumericalCounts: Record<string, number> = {};

  for (const code of NUMERICAL_GRADE_ORDER) {
    numericalCounts[code] = section.counts[code] ?? 0;
  }

  for (const code of NON_NUMERICAL_GRADE_ORDER) {
    nonNumericalCounts[code] = section.counts[code] ?? 0;
  }

  const visibleNonW = visibleNumericalCount(section);
  const withdrawals = section.counts.W ?? 0;
  const coverage = section.totalNonWReported > 0 ? visibleNonW / section.totalNonWReported : null;

  return {
    totalNonWReported: section.totalNonWReported,
    totalVisibleNonW: visibleNonW,
    coverage,
    mean: null,
    median: null,
    mode: null,
    numericalCounts,
    nonNumericalCounts,
    withdrawals,
  };
}

export function SectionDrilldown({ sections, summaryLabel = "Section details", identityPrefix }: SectionDrilldownProps) {
  const totalReported = sections.reduce((sum, section) => sum + section.totalNonWReported, 0);

  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-[#f7faf2] p-3 open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-1 py-0.5 text-sm font-semibold text-slate-700 marker:content-none">
        <span className="inline-flex items-center gap-2">
          <span className="text-slate-500">▼</span>
          {summaryLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white/70 px-2 py-0.5">{sections.length} sections</span>
          <span className="rounded-full border border-slate-200 bg-white/70 px-2 py-0.5">{totalReported} students</span>
        </span>
      </summary>

      <div className="mt-2 space-y-2.5">
        {sections.map((section) => {
          const visible = visibleNumericalCount(section);
          const coverage = section.totalNonWReported > 0 ? (visible / section.totalNonWReported) * 100 : 0;
          const sectionAggregate = buildSectionAggregate(section);
          const hasHiddenBuckets = section.totalNonWReported > visible;

          return (
            <article key={`${identityPrefix}-${section.crn}`} className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0 sm:flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                      {section.termDesc} · CRN {section.crn}
                    </p>
                    <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {section.totalNonWReported} students
                    </span>
                    <span className="rounded-full border border-slate-200 bg-[#f7faf2] px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {visible} visible ({coverage.toFixed(1)}%)
                    </span>
                  </div>

                  {hasHiddenBuckets ? <p className="mt-1 text-[11px] text-slate-500">Some grade buckets are redacted for this section in source data.</p> : null}
                </div>

                <div className="flex justify-end sm:pl-2">
                  <GradeDistributionStrip aggregate={sectionAggregate} size="sm" showStudentCount={false} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </details>
  );
}
