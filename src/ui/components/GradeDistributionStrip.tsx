import type { Aggregate } from "../../lib/dataClient";

const numericalOrder = ["F", "DM", "D", "DP", "CM", "C", "CP", "BM", "B", "BP", "AM", "A", "AP"];
const nonNumericalOrder = ["P", "N", "OTHER"];

type GradeDistributionStripProps = {
  aggregate: Aggregate | null | undefined;
};

function getTotal(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}

export function GradeDistributionStrip({ aggregate }: GradeDistributionStripProps) {
  const numericalValues = numericalOrder.map((grade) => aggregate?.numericalCounts?.[grade] ?? 0);
  const nonNumericalValues = nonNumericalOrder.map((grade) => aggregate?.nonNumericalCounts?.[grade] ?? 0);
  const numericalTotal = getTotal(numericalValues);
  const nonNumericalTotal = getTotal(nonNumericalValues);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]">Numerical distribution</p>
        <div className="mt-2 flex h-3 overflow-hidden rounded-full border border-[var(--duck-border)] bg-[#eef2e8]">
          {numericalOrder.map((grade, index) => {
            const count = numericalValues[index];
            const ratio = numericalTotal > 0 ? (count / numericalTotal) * 100 : 0;
            return (
              <div
                key={grade}
                className="h-full"
                style={{ width: `${ratio}%`, backgroundColor: `hsl(${index * 8 + 8} 65% 68%)` }}
                title={`${grade}: ${count}`}
              />
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {nonNumericalOrder.map((grade, index) => {
          const count = nonNumericalValues[index];
          const ratio = nonNumericalTotal > 0 ? (count / nonNumericalTotal) * 100 : 0;
          return (
            <div key={grade} className="rounded-lg border border-[var(--duck-border)] bg-[#f8faf5] px-2 py-1.5">
              <p className="text-[11px] font-semibold text-[var(--duck-muted)]">{grade}</p>
              <p className="text-sm font-bold">{count}</p>
              <p className="text-[11px] text-[var(--duck-muted)]">{ratio.toFixed(1)}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
