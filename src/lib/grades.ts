export const NUMERICAL_GRADE_ORDER = ["F", "DM", "D", "DP", "CM", "C", "CP", "BM", "B", "BP", "AM", "A", "AP"] as const;
export const NON_NUMERICAL_GRADE_ORDER = ["P", "N", "OTHER"] as const;

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
