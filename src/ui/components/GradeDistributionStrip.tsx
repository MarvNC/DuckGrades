import { useMemo, useState } from "react";
import type { Aggregate } from "../../lib/dataClient";

const numericalOrder = ["F", "DM", "D", "DP", "CM", "C", "CP", "BM", "B", "BP", "AM", "A", "AP"];
const nonNumericalOrder = ["P", "N", "OTHER"];

type GradeDistributionStripProps = {
  aggregate: Aggregate | null | undefined;
};

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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

  const xStep = 8;
  const xStart = 6;
  const baseY = 54;
  const graphHeight = 42;

  const points: Point[] = useMemo(() => {
    return numericalValues.map((count, index) => {
      const ratio = numericalTotal > 0 ? count / numericalTotal : 0;
      return {
        x: xStart + index * xStep,
        y: baseY - ratio * graphHeight,
      };
    });
  }, [numericalValues, numericalTotal]);

  const selectedCount = numericalValues[selectedNumerical] ?? 0;
  const selectedPercent = numericalTotal > 0 ? (selectedCount / numericalTotal) * 100 : 0;

  function selectNearestByClientX(clientX: number, bounds: DOMRect) {
    const relativeX = clientX - bounds.left;
    const viewBoxWidth = 108;
    const mappedX = (relativeX / bounds.width) * viewBoxWidth;
    const index = clamp(Math.round((mappedX - xStart) / xStep), 0, numericalOrder.length - 1);
    setSelectedNumerical(index);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]">Numerical distribution</p>
        <p className="mt-1 text-xs text-[var(--duck-muted)]">
          <span className="font-semibold text-[var(--duck-fg)]">{numericalOrder[selectedNumerical]}</span>: {selectedCount} students ({selectedPercent.toFixed(1)}%)
        </p>
        <div className="mt-2 rounded-xl border border-[var(--duck-border)] bg-[#f7faf2] p-2">
          <svg
            viewBox="0 0 108 58"
            className="h-20 w-full"
            role="img"
            aria-label="Numerical grade distribution chart"
            onMouseMove={(event) => {
              selectNearestByClientX(event.clientX, event.currentTarget.getBoundingClientRect());
            }}
            onTouchMove={(event) => {
              if (event.touches[0]) {
                selectNearestByClientX(event.touches[0].clientX, event.currentTarget.getBoundingClientRect());
              }
            }}
          >
            <defs>
              <linearGradient id="duck-grade-bg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef9a84" />
                <stop offset="35%" stopColor="#f2c487" />
                <stop offset="65%" stopColor="#d7e48a" />
                <stop offset="100%" stopColor="#9fdc84" />
              </linearGradient>
            </defs>
            <rect x="2" y="6" width="104" height="48" rx="6" fill="url(#duck-grade-bg)" opacity="0.3" />

            {points.slice(0, -1).map((point, index) => {
              const next = points[index + 1];
              return (
                <polygon
                  key={`${numericalOrder[index]}-${numericalOrder[index + 1]}`}
                  points={`${point.x},${baseY} ${point.x},${point.y} ${next.x},${next.y} ${next.x},${baseY}`}
                  fill={`hsl(${index * 8 + 10} 62% 62%)`}
                  opacity={selectedNumerical === index || selectedNumerical === index + 1 ? 0.95 : 0.62}
                />
              );
            })}

            <line x1={xStart} y1={baseY} x2={xStart + (numericalOrder.length - 1) * xStep} y2={baseY} stroke="#758670" strokeWidth="0.8" />

            <line
              x1={points[selectedNumerical]?.x ?? xStart}
              y1="6"
              x2={points[selectedNumerical]?.x ?? xStart}
              y2={baseY}
              stroke="#1f2b1a"
              strokeOpacity="0.45"
              strokeDasharray="2 2"
            />
            <circle
              cx={points[selectedNumerical]?.x ?? xStart}
              cy={points[selectedNumerical]?.y ?? baseY}
              r="2.4"
              fill="#1f2b1a"
            />
          </svg>
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
