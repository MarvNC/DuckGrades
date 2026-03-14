import { useId, useMemo, useState } from "react";
import type { Aggregate } from "../../lib/dataClient";
import { NON_NUMERICAL_GRADE_ORDER, NUMERICAL_GRADE_ORDER, formatGradeCode, formatGradeDetailCode } from "../../lib/grades";

type GradeDistributionStripProps = {
  aggregate: Aggregate | null | undefined;
  size?: "sm" | "md";
  showStudentCount?: boolean;
};

type Point = { x: number; y: number };
type LeftBucketCode = (typeof NON_NUMERICAL_GRADE_ORDER)[number] | "W";
type ActiveDatum =
  | {
      kind: "numerical";
      index: number;
    }
  | {
      kind: "left";
      code: LeftBucketCode;
    }
  | null;

const LEFT_BUCKET_ORDER: LeftBucketCode[] = ["P", "N", "OTHER", "W"];
const LEFT_BUCKET_COLORS: Record<LeftBucketCode, string> = {
  P: "#7dbf8a",
  N: "#88a7c6",
  OTHER: "#c7b182",
  W: "#c98f90",
};

function getPercent(count: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return (count / total) * 100;
}

function compactLeftLabel(code: LeftBucketCode): string {
  if (code === "OTHER") {
    return "O";
  }
  return formatGradeCode(code);
}

export function GradeDistributionStrip({ aggregate, size = "md", showStudentCount = true }: GradeDistributionStripProps) {
  const gradientId = useId().replace(/:/g, "");
  const [activeDatum, setActiveDatum] = useState<ActiveDatum>(null);

  const numericalValues = NUMERICAL_GRADE_ORDER.map((grade) => aggregate?.numericalCounts?.[grade] ?? 0);
  const nonNumericalValues = NON_NUMERICAL_GRADE_ORDER.map((grade) => aggregate?.nonNumericalCounts?.[grade] ?? 0);
  const visibleTotal = aggregate?.totalVisibleNonW ?? 0;
  const reportedTotal = aggregate?.totalNonWReported ?? 0;
  const displayedTotal = reportedTotal > 0 ? reportedTotal : visibleTotal;
  const withdrawals = aggregate?.withdrawals ?? 0;
  const allWithWithdrawals = displayedTotal + withdrawals;

  const xStart = 0;
  const xEnd = 112;
  const viewBoxHeight = size === "sm" ? 22 : 24;
  const baseY = size === "sm" ? 20 : 22;
  const graphHeight = size === "sm" ? 10 : 12;
  const xStep = (xEnd - xStart) / (NUMERICAL_GRADE_ORDER.length - 1);
  const maxNumerical = Math.max(1, ...numericalValues);

  const points: Point[] = useMemo(() => {
    return numericalValues.map((count, index) => {
      const ratio = count / maxNumerical;
      const scaled = count > 0 ? 0.24 + 0.76 * Math.pow(ratio, 0.72) : 0;
      return {
        x: xStart + index * xStep,
        y: baseY - scaled * graphHeight,
      };
    });
  }, [baseY, graphHeight, maxNumerical, numericalValues, xStart, xStep]);

  const defaultNumericalIndex = useMemo(() => {
    let maxCount = -1;
    let maxIndex = 0;
    numericalValues.forEach((count, index) => {
      if (count > maxCount) {
        maxCount = count;
        maxIndex = index;
      }
    });
    return maxIndex;
  }, [numericalValues]);

  function getNumericalDetails(index: number): string {
    const grade = NUMERICAL_GRADE_ORDER[index] ?? NUMERICAL_GRADE_ORDER[0];
    const count = numericalValues[index] ?? 0;
    const percent = getPercent(count, displayedTotal);
    return `${formatGradeCode(grade)}: ${count.toLocaleString()} (${percent.toFixed(1)}%)`;
  }

  const leftCounts: Record<LeftBucketCode, number> = {
    P: nonNumericalValues[0] ?? 0,
    N: nonNumericalValues[1] ?? 0,
    OTHER: nonNumericalValues[2] ?? 0,
    W: withdrawals,
  };

  function getLeftBucketDetails(code: LeftBucketCode): string {
    const count = leftCounts[code] ?? 0;
    const percent = getPercent(count, code === "W" ? allWithWithdrawals : displayedTotal);
    return `${formatGradeDetailCode(code)}: ${count.toLocaleString()} (${percent.toFixed(1)}%)`;
  }

  const resolvedActive = activeDatum ?? { kind: "numerical" as const, index: defaultNumericalIndex };
  const isNumericalActive = resolvedActive.kind === "numerical";
  const activeNumericalIndex = isNumericalActive ? resolvedActive.index : defaultNumericalIndex;
  const activePoint = points[activeNumericalIndex] ?? { x: xStart, y: baseY };
  const activeText = resolvedActive.kind === "left" ? getLeftBucketDetails(resolvedActive.code) : getNumericalDetails(resolvedActive.index);

  const leftMax = Math.max(1, ...LEFT_BUCKET_ORDER.map((code) => leftCounts[code] ?? 0));
  const leftMaxHeight = size === "sm" ? 14 : 18;
  const chartWidthClass = size === "sm" ? "w-[13rem] sm:w-[14.5rem] lg:w-[16rem]" : "w-[15.5rem] sm:w-[17.5rem] lg:w-[19rem]";
  const leftBarWidthClass = size === "sm" ? "w-2.5" : "w-3";

  const numericalTextSummary = NUMERICAL_GRADE_ORDER.map((_, index) => getNumericalDetails(index)).join(", ");
  const nonNumericalTextSummary = LEFT_BUCKET_ORDER.map((code) => getLeftBucketDetails(code)).join(", ");

  return (
    <div
      className={`inline-flex w-fit max-w-full flex-col rounded-lg border border-[var(--duck-border)] bg-[#f7faf2] ${size === "sm" ? "p-1.5" : "p-2"}`}
      onMouseLeave={() => setActiveDatum(null)}
    >
      <div className={`flex items-center gap-2 ${showStudentCount ? "justify-between" : "justify-end"}`}>
        {showStudentCount ? (
          <p className={`rounded-md bg-white/95 px-2 py-0.5 font-semibold uppercase tracking-[0.09em] text-slate-700 ${size === "sm" ? "text-[9px]" : "text-[10px]"}`}>
            {displayedTotal.toLocaleString()} students
          </p>
        ) : null}
        <p className={`${size === "sm" ? "text-[9px]" : "text-[10px]"} max-w-[13rem] truncate text-right font-semibold text-slate-600 sm:max-w-[14rem]`}>{activeText}</p>
      </div>

      <div className={`mt-1 flex items-end ${size === "sm" ? "gap-0" : "gap-0.5"}`}>
        <div className={`flex shrink-0 items-end border-r border-dashed border-[var(--duck-border)] ${size === "sm" ? "gap-0.5 pr-0.5" : "gap-0.5 pr-1"}`}>
          {LEFT_BUCKET_ORDER.map((code) => {
            const count = leftCounts[code] ?? 0;
            const height = Math.max(2, Math.round((count / leftMax) * leftMaxHeight));
            const isSelected = resolvedActive.kind === "left" && resolvedActive.code === code;
            return (
              <button
                key={code}
                type="button"
                className={`flex ${leftBarWidthClass} flex-col items-center gap-0.5 rounded-sm`}
                onMouseEnter={() => setActiveDatum({ kind: "left", code })}
                onFocus={() => setActiveDatum({ kind: "left", code })}
                onBlur={() => setActiveDatum(null)}
                onTouchStart={() => setActiveDatum({ kind: "left", code })}
                aria-label={getLeftBucketDetails(code)}
              >
                <span
                  className="block w-full rounded-[3px] transition-opacity"
                  style={{
                    backgroundColor: LEFT_BUCKET_COLORS[code],
                    height,
                    opacity: isSelected ? 1 : count > 0 ? 0.82 : 0.35,
                  }}
                />
                <span className={`${size === "sm" ? "text-[8px]" : "text-[9px]"} font-semibold uppercase tracking-[0.06em] text-slate-500`}>
                  {compactLeftLabel(code)}
                </span>
              </button>
            );
          })}
        </div>

        <div className={`${chartWidthClass} inline-block max-w-full`}>
          <svg
            viewBox={`0 0 112 ${viewBoxHeight}`}
            className={`${size === "sm" ? "h-10" : "h-12"} w-full`}
            role="img"
            aria-label="Combined numerical and non-numerical grade distribution"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef9a84" />
                <stop offset="35%" stopColor="#f2c487" />
                <stop offset="65%" stopColor="#d7e48a" />
                <stop offset="100%" stopColor="#9fdc84" />
              </linearGradient>
            </defs>

            <rect x={xStart} y={baseY - graphHeight - 1} width={xEnd - xStart} height={graphHeight + 1} rx="4" fill={`url(#${gradientId})`} opacity="0.24" />

            {points.slice(0, -1).map((point, index) => {
              const next = points[index + 1];
              const hue = 10 + (index / (NUMERICAL_GRADE_ORDER.length - 2)) * 128;
              return (
                <polygon
                  key={`${NUMERICAL_GRADE_ORDER[index]}-${NUMERICAL_GRADE_ORDER[index + 1]}`}
                  points={`${point.x},${baseY} ${point.x},${point.y} ${next.x},${next.y} ${next.x},${baseY}`}
                  fill={`hsl(${hue} 62% 58%)`}
                  fillOpacity="0.92"
                />
              );
            })}

            <line x1={xStart} y1={baseY} x2={xEnd} y2={baseY} stroke="#6f8270" strokeWidth="0.8" />

            {isNumericalActive ? (
              <>
                <line x1={activePoint.x} y1={baseY - graphHeight - 1} x2={activePoint.x} y2={baseY} stroke="#1f2b1a" strokeOpacity="0.45" strokeDasharray="2 2" />
                <circle cx={activePoint.x} cy={activePoint.y} r="1.8" fill="#1f2b1a" />
              </>
            ) : null}

            {NUMERICAL_GRADE_ORDER.map((_, index) => {
              const left = xStart + Math.max(0, index - 0.5) * xStep;
              const width = index === 0 || index === NUMERICAL_GRADE_ORDER.length - 1 ? xStep / 2 : xStep;
              return (
                <rect
                  key={`hitbox-${index}`}
                  x={left}
                  y={baseY - graphHeight - 2}
                  width={width}
                  height={graphHeight + 4}
                  fill="transparent"
                  onMouseEnter={() => setActiveDatum({ kind: "numerical", index })}
                  onTouchStart={() => setActiveDatum({ kind: "numerical", index })}
                >
                  <title>{getNumericalDetails(index)}</title>
                </rect>
              );
            })}
          </svg>
        </div>
      </div>

      <p className="sr-only">Numerical distribution values: {numericalTextSummary}.</p>
      <p className="sr-only">Non numerical distribution values: {nonNumericalTextSummary}.</p>
    </div>
  );
}
