import { useState } from "react";
import { CalendarDays, ChevronDown, Eye, Hash, ShieldAlert, Users } from "lucide-react";
import type { Aggregate } from "../../lib/dataClient";
import type { SectionRow } from "../../lib/dataClient";
import { NON_NUMERICAL_GRADE_ORDER, NUMERICAL_GRADE_ORDER, computeNumericalStats, formatGradeCode, formatGradeStat } from "../../lib/grades";
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
  const stats = computeNumericalStats(numericalCounts);

  return {
    totalNonWReported: section.totalNonWReported,
    totalVisibleNonW: visibleNonW,
    coverage,
    mean: stats.mean,
    median: stats.median,
    mode: stats.mode,
    numericalCounts,
    nonNumericalCounts,
    withdrawals,
  };
}

export function SectionDrilldown({ sections, summaryLabel = "Section details", identityPrefix }: SectionDrilldownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details className="mt-3 rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] p-3 open:shadow-sm" onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-1 py-0.5 text-sm font-semibold text-[var(--duck-muted-strong)] marker:content-none">
        <span className="inline-flex items-center gap-2">
          <ChevronDown className={`h-4 w-4 text-[var(--duck-muted)] transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`} aria-hidden="true" />
          {summaryLabel}
        </span>
      </summary>

      {isOpen ? (
        <div className="mt-2 space-y-2.5">
          {sections.map((section) => {
            const visible = visibleNumericalCount(section);
            const coverage = section.totalNonWReported > 0 ? (visible / section.totalNonWReported) * 100 : 0;
            const sectionAggregate = buildSectionAggregate(section);
            const hasHiddenBuckets = section.totalNonWReported > visible;
            const sourceLabel = section.sourceCourseCode && section.csvTitle
              ? `${section.sourceCourseCode} · ${section.csvTitle}`
              : section.sourceCourseCode ?? section.csvTitle ?? "";

            return (
              <article key={`${identityPrefix}-${section.crn}`} className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-3 py-3 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0 sm:flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--duck-muted-strong)]">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-[var(--duck-muted)]" aria-hidden="true" />
                        {section.termDesc}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[var(--duck-muted)]">
                        <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                        CRN {section.crn}
                      </span>
                      {sourceLabel ? <span className="text-[var(--duck-muted)] opacity-80">· {sourceLabel}</span> : null}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--duck-muted)]">
                        <Users className="h-2.5 w-2.5" aria-hidden="true" />
                        {section.totalNonWReported} students
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--duck-muted)]">
                        <Eye className="h-2.5 w-2.5" aria-hidden="true" />
                        {coverage.toFixed(1)}% visible
                      </span>
                      {hasHiddenBuckets ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--duck-danger-border)] bg-[var(--duck-danger-bg)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--duck-danger-text)]">
                          <ShieldAlert className="h-2.5 w-2.5" aria-hidden="true" />
                          redacted
                        </span>
                      ) : null}
                    </div>

                  </div>

                  <div className="flex flex-col items-end gap-1.5 sm:pl-2">
                    <GradeDistributionStrip aggregate={sectionAggregate} size="sm" showStudentCount={false} />
                    <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[10px] font-normal text-[var(--duck-muted)] opacity-70">
                      <span>
                        <span className="uppercase tracking-[0.08em] text-[var(--duck-muted)]">Mean</span> {formatGradeStat(sectionAggregate.mean)}
                      </span>
                      <span>
                        <span className="uppercase tracking-[0.08em] text-[var(--duck-muted)]">Median</span> {formatGradeStat(sectionAggregate.median)}
                      </span>
                      <span>
                        <span className="uppercase tracking-[0.08em] text-[var(--duck-muted)]">Mode</span> {formatGradeCode(sectionAggregate.mode)}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </details>
  );
}
