import { useMemo, useState } from 'react';
import type { Aggregate } from '../../lib/dataClient';
import {
  NON_NUMERICAL_GRADE_ORDER,
  NUMERICAL_GRADE_ORDER,
  formatGradeDetailCode,
} from '../../lib/grades';

type GradeDistributionStripProps = {
  aggregate: Aggregate | null | undefined;
  size?: 'sm' | 'md';
  showStudentCount?: boolean;
};

type LeftBucketCode = (typeof NON_NUMERICAL_GRADE_ORDER)[number] | 'W';
type ActiveDatum =
  | {
      kind: 'numerical';
      index: number;
    }
  | {
      kind: 'left';
      code: LeftBucketCode;
    }
  | null;

const LEFT_BUCKET_ORDER: LeftBucketCode[] = ['P', 'N', 'OTHER', 'W'];
const LEFT_BUCKET_COLORS: Record<LeftBucketCode, string> = {
  P: '#7dbf8a',
  N: '#88a7c6',
  OTHER: '#c7b182',
  W: '#c98f90',
};

function getPercent(count: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return (count / total) * 100;
}

export function GradeDistributionStrip({
  aggregate,
  size = 'md',
  showStudentCount = true,
}: GradeDistributionStripProps) {
  const [activeDatum, setActiveDatum] = useState<ActiveDatum>(null);

  const numericalValues = NUMERICAL_GRADE_ORDER.map(
    (grade) => aggregate?.numericalCounts?.[grade] ?? 0
  );
  const nonNumericalValues = NON_NUMERICAL_GRADE_ORDER.map(
    (grade) => aggregate?.nonNumericalCounts?.[grade] ?? 0
  );
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
      .replace('AP', 'A+')
      .replace('AM', 'A-')
      .replace('BP', 'B+')
      .replace('BM', 'B-')
      .replace('CP', 'C+')
      .replace('CM', 'C-')
      .replace('DP', 'D+')
      .replace('DM', 'D-');
    return `${displayGrade}: ${count.toLocaleString()} (${percent.toFixed(1)}%)`;
  }

  function getLeftBucketDetails(code: LeftBucketCode): string {
    const count = leftCounts[code] ?? 0;
    const percent = getPercent(count, code === 'W' ? allWithWithdrawals : displayedTotal);
    return `${formatGradeDetailCode(code)}: ${count.toLocaleString()} (${percent.toFixed(1)}%)`;
  }

  const resolvedActive = activeDatum ?? {
    kind: 'numerical' as const,
    index: defaultNumericalIndex,
  };
  const activeText =
    resolvedActive.kind === 'left'
      ? getLeftBucketDetails(resolvedActive.code)
      : getNumericalDetails(resolvedActive.index);

  const baseBarHeight = size === 'sm' ? 20 : 24;
  const numericalBarHeight = baseBarHeight;
  const leftBarHeight = Math.round(baseBarHeight * 0.75);
  const barWidth = 12;
  const barGap = 2;

  return (
    <div
      className="inline-flex w-fit max-w-full flex-col"
      onMouseLeave={() => setActiveDatum(null)}
    >
      <div
        className={`flex items-center gap-2 ${showStudentCount ? 'justify-between' : 'justify-end'}`}
      >
        {showStudentCount ? (
          <p
            className={`rounded-md bg-[var(--duck-surface)] px-2 py-0.5 font-semibold tracking-[0.09em] text-[var(--duck-muted-strong)] uppercase ${size === 'sm' ? 'text-[9px]' : 'text-[10px]'}`}
          >
            {displayedTotal.toLocaleString()} students
          </p>
        ) : null}
        <p
          className={`${size === 'sm' ? 'text-[9px]' : 'text-[10px]'} max-w-[13rem] truncate text-right font-semibold text-[var(--duck-muted)] sm:max-w-[14rem]`}
        >
          {activeText}
        </p>
      </div>

      <div className="mt-1 flex items-end gap-0">
        <div className="shrink-0">
          <div
            className={`grid items-end border-r border-dashed border-[var(--duck-border)] ${size === 'sm' ? 'pr-1' : 'pr-1.5'}`}
            style={{
              height: leftBarHeight,
              gridTemplateColumns: `repeat(${LEFT_BUCKET_ORDER.length}, ${barWidth}px)`,
              columnGap: `${barGap}px`,
            }}
          >
            {LEFT_BUCKET_ORDER.map((code) => {
              const count = leftCounts[code] ?? 0;
              const height = Math.max(2, Math.round((count / leftMax) * leftBarHeight));
              const isSelected = resolvedActive.kind === 'left' && resolvedActive.code === code;
              return (
                <button
                  key={code}
                  type="button"
                  className="flex h-full items-end rounded-sm"
                  onMouseEnter={() => setActiveDatum({ kind: 'left', code })}
                  onFocus={() => setActiveDatum({ kind: 'left', code })}
                  onBlur={() => setActiveDatum(null)}
                  onTouchStart={() => setActiveDatum({ kind: 'left', code })}
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
          <div
            className={`${size === 'sm' ? 'text-[7px]' : 'text-[8px]'} mt-0.5 grid font-semibold tracking-[0.06em] text-[var(--duck-muted)] uppercase`}
            style={{
              gridTemplateColumns: `repeat(${LEFT_BUCKET_ORDER.length}, ${barWidth}px)`,
              columnGap: `${barGap}px`,
            }}
          >
            <span className="text-center">P</span>
            <span className="text-center">NP</span>
            <span className="text-center">O</span>
            <span className="text-center">W</span>
          </div>
        </div>

        <div className={`${size === 'sm' ? 'pl-1' : 'pl-1.5'} inline-block`}>
          <div
            className="grid items-end border-b border-[var(--duck-border)] pb-0.5"
            style={{
              height: numericalBarHeight,
              gridTemplateColumns: `repeat(${NUMERICAL_GRADE_ORDER.length}, ${barWidth}px)`,
              columnGap: `${barGap}px`,
            }}
          >
            {NUMERICAL_GRADE_ORDER.map((grade, index) => {
              const count = numericalValues[index] ?? 0;
              const ratio = count / numericalMax;
              const height =
                count > 0
                  ? Math.max(
                      2,
                      Math.round((0.16 + 0.84 * Math.pow(ratio, 0.72)) * numericalBarHeight)
                    )
                  : 0;
              const hue = 10 + (index / (NUMERICAL_GRADE_ORDER.length - 1)) * 128;
              const isSelected =
                resolvedActive.kind === 'numerical' && resolvedActive.index === index;

              return (
                <button
                  key={grade}
                  type="button"
                  className="flex h-full items-end"
                  onMouseEnter={() => setActiveDatum({ kind: 'numerical', index })}
                  onFocus={() => setActiveDatum({ kind: 'numerical', index })}
                  onBlur={() => setActiveDatum(null)}
                  onTouchStart={() => setActiveDatum({ kind: 'numerical', index })}
                  aria-label={getNumericalDetails(index)}
                >
                  <span
                    className="block w-full rounded-[3px]"
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
          <div
            className={`${size === 'sm' ? 'text-[7px]' : 'text-[8px]'} mt-0.5 grid font-semibold tracking-[0.06em] text-[var(--duck-muted)] uppercase`}
            style={{
              gridTemplateColumns: `repeat(${NUMERICAL_GRADE_ORDER.length}, ${barWidth}px)`,
              columnGap: `${barGap}px`,
            }}
          >
            <span className="text-center" style={{ gridColumn: 'span 1 / span 1' }}>
              F
            </span>
            <span className="text-center" style={{ gridColumn: 'span 3 / span 3' }}>
              D
            </span>
            <span className="text-center" style={{ gridColumn: 'span 3 / span 3' }}>
              C
            </span>
            <span className="text-center" style={{ gridColumn: 'span 3 / span 3' }}>
              B
            </span>
            <span className="text-center" style={{ gridColumn: 'span 3 / span 3' }}>
              A
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
