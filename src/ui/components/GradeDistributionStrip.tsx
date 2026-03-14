import { useMemo, useState } from "react";
import type { Aggregate } from "../../lib/dataClient";
import { NON_NUMERICAL_GRADE_ORDER, NUMERICAL_GRADE_ORDER, formatGradeDetailCode } from "../../lib/grades";

type GradeDistributionStripProps = {
  aggregate: Aggregate | null | undefined;
  size?: "sm" | "md";
  showStudentCount?: boolean;
};

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

export function GradeDistributionStrip({ aggregate, size = "md", showStudentCount = true }: GradeDistributionStripProps) {
  const [activeDatum, setActiveDatum] = useState<ActiveDatum>(null);

  const numericalValues = NUMERICAL_GRADE_ORDER.map((grade) => aggregate?.numericalCounts?.[grade] ?? 0);
  const nonNumericalValues = NON_NUMERICAL_GRADE_ORDER.map((grade) => aggregate?.nonNumericalCounts?.[grade] ?? 0);
  const visibleTotal = aggregate?.totalVisibleNonW ?? 0;
  const reportedTotal = aggregate?.totalNonWReported ?? 0;
  const displayedTotal = reportedTotal > 0 ? reportedTotal : visibleTotal;
  const withdrawals = aggregate?.withdrawals ?? 0;
  const allWithWithdrawals = displayedTotal + withdrawals;

  const numericalMax = Math.max(1, ...numericalValues);
  const leftCounts: Record<LeftBucketCode, number> = {
    P: nonNumericalValues[0] ?? 0,
    N: nonNumericalValues[1] ?? 0,
    OTHER: nonNumericalValues[2] ?? 0,
    W: withdrawals,
  };
  const leftMax = Math.max(1, ...LEFT_BUCKET_ORDER.map((code) => leftCounts[code] ?? 0));

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
    const displayGrade = grade
      .replace("AP", "A+")
      .replace("AM", "A-")
      .replace("BP", "B+")
      .replace("BM", "B-")
      .replace("CP", "C+")
      .replace("CM", "C-")
      .replace("DP", "D+")
      .replace("DM", "D-");
    return `${displayGrade}: ${count.toLocaleString()} (${percent.toFixed(1)}%)`;
  }

  function getLeftBucketDetails(code: LeftBucketCode): string {
    const count = leftCounts[code] ?? 0;
    const percent = getPercent(count, code === "W" ? allWithWithdrawals : displayedTotal);
    return `${formatGradeDetailCode(code)}: ${count.toLocaleString()} (${percent.toFixed(1)}%)`;
  }

  const resolvedActive = activeDatum ?? { kind: "numerical" as const, index: defaultNumericalIndex };
  const activeText = resolvedActive.kind === "left" ? getLeftBucketDetails(resolvedActive.code) : getNumericalDetails(resolvedActive.index);

  const numericalBarHeight = size === "sm" ? 20 : 24;
  const leftBarHeight = size === "sm" ? 14 : 18;
  const chartWidthClass = size === "sm" ? "w-[11.5rem] sm:w-[12.5rem] lg:w-[13.5rem]" : "w-[14rem] sm:w-[15.5rem] lg:w-[16.5rem]";

  return (
    <div className="inline-flex w-fit max-w-full flex-col" onMouseLeave={() => setActiveDatum(null)}>
      <div className={`flex items-center gap-2 ${showStudentCount ? "justify-between" : "justify-end"}`}>
        {showStudentCount ? (
          <p className={`rounded-md bg-white/95 px-2 py-0.5 font-semibold uppercase tracking-[0.09em] text-slate-700 ${size === "sm" ? "text-[9px]" : "text-[10px]"}`}>
            {displayedTotal.toLocaleString()} students
          </p>
        ) : null}
        <p className={`${size === "sm" ? "text-[9px]" : "text-[10px]"} max-w-[13rem] truncate text-right font-semibold text-slate-600 sm:max-w-[14rem]`}>{activeText}</p>
      </div>

      <div className={`mt-1 flex items-end ${size === "sm" ? "gap-0.5" : "gap-1"}`}>
        <div className="shrink-0">
          <div
            className={`grid grid-cols-4 items-end border-r border-dashed border-[var(--duck-border)] ${
              size === "sm" ? "w-[2.9rem] gap-0.5 pr-0.5" : "w-[3.8rem] gap-0.5 pr-1"
            }`}
            style={{ height: leftBarHeight }}
          >
            {LEFT_BUCKET_ORDER.map((code) => {
              const count = leftCounts[code] ?? 0;
              const height = Math.max(2, Math.round((count / leftMax) * leftBarHeight));
              const isSelected = resolvedActive.kind === "left" && resolvedActive.code === code;
              return (
                <button
                  key={code}
                  type="button"
                  className="flex h-full items-end rounded-sm"
                  onMouseEnter={() => setActiveDatum({ kind: "left", code })}
                  onFocus={() => setActiveDatum({ kind: "left", code })}
                  onBlur={() => setActiveDatum(null)}
                  onTouchStart={() => setActiveDatum({ kind: "left", code })}
                  aria-label={getLeftBucketDetails(code)}
                >
                  <span
                    className="block w-full rounded-[3px]"
                    style={{
                      backgroundColor: LEFT_BUCKET_COLORS[code],
                      height,
                      opacity: isSelected ? 1 : count > 0 ? 0.82 : 0.35,
                    }}
                  />
                </button>
              );
            })}
          </div>
          <div className={`${size === "sm" ? "text-[7px]" : "text-[8px]"} mt-0.5 grid grid-cols-4 font-semibold uppercase tracking-[0.06em] text-slate-500`}>
            <span className="text-center">P</span>
            <span className="text-center">NP</span>
            <span className="text-center">O</span>
            <span className="text-center">W</span>
          </div>
        </div>

        <div className={chartWidthClass}>
          <div
            className={`flex items-end gap-0.5 border-b border-[var(--duck-border)] pb-0.5 ${
              size === "sm" ? "h-[1.5rem]" : "h-[1.9rem]"
            }`}
            style={{ height: numericalBarHeight }}
          >
            {NUMERICAL_GRADE_ORDER.map((grade, index) => {
              const count = numericalValues[index] ?? 0;
              const ratio = count / numericalMax;
              const height = count > 0 ? Math.max(2, Math.round((0.16 + 0.84 * Math.pow(ratio, 0.72)) * numericalBarHeight)) : 0;
              const hue = 10 + (index / (NUMERICAL_GRADE_ORDER.length - 1)) * 128;
              const isSelected = resolvedActive.kind === "numerical" && resolvedActive.index === index;

              return (
                <button
                  key={grade}
                  type="button"
                  className="flex h-full min-w-0 flex-1 items-end"
                  onMouseEnter={() => setActiveDatum({ kind: "numerical", index })}
                  onFocus={() => setActiveDatum({ kind: "numerical", index })}
                  onBlur={() => setActiveDatum(null)}
                  onTouchStart={() => setActiveDatum({ kind: "numerical", index })}
                  aria-label={getNumericalDetails(index)}
                >
                  <span
                    className="block w-full rounded-[2px]"
                    style={{
                      height,
                      backgroundColor: `hsl(${hue} 62% 58%)`,
                      opacity: isSelected ? 1 : 0.9,
                    }}
                  />
                </button>
              );
            })}
          </div>
          <div className={`${size === "sm" ? "text-[7px]" : "text-[8px]"} mt-0.5 grid grid-cols-5 font-semibold uppercase tracking-[0.06em] text-slate-500`}>
            <span className="text-left">F</span>
            <span className="text-center">D</span>
            <span className="text-center">C</span>
            <span className="text-center">B</span>
            <span className="text-right">A</span>
          </div>
        </div>
      </div>
    </div>
  );
}
