import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parse } from "csv-parse/sync";

type CsvRow = {
  TERM: string;
  TERM_DESC: string;
  SUBJ: string;
  NUMB: string;
  TITLE: string;
  CRN: string;
  INSTRUCTOR: string;
  AP: string;
  A: string;
  AM: string;
  BP: string;
  B: string;
  BM: string;
  CP: string;
  C: string;
  CM: string;
  DP: string;
  D: string;
  DM: string;
  F: string;
  P: string;
  N: string;
  OTHER: string;
  W: string;
  TOT_NON_W: string;
};

type GradeCode = (typeof NUMERICAL_ORDER)[number] | (typeof NON_NUMERICAL_ORDER)[number] | "W";

type SectionRecord = {
  term: string;
  termDesc: string;
  subject: string;
  number: string;
  title: string;
  courseCode: string;
  crn: string;
  instructor: string;
  instructorCanonical: string;
  professorId: string;
  counts: Record<GradeCode, number | null>;
  totalNonWReported: number;
};

type TermKey = "fall" | "winter" | "spring" | "summer";

type Aggregate = {
  totalNonWReported: number;
  totalVisibleNonW: number;
  coverage: number | null;
  mean: number | null;
  median: number | null;
  mode: string | null;
  numericalCounts: Record<(typeof NUMERICAL_ORDER)[number], number>;
  nonNumericalCounts: Record<(typeof NON_NUMERICAL_ORDER)[number], number>;
  withdrawals: number;
};

type FileMeta = {
  bytes: number;
  sha256: string;
};

type SearchIndexPayload = {
  subjects: Array<{ code: string; popularity: number }>;
  courses: Array<{ code: string; title: string; subject: string; popularity: number }>;
  professors: Array<{ id: string; name: string; popularity: number }>;
};

type CompactSearchIndexPayload = {
  v: 2;
  t: string[];
  s: number[];
  c: number[];
  p: number[];
};

type SubjectOverview = {
  code: string;
  courseCount: number;
  sectionCount: number;
  professorCount: number;
  aggregate: Aggregate;
};

type SubjectsOverviewPayload = {
  aggregate: Aggregate;
  totals: {
    subjectCount: number;
    courseCount: number;
    professorCount: number;
    sectionCount: number;
  };
  subjects: SubjectOverview[];
};

const INPUT_CSV = "data/pub_rec_master_w2016-f2025.csv";
const OUTPUT_ROOT = "public/data";
const NUMERICAL_ORDER = ["F", "DM", "D", "DP", "CM", "C", "CP", "BM", "B", "BP", "AM", "A", "AP"] as const;
const NON_NUMERICAL_ORDER = ["P", "N", "OTHER"] as const;
const GRADE_POINTS: Record<(typeof NUMERICAL_ORDER)[number], number> = {
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
  AP: 4,
};

function canonicalInstructor(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return "unknown";
  }
  if (cleaned.toLowerCase() === "unknown") {
    return "unknown";
  }
  return cleaned;
}

function fnv1a64Base36(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const bytes = new TextEncoder().encode(input);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash.toString(36);
}

function parseCount(raw: string): number | null {
  if (raw === "*") {
    return null;
  }
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

function getYearBucket(courseNumber: string): 1 | 2 | 3 | 4 | 5 {
  const firstDigit = Number.parseInt(courseNumber.trim().charAt(0), 10);
  if (firstDigit >= 1 && firstDigit <= 4) {
    return firstDigit as 1 | 2 | 3 | 4;
  }
  return 5;
}

function getTermKey(termDesc: string): TermKey {
  const normalized = termDesc.trim().toLowerCase();
  if (normalized.startsWith("fall")) {
    return "fall";
  }
  if (normalized.startsWith("winter")) {
    return "winter";
  }
  if (normalized.startsWith("spring")) {
    return "spring";
  }
  return "summer";
}

function buildAggregate(rows: SectionRecord[]): Aggregate {
  let totalNonWReported = 0;
  let totalVisibleNonW = 0;
  let numericalTotal = 0;
  let numericalWeight = 0;
  const numericalCounts = Object.fromEntries(NUMERICAL_ORDER.map((grade) => [grade, 0])) as Aggregate["numericalCounts"];
  const nonNumericalCounts = Object.fromEntries(NON_NUMERICAL_ORDER.map((grade) => [grade, 0])) as Aggregate["nonNumericalCounts"];
  let withdrawals = 0;

  for (const row of rows) {
    totalNonWReported += row.totalNonWReported;
    for (const grade of NUMERICAL_ORDER) {
      const count = row.counts[grade];
      if (count === null) {
        continue;
      }
      numericalCounts[grade] += count;
      totalVisibleNonW += count;
      numericalTotal += count;
      numericalWeight += count * GRADE_POINTS[grade];
    }
    for (const grade of NON_NUMERICAL_ORDER) {
      const count = row.counts[grade];
      if (count === null) {
        continue;
      }
      nonNumericalCounts[grade] += count;
      totalVisibleNonW += count;
    }
    const wCount = row.counts.W;
    if (wCount !== null) {
      withdrawals += wCount;
    }
  }

  const mean = numericalTotal > 0 ? Number((numericalWeight / numericalTotal).toFixed(3)) : null;
  const coverage = totalNonWReported > 0 ? Number((totalVisibleNonW / totalNonWReported).toFixed(4)) : null;

  let mode: string | null = null;
  let modeCount = -1;
  for (const grade of NUMERICAL_ORDER) {
    const count = numericalCounts[grade];
    if (count > modeCount) {
      modeCount = count;
      mode = grade;
    }
  }
  if (modeCount <= 0) {
    mode = null;
  }

  let median: number | null = null;
  if (numericalTotal > 0) {
    const midpoint = numericalTotal / 2;
    let running = 0;
    for (const grade of NUMERICAL_ORDER) {
      running += numericalCounts[grade];
      if (running >= midpoint) {
        median = GRADE_POINTS[grade];
        break;
      }
    }
  }

  return {
    totalNonWReported,
    totalVisibleNonW,
    coverage,
    mean,
    median,
    mode,
    numericalCounts,
    nonNumericalCounts,
    withdrawals,
  };
}

async function writeJson(path: string, payload: unknown): Promise<FileMeta> {
  const text = `${JSON.stringify(payload)}\n`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
  const bytes = Buffer.byteLength(text, "utf8");
  const sha256 = createHash("sha256").update(text).digest("hex");
  return { bytes, sha256 };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function verifyFileHashes(fileIndex: Record<string, FileMeta>) {
  const entries = Object.entries(fileIndex);
  for (const [relativePath, meta] of entries) {
    const absolutePath = join(OUTPUT_ROOT, relativePath);
    const text = await readFile(absolutePath, "utf8");
    const bytes = Buffer.byteLength(text, "utf8");
    const sha256 = createHash("sha256").update(text).digest("hex");
    assert(bytes === meta.bytes, `Byte-size mismatch for ${relativePath}`);
    assert(sha256 === meta.sha256, `SHA mismatch for ${relativePath}`);
  }
}

function verifyCrossReferences(params: {
  version: string;
  searchIndex: SearchIndexPayload;
  bySubject: Map<string, SectionRecord[]>;
  byCourse: Map<string, SectionRecord[]>;
  byProfessor: Map<string, SectionRecord[]>;
  fileIndex: Record<string, FileMeta>;
}) {
  const { version, searchIndex, bySubject, byCourse, byProfessor, fileIndex } = params;

  assert(searchIndex.subjects.length === bySubject.size, "Subject count mismatch in search index");
  assert(searchIndex.courses.length === byCourse.size, "Course count mismatch in search index");
  assert(searchIndex.professors.length === byProfessor.size, "Professor count mismatch in search index");

  for (const subject of searchIndex.subjects) {
    assert(bySubject.has(subject.code), `Missing subject shard source for ${subject.code}`);
    assert(fileIndex[`${version}/subjects/${subject.code}.json`], `Missing subject shard file for ${subject.code}`);
  }
  for (const course of searchIndex.courses) {
    assert(byCourse.has(course.code), `Missing course shard source for ${course.code}`);
    assert(fileIndex[`${version}/courses/${course.code}.json`], `Missing course shard file for ${course.code}`);
  }
  for (const professor of searchIndex.professors) {
    assert(byProfessor.has(professor.id), `Missing professor shard source for ${professor.id}`);
    assert(fileIndex[`${version}/professors/${professor.id}.json`], `Missing professor shard file for ${professor.id}`);
  }
  assert(fileIndex[`${version}/subjects-overview.json`], "Missing subjects overview file");
}

function compactSearchIndex(index: SearchIndexPayload): CompactSearchIndexPayload {
  const table: string[] = [];
  const stringToIndex = new Map<string, number>();

  function encode(value: string): number {
    const existing = stringToIndex.get(value);
    if (existing !== undefined) {
      return existing;
    }
    const nextIndex = table.length;
    table.push(value);
    stringToIndex.set(value, nextIndex);
    return nextIndex;
  }

  const subjects: number[] = [];
  const courses: number[] = [];
  const professors: number[] = [];

  for (const subject of index.subjects) {
    subjects.push(encode(subject.code), subject.popularity);
  }
  for (const course of index.courses) {
    courses.push(encode(course.code), encode(course.title), encode(course.subject), course.popularity);
  }
  for (const professor of index.professors) {
    professors.push(encode(professor.id), encode(professor.name), professor.popularity);
  }

  return {
    v: 2,
    t: table,
    s: subjects,
    c: courses,
    p: professors,
  };
}

async function main() {
  const version = `v${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const versionRoot = join(OUTPUT_ROOT, version);
  await rm(versionRoot, { recursive: true, force: true });
  await mkdir(versionRoot, { recursive: true });

  const csvText = await readFile(INPUT_CSV, "utf8");
  const rawRows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: false,
  }) as CsvRow[];

  const idSlots = new Map<string, string>();
  const collisionCounts = new Map<string, number>();

  const sections: SectionRecord[] = rawRows.map((row) => {
    const instructorCanonical = canonicalInstructor(row.INSTRUCTOR);
    const baseId = instructorCanonical === "unknown" ? "unknown" : fnv1a64Base36(instructorCanonical);

    let professorId = baseId;
    const current = idSlots.get(baseId);
    if (current && current !== instructorCanonical) {
      const nextCount = (collisionCounts.get(baseId) ?? 1) + 1;
      collisionCounts.set(baseId, nextCount);
      professorId = `${baseId}-${nextCount}`;
      idSlots.set(professorId, instructorCanonical);
    } else {
      idSlots.set(baseId, instructorCanonical);
      if (!collisionCounts.has(baseId)) {
        collisionCounts.set(baseId, 1);
      }
    }

    const counts: SectionRecord["counts"] = {
      AP: parseCount(row.AP),
      A: parseCount(row.A),
      AM: parseCount(row.AM),
      BP: parseCount(row.BP),
      B: parseCount(row.B),
      BM: parseCount(row.BM),
      CP: parseCount(row.CP),
      C: parseCount(row.C),
      CM: parseCount(row.CM),
      DP: parseCount(row.DP),
      D: parseCount(row.D),
      DM: parseCount(row.DM),
      F: parseCount(row.F),
      P: parseCount(row.P),
      N: parseCount(row.N),
      OTHER: parseCount(row.OTHER),
      W: parseCount(row.W),
    };

    return {
      term: row.TERM,
      termDesc: row.TERM_DESC,
      subject: row.SUBJ,
      number: row.NUMB,
      title: row.TITLE.trim(),
      courseCode: `${row.SUBJ}-${row.NUMB}`,
      crn: row.CRN,
      instructor: row.INSTRUCTOR.trim() || "Unknown",
      instructorCanonical,
      professorId,
      counts,
      totalNonWReported: Number.parseInt(row.TOT_NON_W, 10) || 0,
    };
  });

  const bySubject = new Map<string, SectionRecord[]>();
  const byCourse = new Map<string, SectionRecord[]>();
  const byProfessor = new Map<string, SectionRecord[]>();

  for (const section of sections) {
    bySubject.set(section.subject, [...(bySubject.get(section.subject) ?? []), section]);
    byCourse.set(section.courseCode, [...(byCourse.get(section.courseCode) ?? []), section]);
    byProfessor.set(section.professorId, [...(byProfessor.get(section.professorId) ?? []), section]);
  }

  const fileIndex: Record<string, FileMeta> = {};
  const subjectOverviewRows: SubjectOverview[] = [];

  for (const [subjectCode, rows] of bySubject) {
    const courseRows = new Map<string, SectionRecord[]>();
    for (const row of rows) {
      courseRows.set(row.courseCode, [...(courseRows.get(row.courseCode) ?? []), row]);
    }
    const subjectAggregate = buildAggregate(rows);
    const payload = {
      subjectCode,
      aggregate: subjectAggregate,
      availableTerms: ["fall", "winter", "spring", "summer"] as TermKey[],
      courses: [...courseRows.entries()]
        .map(([courseCode, courseSections]) => {
          const termSet = new Set<TermKey>();
          for (const section of courseSections) {
            termSet.add(getTermKey(section.termDesc));
          }
          const number = courseSections[0]?.number ?? "";
          return {
            courseCode,
            number,
            title: courseSections[0]?.title ?? "",
            sectionCount: courseSections.length,
            yearBucket: getYearBucket(number),
            terms: [...termSet],
            aggregate: buildAggregate(courseSections),
          };
        })
        .sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
    };
    subjectOverviewRows.push({
      code: subjectCode,
      courseCount: courseRows.size,
      sectionCount: rows.length,
      professorCount: new Set(rows.map((row) => row.professorId)).size,
      aggregate: subjectAggregate,
    });
    const relativePath = `${version}/subjects/${subjectCode}.json`;
    fileIndex[relativePath] = await writeJson(join(OUTPUT_ROOT, relativePath), payload);
  }

  subjectOverviewRows.sort((a, b) => a.code.localeCompare(b.code));
  const subjectsOverview: SubjectsOverviewPayload = {
    aggregate: buildAggregate(sections),
    totals: {
      subjectCount: bySubject.size,
      courseCount: byCourse.size,
      professorCount: byProfessor.size,
      sectionCount: sections.length,
    },
    subjects: subjectOverviewRows,
  };
  fileIndex[`${version}/subjects-overview.json`] = await writeJson(join(OUTPUT_ROOT, `${version}/subjects-overview.json`), subjectsOverview);

  for (const [courseCode, rows] of byCourse) {
    const byInstructor = new Map<string, SectionRecord[]>();
    for (const row of rows) {
      byInstructor.set(row.professorId, [...(byInstructor.get(row.professorId) ?? []), row]);
    }
    const payload = {
      courseCode,
      subject: rows[0]?.subject ?? "",
      number: rows[0]?.number ?? "",
      title: rows[0]?.title ?? "",
      aggregate: buildAggregate(rows),
      instructors: [...byInstructor.entries()]
        .map(([professorId, instructorRows]) => ({
          professorId,
          name: instructorRows[0]?.instructor ?? "Unknown",
          sectionCount: instructorRows.length,
          aggregate: buildAggregate(instructorRows),
          sections: instructorRows.map((section) => ({
            term: section.term,
            termDesc: section.termDesc,
            crn: section.crn,
            totalNonWReported: section.totalNonWReported,
            counts: section.counts,
          })),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
    const relativePath = `${version}/courses/${courseCode}.json`;
    fileIndex[relativePath] = await writeJson(join(OUTPUT_ROOT, relativePath), payload);
  }

  for (const [professorId, rows] of byProfessor) {
    const byCourseRows = new Map<string, SectionRecord[]>();
    for (const row of rows) {
      byCourseRows.set(row.courseCode, [...(byCourseRows.get(row.courseCode) ?? []), row]);
    }
    const payload = {
      professorId,
      name: rows[0]?.instructor ?? "Unknown",
      aggregate: buildAggregate(rows),
      courses: [...byCourseRows.entries()]
        .map(([courseCode, courseSections]) => ({
          courseCode,
          title: courseSections[0]?.title ?? "",
          sectionCount: courseSections.length,
          aggregate: buildAggregate(courseSections),
          sections: courseSections.map((section) => ({
            term: section.term,
            termDesc: section.termDesc,
            crn: section.crn,
            totalNonWReported: section.totalNonWReported,
            counts: section.counts,
          })),
        }))
        .sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
    };
    const relativePath = `${version}/professors/${professorId}.json`;
    fileIndex[relativePath] = await writeJson(join(OUTPUT_ROOT, relativePath), payload);
  }

  const expandedSearchIndex: SearchIndexPayload = {
    subjects: [...bySubject.entries()]
      .map(([code, rows]) => ({ code, popularity: rows.length }))
      .sort((a, b) => b.popularity - a.popularity),
    courses: [...byCourse.entries()]
      .map(([code, rows]) => ({
        code,
        title: rows[0]?.title ?? "",
        subject: rows[0]?.subject ?? "",
        popularity: rows.reduce((sum, row) => sum + row.totalNonWReported, 0),
      }))
      .sort((a, b) => b.popularity - a.popularity),
    professors: [...byProfessor.entries()]
      .map(([id, rows]) => ({
        id,
        name: rows[0]?.instructor ?? "Unknown",
        popularity: rows.reduce((sum, row) => sum + row.totalNonWReported, 0),
      }))
      .sort((a, b) => b.popularity - a.popularity),
  };
  const compactSearch = compactSearchIndex(expandedSearchIndex);
  fileIndex[`${version}/search-index.json`] = await writeJson(join(OUTPUT_ROOT, `${version}/search-index.json`), compactSearch);

  const manifest = {
    schemaVersion: 1,
    datasetVersion: version,
    builtAt: new Date().toISOString(),
    sourceCsv: INPUT_CSV,
    gradeOrders: {
      numerical: NUMERICAL_ORDER,
      nonNumerical: NON_NUMERICAL_ORDER,
    },
    files: fileIndex,
    compatibilityFlags: {
      coverageMetric: true,
      deterministicProfessorIds: true,
    },
  };
  fileIndex[`${version}/manifest.json`] = await writeJson(join(OUTPUT_ROOT, `${version}/manifest.json`), manifest);

  await writeJson(join(OUTPUT_ROOT, "current-version.json"), { version });

  verifyCrossReferences({
    version,
    searchIndex: expandedSearchIndex,
    bySubject,
    byCourse,
    byProfessor,
    fileIndex,
  });
  await verifyFileHashes(fileIndex);

  console.log(`Built data version ${version}`);
  console.log(`Subjects: ${bySubject.size}`);
  console.log(`Courses: ${byCourse.size}`);
  console.log(`Professors: ${byProfessor.size}`);
  console.log(`Integrity checks: ${Object.keys(fileIndex).length} files verified`);
}

void main();
