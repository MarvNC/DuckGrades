import type { SectionRow } from "../../lib/dataClient";

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

export function SectionDrilldown({ sections, summaryLabel = "Section details", identityPrefix }: SectionDrilldownProps) {
  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-[#f7faf2] p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">{summaryLabel}</summary>
      <div className="mt-2 space-y-2">
        {sections.map((section) => {
          const visible = visibleNumericalCount(section);
          const coverage = section.totalNonWReported > 0 ? (visible / section.totalNonWReported) * 100 : 0;
          return (
            <div key={`${identityPrefix}-${section.crn}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {section.termDesc} · CRN {section.crn}
              </p>
              <p className="text-sm text-slate-600">
                Reported non-W: {section.totalNonWReported} · Visible: {visible} ({coverage.toFixed(1)}%)
              </p>
            </div>
          );
        })}
      </div>
    </details>
  );
}
