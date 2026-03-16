import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parse } from 'csv-parse/sync';

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

type GradeCode = (typeof NUMERICAL_ORDER)[number] | (typeof NON_NUMERICAL_ORDER)[number] | 'W';

type SectionRecord = {
  term: string;
  termDesc: string;
  sourceSubject: string;
  sourceCourseCode: string;
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

type TermKey = 'fall' | 'winter' | 'spring' | 'summer';

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

type TermAggregate = {
  term: string;
  termDesc: string;
  aggregate: Aggregate;
};

type AnalyticsLevel = '100' | '200' | '300' | '400' | '500+';

type AnalyticsTermAggregate = {
  term: string;
  termDesc: string;
  aggregate: Aggregate;
};

type AnalyticsTermLevelAggregate = {
  term: string;
  termDesc: string;
  aggregate: Aggregate;
};

type AnalyticsCourseSizePoint = {
  courseCode: string;
  title: string;
  subject: string;
  level: AnalyticsLevel;
  meanGpa: number;
  avgClassSize: number;
  totalStudents: number;
  sectionCount: number;
};

type AnalyticsPayload = {
  totals: {
    termCount: number;
    subjectCount: number;
    courseCount: number;
    sectionCount: number;
  };
  termAggregates: AnalyticsTermAggregate[];
  termByLevel: Record<AnalyticsLevel, AnalyticsTermLevelAggregate[]>;
  courseSizeVsGpa: AnalyticsCourseSizePoint[];
};

type CompactAnalyticsPayload = {
  v: 2;
  t: string[];
  n: [number, number, number, number];
  a: Array<number | null>;
  l: Record<AnalyticsLevel, Array<number | null>>;
  c: number[];
};

type FileMeta = {
  bytes: number;
  sha256: string;
};

type SearchIndexPayload = {
  subjects: Array<{ code: string; title: string; popularity: number }>;
  courses: Array<{
    code: string;
    title: string;
    subject: string;
    popularity: number;
    sectionTitles?: string;
  }>;
  professors: Array<{ id: string; name: string; popularity: number }>;
};

type CompactSearchIndexPayload = {
  v: 4;
  t: string[];
  s: number[];
  c: number[];
  p: number[];
};

type SubjectOverview = {
  code: string;
  title: string;
  courseCount: number;
  sectionCount: number;
  professorCount: number;
  aggregate: Aggregate;
};

type SubjectsOverviewPayload = {
  v: 2;
  k: string[];
  n: string[];
  t: [number, number, number, number];
  o: Array<number | null>;
  s: Array<number | null>;
};

const ANALYTICS_LEVEL_ORDER: AnalyticsLevel[] = ['100', '200', '300', '400', '500+'];

type CatalogSubjectMetadata = {
  code: string;
  title: string;
  path: string;
};

type CatalogCourseMetadata = {
  code: string;
  subjectCode: string;
  number: string;
  title: string;
  description: string;
  path: string;
};

type CatalogMetadataSnapshot = {
  schemaVersion: 1;
  source: string;
  scrapedAt: string;
  subjects: CatalogSubjectMetadata[];
  courses: CatalogCourseMetadata[];
};

type CatalogLookup = {
  subjectsByCode: Map<string, CatalogSubjectMetadata>;
  coursesByCode: Map<string, CatalogCourseMetadata>;
};

type ProgramMetadataSnapshot = {
  schemaVersion: 1;
  sourcePaths: string[];
  scrapedAt: string;
  programs: Array<{
    name: string;
    category:
      | 'ug-major'
      | 'ug-minor'
      | 'ug-certificate'
      | 'gr-degree'
      | 'gr-certificate'
      | 'gr-specialization'
      | 'gr-microcredential';
    sourcePath: string;
    sectionId: string;
    path: string;
    hash: string | null;
    credentials: string | null;
    pageTitle: string | null;
    description: string | null;
    overview: string[];
  }>;
};

type SubjectCodeMappingsSnapshot = {
  schemaVersion: 1;
  aliases: Array<{
    from: string;
    to: string;
    reason: string;
  }>;
  courseAliases?: Array<{
    from: string;
    to: string;
    reason: string;
  }>;
  titleOverrides?: Record<string, string>;
  descriptionProgramNames?: Record<string, string[]>;
};

type SubjectCodeMappingsLookup = {
  aliases: Map<string, string>;
  courseAliases: Map<
    string,
    {
      code: string;
      subject: string;
      number: string;
    }
  >;
  titleOverrides: Map<string, string>;
  descriptionProgramNames: Map<string, string[]>;
};

const INPUT_CSV = 'data/pub_rec_master_w2016-f2025.csv';
const CATALOG_METADATA_JSON = 'data/uo-catalog-course-metadata.json';
const PROGRAM_METADATA_JSON = 'data/uo-catalog-program-metadata.json';
const SUBJECT_CODE_MAPPINGS_JSON = 'data/subject-code-mappings.json';
const OUTPUT_ROOT = 'public/data';
const NUMERICAL_ORDER = [
  'F',
  'DM',
  'D',
  'DP',
  'CM',
  'C',
  'CP',
  'BM',
  'B',
  'BP',
  'AM',
  'A',
  'AP',
] as const;
const NON_NUMERICAL_ORDER = ['P', 'N', 'OTHER'] as const;
const AGGREGATE_COMPACT_LENGTH = 7 + NUMERICAL_ORDER.length + NON_NUMERICAL_ORDER.length;
const TEXT_ENCODER = new TextEncoder();
const CREATED_DIRECTORIES = new Set<string>();
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
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return 'unknown';
  }
  if (cleaned.toLowerCase() === 'unknown') {
    return 'unknown';
  }
  return cleaned;
}

function fnv1a64Base36(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const bytes = TEXT_ENCODER.encode(input);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash.toString(36);
}

function pushGrouped<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
    return;
  }
  map.set(key, [value]);
}

function parseCount(raw: string): number | null {
  if (raw === '*') {
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

function yearBucketToAnalyticsLevel(bucket: 1 | 2 | 3 | 4 | 5): AnalyticsLevel {
  if (bucket === 1) {
    return '100';
  }
  if (bucket === 2) {
    return '200';
  }
  if (bucket === 3) {
    return '300';
  }
  if (bucket === 4) {
    return '400';
  }
  return '500+';
}

function getTermKey(termDesc: string): TermKey {
  const normalized = termDesc.trim().toLowerCase();
  if (normalized.startsWith('fall')) {
    return 'fall';
  }
  if (normalized.startsWith('winter')) {
    return 'winter';
  }
  if (normalized.startsWith('spring')) {
    return 'spring';
  }
  return 'summer';
}

function buildAggregate(rows: SectionRecord[]): Aggregate {
  let totalNonWReported = 0;
  let totalVisibleNonW = 0;
  let numericalTotal = 0;
  let numericalWeight = 0;
  const numericalCounts = Object.fromEntries(
    NUMERICAL_ORDER.map((grade) => [grade, 0])
  ) as Aggregate['numericalCounts'];
  const nonNumericalCounts = Object.fromEntries(
    NON_NUMERICAL_ORDER.map((grade) => [grade, 0])
  ) as Aggregate['nonNumericalCounts'];
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
  const coverage =
    totalNonWReported > 0 ? Number((totalVisibleNonW / totalNonWReported).toFixed(4)) : null;

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

function buildTermAggregates(rows: SectionRecord[]): TermAggregate[] {
  const byTerm = new Map<string, SectionRecord[]>();
  const termDescByTerm = new Map<string, string>();

  for (const row of rows) {
    pushGrouped(byTerm, row.term, row);
    if (!termDescByTerm.has(row.term)) {
      termDescByTerm.set(row.term, row.termDesc);
    }
  }

  return [...byTerm.keys()]
    .sort((left, right) => left.localeCompare(right))
    .map((term) => ({
      term,
      termDesc: termDescByTerm.get(term) ?? term,
      aggregate: buildAggregate(byTerm.get(term) ?? []),
    }));
}

async function writeJson(path: string, payload: unknown): Promise<FileMeta> {
  const text = `${JSON.stringify(payload)}\n`;
  const directory = dirname(path);
  if (!CREATED_DIRECTORIES.has(directory)) {
    await mkdir(directory, { recursive: true });
    CREATED_DIRECTORIES.add(directory);
  }
  await writeFile(path, text, 'utf8');
  const bytes = Buffer.byteLength(text, 'utf8');
  const sha256 = createHash('sha256').update(text).digest('hex');
  return { bytes, sha256 };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function verifyFileHashes(fileIndex: Record<string, FileMeta>) {
  if (process.env.BUILD_DATA_VERIFY_HASHES !== '1') {
    console.log('Skipped file hash verification (set BUILD_DATA_VERIFY_HASHES=1 to enable)');
    return;
  }

  const entries = Object.entries(fileIndex);
  for (const [relativePath, meta] of entries) {
    const absolutePath = join(OUTPUT_ROOT, relativePath);
    const text = await readFile(absolutePath, 'utf8');
    const bytes = Buffer.byteLength(text, 'utf8');
    const sha256 = createHash('sha256').update(text).digest('hex');
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

  assert(searchIndex.subjects.length === bySubject.size, 'Subject count mismatch in search index');
  assert(searchIndex.courses.length === byCourse.size, 'Course count mismatch in search index');
  assert(
    searchIndex.professors.length === byProfessor.size,
    'Professor count mismatch in search index'
  );

  for (const subject of searchIndex.subjects) {
    assert(bySubject.has(subject.code), `Missing subject shard source for ${subject.code}`);
    assert(
      fileIndex[`${version}/subjects/${subject.code}.json`],
      `Missing subject shard file for ${subject.code}`
    );
  }
  for (const course of searchIndex.courses) {
    assert(byCourse.has(course.code), `Missing course shard source for ${course.code}`);
    assert(
      fileIndex[`${version}/courses/${course.code}.json`],
      `Missing course shard file for ${course.code}`
    );
  }
  for (const professor of searchIndex.professors) {
    assert(byProfessor.has(professor.id), `Missing professor shard source for ${professor.id}`);
    assert(
      fileIndex[`${version}/professors/${professor.id}.json`],
      `Missing professor shard file for ${professor.id}`
    );
  }
  assert(fileIndex[`${version}/subjects-overview.json`], 'Missing subjects overview file');
  assert(fileIndex[`${version}/analytics.json`], 'Missing analytics file');
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
    subjects.push(encode(subject.code), encode(subject.title), subject.popularity);
  }
  for (const course of index.courses) {
    courses.push(
      encode(course.code),
      encode(course.title),
      encode(course.subject),
      course.popularity,
      encode(course.sectionTitles ?? '')
    );
  }
  for (const professor of index.professors) {
    professors.push(encode(professor.id), encode(professor.name), professor.popularity);
  }

  return {
    v: 4,
    t: table,
    s: subjects,
    c: courses,
    p: professors,
  };
}

function compactAggregate(aggregate: Aggregate): Array<number | null> {
  const modeIndex = aggregate.mode
    ? NUMERICAL_ORDER.indexOf(aggregate.mode as (typeof NUMERICAL_ORDER)[number])
    : -1;
  return [
    aggregate.totalNonWReported,
    aggregate.totalVisibleNonW,
    aggregate.coverage,
    aggregate.mean,
    aggregate.median,
    modeIndex,
    aggregate.withdrawals,
    ...NUMERICAL_ORDER.map((grade) => aggregate.numericalCounts[grade]),
    ...NON_NUMERICAL_ORDER.map((grade) => aggregate.nonNumericalCounts[grade]),
  ];
}

function compactAnalyticsPayload(payload: AnalyticsPayload): CompactAnalyticsPayload {
  const table: string[] = [];
  const stringToIndex = new Map<string, number>();
  const levelToIndex: Record<AnalyticsLevel, number> = {
    '100': 0,
    '200': 1,
    '300': 2,
    '400': 3,
    '500+': 4,
  };

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

  const termRows: Array<number | null> = [];
  for (const row of payload.termAggregates) {
    termRows.push(encode(row.term), encode(row.termDesc), ...compactAggregate(row.aggregate));
  }

  const levelRows = Object.fromEntries(
    ANALYTICS_LEVEL_ORDER.map((level) => {
      const rows: Array<number | null> = [];
      for (const row of payload.termByLevel[level] ?? []) {
        rows.push(encode(row.term), encode(row.termDesc), ...compactAggregate(row.aggregate));
      }
      return [level, rows];
    })
  ) as Record<AnalyticsLevel, Array<number | null>>;

  const courses: number[] = [];
  for (const point of payload.courseSizeVsGpa) {
    courses.push(
      encode(point.courseCode),
      encode(point.title),
      encode(point.subject),
      levelToIndex[point.level],
      Math.round(point.meanGpa * 1000),
      Math.round(point.avgClassSize * 100),
      point.totalStudents,
      point.sectionCount
    );
  }

  return {
    v: 2,
    t: table,
    n: [
      payload.totals.termCount,
      payload.totals.subjectCount,
      payload.totals.courseCount,
      payload.totals.sectionCount,
    ],
    a: termRows,
    l: levelRows,
    c: courses,
  };
}

async function loadCatalogLookup(): Promise<CatalogLookup> {
  try {
    const jsonText = await readFile(CATALOG_METADATA_JSON, 'utf8');
    const snapshot = JSON.parse(jsonText) as CatalogMetadataSnapshot;
    const subjectsByCode = new Map<string, CatalogSubjectMetadata>();
    for (const subject of snapshot.subjects) {
      if (!subject.code || !subject.title) {
        continue;
      }
      subjectsByCode.set(subject.code.toUpperCase(), {
        code: subject.code.toUpperCase(),
        title: subject.title.trim(),
        path: subject.path,
      });
    }

    const coursesByCode = new Map<string, CatalogCourseMetadata>();
    for (const course of snapshot.courses) {
      if (!course.code || !course.title) {
        continue;
      }
      coursesByCode.set(course.code.toUpperCase(), {
        code: course.code.toUpperCase(),
        subjectCode: course.subjectCode.toUpperCase(),
        number: course.number.trim(),
        title: course.title.trim(),
        description: course.description.trim(),
        path: course.path,
      });
    }

    console.log(
      `Loaded catalog metadata (${subjectsByCode.size} subjects, ${coursesByCode.size} courses)`
    );
    return { subjectsByCode, coursesByCode };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Catalog metadata unavailable at ${CATALOG_METADATA_JSON} (${message}); falling back to CSV titles only.`
    );
    return {
      subjectsByCode: new Map<string, CatalogSubjectMetadata>(),
      coursesByCode: new Map<string, CatalogCourseMetadata>(),
    };
  }
}

function normalizeLookupKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildProgramDescriptionLookup(snapshot: ProgramMetadataSnapshot): Map<string, string> {
  const byName = new Map<string, { description: string; priority: number }>();
  const categoryPriority: Record<ProgramMetadataSnapshot['programs'][number]['category'], number> =
    {
      'ug-major': 4,
      'gr-degree': 3,
      'ug-minor': 2,
      'ug-certificate': 2,
      'gr-certificate': 2,
      'gr-specialization': 1,
      'gr-microcredential': 1,
    };

  for (const program of snapshot.programs) {
    const description = program.description?.trim() ?? '';
    if (!description) {
      continue;
    }
    const key = normalizeLookupKey(program.name);
    if (!key) {
      continue;
    }

    const priority = categoryPriority[program.category] ?? 0;
    const existing = byName.get(key);
    if (
      !existing ||
      priority > existing.priority ||
      (priority === existing.priority && description.length > existing.description.length)
    ) {
      byName.set(key, { description, priority });
    }
  }

  return new Map([...byName.entries()].map(([key, value]) => [key, value.description]));
}

async function loadProgramDescriptionLookup(): Promise<Map<string, string>> {
  try {
    const jsonText = await readFile(PROGRAM_METADATA_JSON, 'utf8');
    const snapshot = JSON.parse(jsonText) as ProgramMetadataSnapshot;
    const lookup = buildProgramDescriptionLookup(snapshot);
    console.log(`Loaded program metadata descriptions (${lookup.size} unique program names)`);
    return lookup;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Program metadata unavailable at ${PROGRAM_METADATA_JSON} (${message}); subject descriptions will be sparse.`
    );
    return new Map<string, string>();
  }
}

async function loadSubjectCodeMappings(): Promise<SubjectCodeMappingsLookup> {
  try {
    const jsonText = await readFile(SUBJECT_CODE_MAPPINGS_JSON, 'utf8');
    const snapshot = JSON.parse(jsonText) as SubjectCodeMappingsSnapshot;

    const aliases = new Map<string, string>();
    for (const alias of snapshot.aliases) {
      const from = alias.from.trim().toUpperCase();
      const to = alias.to.trim().toUpperCase();
      if (from && to && from !== to) {
        aliases.set(from, to);
      }
    }

    const courseAliases = new Map<
      string,
      {
        code: string;
        subject: string;
        number: string;
      }
    >();
    for (const alias of snapshot.courseAliases ?? []) {
      const from = alias.from.trim().toUpperCase();
      const to = alias.to.trim().toUpperCase();
      if (!from || !to || from === to) {
        continue;
      }
      const [toSubject = '', toNumber = ''] = to.split('-', 2);
      if (!toSubject || !toNumber) {
        continue;
      }
      courseAliases.set(from, {
        code: to,
        subject: toSubject,
        number: toNumber,
      });
    }

    const descriptionProgramNames = new Map<string, string[]>();
    for (const [subjectCode, names] of Object.entries(snapshot.descriptionProgramNames ?? {})) {
      const key = subjectCode.trim().toUpperCase();
      const values = names.map((name) => name.trim()).filter((name) => name.length > 0);
      if (key && values.length > 0) {
        descriptionProgramNames.set(key, values);
      }
    }

    const titleOverrides = new Map<string, string>();
    for (const [subjectCode, title] of Object.entries(snapshot.titleOverrides ?? {})) {
      const key = subjectCode.trim().toUpperCase();
      const value = title.trim();
      if (key && value) {
        titleOverrides.set(key, value);
      }
    }

    console.log(
      `Loaded subject mappings (${aliases.size} subject aliases, ${courseAliases.size} course aliases, ${titleOverrides.size} title overrides, ${descriptionProgramNames.size} description overrides)`
    );
    return { aliases, courseAliases, titleOverrides, descriptionProgramNames };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Subject mappings unavailable at ${SUBJECT_CODE_MAPPINGS_JSON} (${message}); no code merges will be applied.`
    );
    return {
      aliases: new Map<string, string>(),
      courseAliases: new Map<
        string,
        {
          code: string;
          subject: string;
          number: string;
        }
      >(),
      titleOverrides: new Map<string, string>(),
      descriptionProgramNames: new Map<string, string[]>(),
    };
  }
}

function buildAnalyticsPayload(params: {
  sections: SectionRecord[];
  byCourse: Map<string, SectionRecord[]>;
  bySubject: Map<string, SectionRecord[]>;
  getCourseMetadata: (courseCode: string) => CatalogCourseMetadata | null;
}): AnalyticsPayload {
  const { sections, byCourse, bySubject, getCourseMetadata } = params;

  const byTerm = new Map<string, SectionRecord[]>();
  const termDescByTerm = new Map<string, string>();
  const byTermLevel = new Map<string, SectionRecord[]>();

  for (const section of sections) {
    pushGrouped(byTerm, section.term, section);
    if (!termDescByTerm.has(section.term)) {
      termDescByTerm.set(section.term, section.termDesc);
    }

    const level = yearBucketToAnalyticsLevel(getYearBucket(section.number));
    pushGrouped(byTermLevel, `${section.term}::${level}`, section);
  }

  const sortedTerms = [...byTerm.keys()].sort((left, right) => left.localeCompare(right));

  const termAggregates: AnalyticsTermAggregate[] = sortedTerms.map((term) => {
    const rows = byTerm.get(term) ?? [];
    return {
      term,
      termDesc: termDescByTerm.get(term) ?? term,
      aggregate: buildAggregate(rows),
    };
  });

  const termByLevel = Object.fromEntries(
    ANALYTICS_LEVEL_ORDER.map((level) => {
      const rows: AnalyticsTermLevelAggregate[] = sortedTerms
        .map((term) => {
          const groupedRows = byTermLevel.get(`${term}::${level}`) ?? [];
          if (groupedRows.length === 0) {
            return null;
          }
          return {
            term,
            termDesc: termDescByTerm.get(term) ?? term,
            aggregate: buildAggregate(groupedRows),
          };
        })
        .filter((value): value is AnalyticsTermLevelAggregate => value !== null);
      return [level, rows];
    })
  ) as Record<AnalyticsLevel, AnalyticsTermLevelAggregate[]>;

  const courseSizeVsGpa: AnalyticsCourseSizePoint[] = [...byCourse.entries()]
    .map(([courseCode, rows]) => {
      const aggregate = buildAggregate(rows);
      const avgClassSize =
        rows.length > 0 ? Number((aggregate.totalNonWReported / rows.length).toFixed(2)) : 0;
      const level = yearBucketToAnalyticsLevel(getYearBucket(rows[0]?.number ?? ''));
      return {
        courseCode,
        title: getCourseMetadata(courseCode)?.title ?? rows[0]?.title ?? courseCode,
        subject: rows[0]?.subject ?? courseCode.split('-')[0] ?? '',
        level,
        meanGpa: aggregate.mean ?? Number.NaN,
        avgClassSize,
        totalStudents: aggregate.totalNonWReported,
        sectionCount: rows.length,
      };
    })
    .filter(
      (course): course is AnalyticsCourseSizePoint =>
        Number.isFinite(course.meanGpa) && course.totalStudents > 0
    )
    .sort((left, right) => right.totalStudents - left.totalStudents);

  return {
    totals: {
      termCount: sortedTerms.length,
      subjectCount: bySubject.size,
      courseCount: byCourse.size,
      sectionCount: sections.length,
    },
    termAggregates,
    termByLevel,
    courseSizeVsGpa,
  };
}

async function main() {
  const version = `v${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const versionRoot = join(OUTPUT_ROOT, version);
  CREATED_DIRECTORIES.clear();
  await rm(versionRoot, { recursive: true, force: true });
  await mkdir(versionRoot, { recursive: true });

  const csvText = await readFile(INPUT_CSV, 'utf8');
  const rawRows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: false,
  }) as CsvRow[];

  const subjectMappings = await loadSubjectCodeMappings();
  const mapSubjectCode = (subjectCode: string) => {
    const normalized = subjectCode.trim().toUpperCase();
    if (/^O[A-Z0-9]{2,}$/.test(normalized)) {
      return normalized;
    }
    return subjectMappings.aliases.get(normalized) ?? normalized;
  };
  const aliasMergeCounts = new Map<string, number>();
  const courseAliasMergeCounts = new Map<string, number>();

  const idSlots = new Map<string, string>();
  const collisionCounts = new Map<string, number>();
  const instructorBaseIdCache = new Map<string, string>();

  const sections: SectionRecord[] = rawRows.map((row) => {
    const instructorCanonical = canonicalInstructor(row.INSTRUCTOR);
    const baseId =
      instructorCanonical === 'unknown'
        ? 'unknown'
        : (instructorBaseIdCache.get(instructorCanonical) ??
          (() => {
            const computed = fnv1a64Base36(instructorCanonical);
            instructorBaseIdCache.set(instructorCanonical, computed);
            return computed;
          })());

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

    const counts: SectionRecord['counts'] = {
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

    const sourceSubject = row.SUBJ.trim().toUpperCase();
    const sourceNumber = row.NUMB.trim().toUpperCase();
    const sourceCourseCode = `${sourceSubject}-${sourceNumber}`;
    const courseAlias = subjectMappings.courseAliases.get(sourceCourseCode);
    const mappedSubject = courseAlias?.subject ?? mapSubjectCode(sourceSubject);
    const mappedNumber = courseAlias?.number ?? sourceNumber;
    if (!courseAlias && mappedSubject !== sourceSubject) {
      const aliasKey = `${sourceSubject}->${mappedSubject}`;
      aliasMergeCounts.set(aliasKey, (aliasMergeCounts.get(aliasKey) ?? 0) + 1);
    }
    if (courseAlias) {
      const aliasKey = `${sourceCourseCode}->${courseAlias.code}`;
      courseAliasMergeCounts.set(aliasKey, (courseAliasMergeCounts.get(aliasKey) ?? 0) + 1);
    }

    return {
      term: row.TERM,
      termDesc: row.TERM_DESC,
      sourceSubject,
      sourceCourseCode,
      subject: mappedSubject,
      number: mappedNumber,
      title: row.TITLE.trim(),
      courseCode: `${mappedSubject}-${mappedNumber}`,
      crn: row.CRN,
      instructor: row.INSTRUCTOR.trim() || 'Unknown',
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
    pushGrouped(bySubject, section.subject, section);
    pushGrouped(byCourse, section.courseCode, section);
    pushGrouped(byProfessor, section.professorId, section);
  }

  const catalog = await loadCatalogLookup();
  const programDescriptions = await loadProgramDescriptionLookup();
  const rawSubjectTitle = (subjectCode: string) => {
    const upperCode = subjectCode.toUpperCase();
    if (catalog.subjectsByCode.has(upperCode)) {
      return catalog.subjectsByCode.get(upperCode)?.title ?? upperCode;
    }
    if (subjectMappings.titleOverrides.has(upperCode)) {
      return subjectMappings.titleOverrides.get(upperCode) ?? upperCode;
    }
    if (/^O[A-Z0-9]{2,}$/.test(upperCode)) {
      return `Study Abroad (${upperCode})`;
    }
    return upperCode;
  };
  const subjectTitleCache = new Map<string, string>();
  const getSubjectTitle = (subjectCode: string) => {
    const upperCode = subjectCode.toUpperCase();
    const cached = subjectTitleCache.get(upperCode);
    if (cached) {
      return cached;
    }
    const title = rawSubjectTitle(upperCode);
    subjectTitleCache.set(upperCode, title);
    return title;
  };
  const getCourseMetadata = (courseCode: string) => {
    return catalog.coursesByCode.get(courseCode.toUpperCase()) ?? null;
  };
  const rawSubjectDescription = (subjectCode: string, subjectTitle: string) => {
    const overrideNames =
      subjectMappings.descriptionProgramNames.get(subjectCode.toUpperCase()) ?? [];
    for (const overrideName of overrideNames) {
      const description = programDescriptions.get(normalizeLookupKey(overrideName));
      if (description) {
        return description;
      }
    }

    const titleCandidates = new Set<string>();
    titleCandidates.add(subjectTitle);
    if (subjectTitle.includes(':')) {
      titleCandidates.add(subjectTitle.split(':')[0]?.trim() ?? '');
    }
    if (subjectTitle.includes(' and ')) {
      titleCandidates.add(subjectTitle.replace(/\sand\s/gi, ' & '));
    }

    for (const candidate of titleCandidates) {
      const key = normalizeLookupKey(candidate);
      const description = key ? programDescriptions.get(key) : undefined;
      if (description) {
        return description;
      }
    }

    if (/^O[A-Z0-9]{2,}$/.test(subjectCode.toUpperCase())) {
      return 'Legacy study-abroad transfer bucket. Course titles often encode host-course subjects and may span multiple departments.';
    }

    return null;
  };
  const subjectDescriptionCache = new Map<string, string | null>();
  const getSubjectDescription = (subjectCode: string) => {
    const upperCode = subjectCode.toUpperCase();
    if (subjectDescriptionCache.has(upperCode)) {
      return subjectDescriptionCache.get(upperCode) ?? null;
    }
    const subjectTitle = getSubjectTitle(upperCode);
    const description = rawSubjectDescription(upperCode, subjectTitle);
    subjectDescriptionCache.set(upperCode, description);
    return description;
  };

  const fileIndex: Record<string, FileMeta> = {};
  const subjectOverviewRows: SubjectOverview[] = [];
  const courseAggregateCache = new Map<string, Aggregate>();
  for (const [courseCode, rows] of byCourse) {
    courseAggregateCache.set(courseCode, buildAggregate(rows));
  }

  for (const [subjectCode, rows] of bySubject) {
    const courseRows = new Map<string, SectionRecord[]>();
    for (const row of rows) {
      pushGrouped(courseRows, row.courseCode, row);
    }
    const subjectAggregate = buildAggregate(rows);
    const professorCount = new Set(rows.map((row) => row.professorId)).size;
    const subjectTitle = getSubjectTitle(subjectCode);
    const subjectDescription = getSubjectDescription(subjectCode);
    let firstTerm = rows[0]?.term ?? '';
    let lastTerm = rows[0]?.term ?? '';
    let firstTermDesc = rows[0]?.termDesc ?? '';
    let lastTermDesc = rows[0]?.termDesc ?? '';
    for (const row of rows) {
      if (row.term < firstTerm) {
        firstTerm = row.term;
        firstTermDesc = row.termDesc;
      }
      if (row.term > lastTerm) {
        lastTerm = row.term;
        lastTermDesc = row.termDesc;
      }
    }
    const payload = {
      subjectCode,
      subjectTitle,
      subjectDescription,
      professorCount,
      aggregate: subjectAggregate,
      availableTerms: ['fall', 'winter', 'spring', 'summer'] as TermKey[],
      firstTerm: firstTermDesc,
      lastTerm: lastTermDesc,
      termAggregates: buildTermAggregates(rows),
      courses: [...courseRows.entries()]
        .map(([courseCode, courseSections]) => {
          const catalogCourse = getCourseMetadata(courseCode);
          const termSet = new Set<TermKey>();
          const professorIds = new Set<string>();
          for (const section of courseSections) {
            termSet.add(getTermKey(section.termDesc));
            professorIds.add(section.professorId);
          }
          const number = courseSections[0]?.number ?? '';
          return {
            courseCode,
            number,
            title: catalogCourse?.title ?? courseSections[0]?.title ?? '',
            description: catalogCourse?.description ?? null,
            sectionCount: courseSections.length,
            professorCount: professorIds.size,
            yearBucket: getYearBucket(number),
            terms: [...termSet],
            aggregate: courseAggregateCache.get(courseCode) ?? buildAggregate(courseSections),
          };
        })
        .sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
    };
    subjectOverviewRows.push({
      code: subjectCode,
      title: subjectTitle,
      courseCount: courseRows.size,
      sectionCount: rows.length,
      professorCount,
      aggregate: subjectAggregate,
    });
    const relativePath = `${version}/subjects/${subjectCode}.json`;
    fileIndex[relativePath] = await writeJson(join(OUTPUT_ROOT, relativePath), payload);
  }

  subjectOverviewRows.sort((a, b) => a.code.localeCompare(b.code));
  const subjectCodeTable = subjectOverviewRows.map((row) => row.code);
  const subjectTitleTable = subjectOverviewRows.map((row) => row.title);
  const codeToIndex = new Map(subjectCodeTable.map((code, index) => [code, index]));
  const compactSubjectRows: Array<number | null> = [];
  for (const subject of subjectOverviewRows) {
    compactSubjectRows.push(
      codeToIndex.get(subject.code) ?? -1,
      subject.courseCount,
      subject.sectionCount,
      subject.professorCount,
      ...compactAggregate(subject.aggregate)
    );
  }
  const universityAggregate = buildAggregate(sections);
  const subjectsOverview: SubjectsOverviewPayload = {
    v: 2,
    k: subjectCodeTable,
    n: subjectTitleTable,
    t: [bySubject.size, byCourse.size, byProfessor.size, sections.length],
    o: compactAggregate(universityAggregate),
    s: compactSubjectRows,
  };
  assert(
    subjectsOverview.o.length === AGGREGATE_COMPACT_LENGTH,
    'Unexpected compact aggregate length'
  );
  fileIndex[`${version}/subjects-overview.json`] = await writeJson(
    join(OUTPUT_ROOT, `${version}/subjects-overview.json`),
    subjectsOverview
  );

  const analyticsPayload = buildAnalyticsPayload({
    sections,
    byCourse,
    bySubject,
    getCourseMetadata,
  });
  const compactAnalytics = compactAnalyticsPayload(analyticsPayload);
  fileIndex[`${version}/analytics.json`] = await writeJson(
    join(OUTPUT_ROOT, `${version}/analytics.json`),
    compactAnalytics
  );

  for (const [courseCode, rows] of byCourse) {
    const catalogCourse = getCourseMetadata(courseCode);
    const byInstructor = new Map<string, SectionRecord[]>();
    for (const row of rows) {
      pushGrouped(byInstructor, row.professorId, row);
    }
    const subjectCode = rows[0]?.subject ?? '';
    const payload = {
      courseCode,
      subject: subjectCode,
      subjectTitle: getSubjectTitle(subjectCode),
      subjectDescription: getSubjectDescription(subjectCode),
      number: rows[0]?.number ?? '',
      title: catalogCourse?.title ?? rows[0]?.title ?? '',
      description: catalogCourse?.description ?? null,
      aggregate: courseAggregateCache.get(courseCode) ?? buildAggregate(rows),
      termAggregates: buildTermAggregates(rows),
      instructors: [...byInstructor.entries()]
        .map(([professorId, instructorRows]) => ({
          professorId,
          name: instructorRows[0]?.instructor ?? 'Unknown',
          sectionCount: instructorRows.length,
          aggregate: buildAggregate(instructorRows),
          sections: instructorRows.map((section) => ({
            term: section.term,
            termDesc: section.termDesc,
            crn: section.crn,
            sourceSubject: section.sourceSubject,
            sourceCourseCode: section.sourceCourseCode,
            csvTitle: section.title,
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
      pushGrouped(byCourseRows, row.courseCode, row);
    }
    const payload = {
      professorId,
      name: rows[0]?.instructor ?? 'Unknown',
      aggregate: buildAggregate(rows),
      courses: [...byCourseRows.entries()]
        .map(([courseCode, courseSections]) => {
          const catalogCourse = getCourseMetadata(courseCode);
          return {
            courseCode,
            title: catalogCourse?.title ?? courseSections[0]?.title ?? '',
            sectionCount: courseSections.length,
            aggregate: buildAggregate(courseSections),
            sections: courseSections.map((section) => ({
              term: section.term,
              termDesc: section.termDesc,
              crn: section.crn,
              sourceSubject: section.sourceSubject,
              sourceCourseCode: section.sourceCourseCode,
              csvTitle: section.title,
              totalNonWReported: section.totalNonWReported,
              counts: section.counts,
            })),
          };
        })
        .sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
    };
    const relativePath = `${version}/professors/${professorId}.json`;
    fileIndex[relativePath] = await writeJson(join(OUTPUT_ROOT, relativePath), payload);
  }

  const expandedSearchIndex: SearchIndexPayload = {
    subjects: [...bySubject.entries()]
      .map(([code, rows]) => ({ code, title: getSubjectTitle(code), popularity: rows.length }))
      .sort((a, b) => b.popularity - a.popularity),
    courses: [...byCourse.entries()]
      .map(([code, rows]) => {
        const primaryTitle = getCourseMetadata(code)?.title ?? rows[0]?.title ?? '';
        // Collect unique section titles that differ from the primary course title.
        // These appear for special-topics courses (e.g. GSL-199: Cantonese).
        const uniqueSectionTitles = [
          ...new Set(
            rows
              .map((r) => r.title.trim())
              .filter((t) => t && t.toLowerCase() !== primaryTitle.toLowerCase())
          ),
        ];
        return {
          code,
          title: primaryTitle,
          subject: rows[0]?.subject ?? '',
          popularity: rows.reduce((sum, row) => sum + row.totalNonWReported, 0),
          sectionTitles:
            uniqueSectionTitles.length > 0 ? uniqueSectionTitles.join(' | ') : undefined,
        };
      })
      .sort((a, b) => b.popularity - a.popularity),
    professors: [...byProfessor.entries()]
      .map(([id, rows]) => ({
        id,
        name: rows[0]?.instructor ?? 'Unknown',
        popularity: rows.reduce((sum, row) => sum + row.totalNonWReported, 0),
      }))
      .sort((a, b) => b.popularity - a.popularity),
  };

  if (aliasMergeCounts.size > 0) {
    const topAliasMerges = [...aliasMergeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    console.log(`Applied ${aliasMergeCounts.size} subject code alias mappings`);
    for (const [alias, count] of topAliasMerges) {
      console.log(`- ${alias} (${count} sections)`);
    }
  }

  if (courseAliasMergeCounts.size > 0) {
    const topCourseAliasMerges = [...courseAliasMergeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    console.log(`Applied ${courseAliasMergeCounts.size} course code alias mappings`);
    for (const [alias, count] of topCourseAliasMerges) {
      console.log(`- ${alias} (${count} sections)`);
    }
  }

  let catalogSubjectCoverageCount = 0;
  let descriptionCoverageCount = 0;
  for (const code of bySubject.keys()) {
    if (catalog.subjectsByCode.has(code.toUpperCase())) {
      catalogSubjectCoverageCount += 1;
    }
    if (getSubjectDescription(code) !== null) {
      descriptionCoverageCount += 1;
    }
  }

  console.log(
    `Subject title coverage from catalog: ${catalogSubjectCoverageCount}/${bySubject.size}`
  );
  console.log(
    `Subject description coverage from programs: ${descriptionCoverageCount}/${bySubject.size}`
  );

  const compactSearch = compactSearchIndex(expandedSearchIndex);
  fileIndex[`${version}/search-index.json`] = await writeJson(
    join(OUTPUT_ROOT, `${version}/search-index.json`),
    compactSearch
  );

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
      analyticsShard: true,
    },
  };
  fileIndex[`${version}/manifest.json`] = await writeJson(
    join(OUTPUT_ROOT, `${version}/manifest.json`),
    manifest
  );

  await writeJson(join(OUTPUT_ROOT, 'current-version.json'), { version });

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
