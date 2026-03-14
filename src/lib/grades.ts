export const NUMERICAL_GRADE_ORDER = ["F", "DM", "D", "DP", "CM", "C", "CP", "BM", "B", "BP", "AM", "A", "AP"] as const;
export const NON_NUMERICAL_GRADE_ORDER = ["P", "N", "OTHER"] as const;

const NUMERICAL_GRADE_POINTS: Record<(typeof NUMERICAL_GRADE_ORDER)[number], number> = {
  F: 0,
  DM: 0.7,
  D: 1,
  DP: 1.3,
  CM: 1.7,
  C: 2,
  CP: 2.3,
  BM: 2.7,
  B: 3,
  BP: 3.3,
  AM: 3.7,
  A: 4,
  AP: 4.3,
};

const GRADE_LABELS: Record<string, string> = {
  AP: "A+",
  A: "A",
  AM: "A-",
  BP: "B+",
  B: "B",
  BM: "B-",
  CP: "C+",
  C: "C",
  CM: "C-",
  DP: "D+",
  D: "D",
  DM: "D-",
  F: "F",
  P: "P",
  N: "NP",
  OTHER: "Other",
  W: "W",
};

const GRADE_DETAIL_LABELS: Record<string, string> = {
  N: "NP (No Pass)",
  OTHER: "Other (not W)",
  W: "W (Withdrawn)",
};

const NUMERICAL_LABEL_SCALE = [
  { value: 0, label: "F" },
  { value: 0.7, label: "D-" },
  { value: 1, label: "D" },
  { value: 1.3, label: "D+" },
  { value: 1.7, label: "C-" },
  { value: 2, label: "C" },
  { value: 2.3, label: "C+" },
  { value: 2.7, label: "B-" },
  { value: 3, label: "B" },
  { value: 3.3, label: "B+" },
  { value: 3.7, label: "A-" },
  { value: 4, label: "A" },
] as const;

export function formatGradeCode(code: string | null | undefined): string {
  if (!code) {
    return "N/A";
  }
  return GRADE_LABELS[code] ?? code;
}

export function formatGradeDetailCode(code: string | null | undefined): string {
  if (!code) {
    return "N/A";
  }
  return GRADE_DETAIL_LABELS[code] ?? formatGradeCode(code);
}

export function getNearestNumericalGrade(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  let nearest: (typeof NUMERICAL_LABEL_SCALE)[number] = NUMERICAL_LABEL_SCALE[0];
  let nearestDistance = Math.abs(value - nearest.value);

  for (const candidate of NUMERICAL_LABEL_SCALE.slice(1)) {
    const distance = Math.abs(value - candidate.value);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return nearest.label;
}

export function formatGradeStat(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  const grade = getNearestNumericalGrade(value);
  if (!grade) {
    return value.toFixed(2);
  }
  return `${grade} (${value.toFixed(2)})`;
}

export function computeNumericalStats(
  numericalCounts: Partial<Record<(typeof NUMERICAL_GRADE_ORDER)[number], number>>,
): { mean: number | null; median: number | null; mode: string | null } {
  let total = 0;
  let weighted = 0;

  for (const grade of NUMERICAL_GRADE_ORDER) {
    const count = numericalCounts[grade] ?? 0;
    total += count;
    weighted += count * NUMERICAL_GRADE_POINTS[grade];
  }

  const mean = total > 0 ? Number((weighted / total).toFixed(3)) : null;

  let mode: string | null = null;
  let modeCount = -1;
  for (const grade of NUMERICAL_GRADE_ORDER) {
    const count = numericalCounts[grade] ?? 0;
    if (count > modeCount) {
      modeCount = count;
      mode = grade;
    }
  }
  if (modeCount <= 0) {
    mode = null;
  }

  let median: number | null = null;
  if (total > 0) {
    const midpoint = total / 2;
    let cumulative = 0;
    for (const grade of NUMERICAL_GRADE_ORDER) {
      cumulative += numericalCounts[grade] ?? 0;
      if (cumulative >= midpoint) {
        median = NUMERICAL_GRADE_POINTS[grade];
        break;
      }
    }
  }

  return { mean, median, mode };
}
