import { useMemo, useState } from "react";
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
  const [selectedNumerical, setSelectedNumerical] = useState(0);
  const [selectedNonNumerical, setSelectedNonNumerical] = useState<number | null>(null);

  const numericalValues = numericalOrder.map((grade) => aggregate?.numericalCounts?.[grade] ?? 0);
  const nonNumericalValues = nonNumericalOrder.map((grade) => aggregate?.nonNumericalCounts?.[grade] ?? 0);
  const numericalTotal = getTotal(numericalValues);
  const nonNumericalTotal = getTotal(nonNumericalValues);

  const selectedCount = numericalValues[selectedNumerical] ?? 0;
  const selectedPercent = numericalTotal > 0 ? (selectedCount / numericalTotal) * 100 : 0;
  const numericalMax = useMemo(() => Math.max(1, ...numericalValues), [numericalValues]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]">Numerical distribution</p>
        <p className="mt-1 text-xs text-[var(--duck-muted)]">
          <span className="font-semibold text-[var(--duck-fg)]">{numericalOrder[selectedNumerical]}</span>: {selectedCount} students ({selectedPercent.toFixed(1)}%)
        </p>
        <div className="mt-2 rounded-xl border border-[var(--duck-border)] bg-[#f7faf2] p-2">
          <div
            className="grid h-20 items-end gap-1"
            style={{
              gridTemplateColumns: `repeat(${numericalOrder.length}, minmax(0, 1fr))`,
            }}
          >
            {numericalOrder.map((grade, index) => {
              const count = numericalValues[index];
              const ratio = count / numericalMax;
              const height = Math.max(8, Math.round(ratio * 64));
              const isActive = selectedNumerical === index;

              return (
                <button
                  key={grade}
                  type="button"
                  className={`w-full rounded-sm transition ${isActive ? "ring-2 ring-[#86ac67]" : "opacity-85 hover:opacity-100"}`}
                  style={{
                    height,
                    backgroundColor: `hsl(${index * 9 + 8} 66% 66%)`,
                    alignSelf: "end",
                  }}
                  title={`${grade}: ${count}`}
                  aria-label={`${grade} ${count} students`}
                  onFocus={() => setSelectedNumerical(index)}
                  onMouseEnter={() => setSelectedNumerical(index)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]">Non-numerical distribution</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {nonNumericalOrder.map((grade, index) => {
            const count = nonNumericalValues[index];
            const ratio = nonNumericalTotal > 0 ? (count / nonNumericalTotal) * 100 : 0;
            const showingCount = selectedNonNumerical === index;
            return (
              <button
                key={grade}
                type="button"
                className="rounded-lg border border-[var(--duck-border)] bg-[#f8faf5] px-2 py-1.5 text-left"
                onMouseEnter={() => setSelectedNonNumerical(index)}
                onFocus={() => setSelectedNonNumerical(index)}
                onMouseLeave={() => setSelectedNonNumerical(null)}
                onBlur={() => setSelectedNonNumerical(null)}
              >
                <p className="text-[11px] font-semibold text-[var(--duck-muted)]">{grade}</p>
                <p className="text-sm font-bold">{showingCount ? `${count} students` : `${ratio.toFixed(1)}%`}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
