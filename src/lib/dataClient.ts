export type SearchIndex = {
  subjects: Array<{ code: string; title: string; popularity: number }>;
  courses: Array<{ code: string; title: string; subject: string; popularity: number }>;
  professors: Array<{ id: string; name: string; popularity: number }>;
};

export class DataRequestError extends Error {
  status: number;
  path: string;

  constructor(path: string, status: number) {
    super(`Request failed for ${path}: ${status}`);
    this.name = 'DataRequestError';
    this.path = path;
    this.status = status;
  }
}

export function isNotFoundDataError(error: unknown): boolean {
  return error instanceof DataRequestError && error.status === 404;
}

type CompactSearchIndex = {
  v: 1 | 2 | 3;
  t: string[];
  s: Array<[number, number]> | Array<[number, number, number]> | number[];
  c: Array<[number, number, number, number]> | number[];
  p: Array<[number, number, number]> | number[];
};

type CompactSubjectsOverview = {
  v: 1 | 2;
  k: string[];
  n?: string[];
  t: [number, number, number, number];
  o: Array<number | null>;
  s: Array<number | null>;
};

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

export type Aggregate = {
  totalNonWReported: number;
  totalVisibleNonW: number;
  coverage: number | null;
  mean: number | null;
  median: number | null;
  mode: string | null;
  numericalCounts: Record<string, number>;
  nonNumericalCounts: Record<string, number>;
  withdrawals: number;
};

export type SectionRow = {
  term: string;
  termDesc: string;
  crn: string;
  sourceSubject?: string;
  sourceCourseCode?: string;
  csvTitle?: string;
  totalNonWReported: number;
  counts: Record<string, number | null>;
};

export type TermAggregate = {
  term: string;
  termDesc: string;
  aggregate: Aggregate;
};

export type SubjectShard = {
  subjectCode: string;
  subjectTitle?: string;
  subjectDescription?: string | null;
  professorCount?: number;
  aggregate: Aggregate;
  availableTerms: Array<'fall' | 'winter' | 'spring' | 'summer'>;
  firstTerm?: string;
  lastTerm?: string;
  termAggregates?: TermAggregate[];
  courses: Array<{
    courseCode: string;
    number: string;
    title: string;
    description?: string | null;
    sectionCount: number;
    professorCount?: number;
    yearBucket: 1 | 2 | 3 | 4 | 5;
    terms: Array<'fall' | 'winter' | 'spring' | 'summer'>;
    aggregate: Aggregate;
  }>;
};

export type SubjectOverview = {
  code: string;
  title: string;
  courseCount: number;
  sectionCount: number;
  professorCount: number;
  aggregate: Aggregate;
};

export type SubjectsOverviewShard = {
  aggregate: Aggregate;
  totals: {
    subjectCount: number;
    courseCount: number;
    professorCount: number;
    sectionCount: number;
  };
  subjects: SubjectOverview[];
};

export type AnalyticsLevel = '100' | '200' | '300' | '400' | '500+';

export type AnalyticsTermAggregate = {
  term: string;
  termDesc: string;
  aggregate: Aggregate;
};

export type AnalyticsLevelAggregate = {
  level: AnalyticsLevel;
  aggregate: Aggregate;
  min: number | null;
  q1: number | null;
  q3: number | null;
  max: number | null;
};

export type AnalyticsSubjectSummary = {
  code: string;
  title: string;
  courseCount: number;
  sectionCount: number;
  professorCount: number;
  aggregate: Aggregate;
};

export type AnalyticsCourseSizePoint = {
  courseCode: string;
  title: string;
  subject: string;
  level: AnalyticsLevel;
  meanGpa: number;
  avgClassSize: number;
  totalStudents: number;
  sectionCount: number;
};

export type AnalyticsClassSizeBucket = {
  key: string;
  label: string;
  min: number;
  max: number | null;
  courseCount: number;
  studentCount: number;
};

export type AnalyticsShard = {
  schemaVersion: 1;
  builtAt: string;
  termRange: {
    firstTerm: string;
    firstTermDesc: string;
    lastTerm: string;
    lastTermDesc: string;
  };
  totals: {
    termCount: number;
    subjectCount: number;
    courseCount: number;
    sectionCount: number;
  };
  levelOrder: AnalyticsLevel[];
  termAggregates: AnalyticsTermAggregate[];
  termByLevel: Record<AnalyticsLevel, AnalyticsTermAggregate[]>;
  levelAggregates: AnalyticsLevelAggregate[];
  subjectSummaries: AnalyticsSubjectSummary[];
  courseSizeVsGpa: AnalyticsCourseSizePoint[];
  classSizeDistribution: AnalyticsClassSizeBucket[];
};

export type CourseShard = {
  courseCode: string;
  subject: string;
  subjectTitle?: string;
  subjectDescription?: string | null;
  number: string;
  title: string;
  description?: string | null;
  aggregate: Aggregate;
  termAggregates?: TermAggregate[];
  instructors: Array<{
    professorId: string;
    name: string;
    sectionCount: number;
    aggregate: Aggregate;
    sections: SectionRow[];
  }>;
};

export type ProfessorShard = {
  professorId: string;
  name: string;
  aggregate: Aggregate;
  courses: Array<{
    courseCode: string;
    title: string;
    sectionCount: number;
    aggregate: Aggregate;
    sections: SectionRow[];
  }>;
};

type VersionFile = { version: string };

// Version may be injected at build time by the vite.config.ts plugin to avoid
// an extra network round-trip. Falls back to fetching current-version.json.
const BUILD_TIME_VERSION = (import.meta.env.VITE_DATA_VERSION as string | undefined) ?? null;

let cachedVersion: Promise<string> | null = null;
let cachedSearchIndex: Promise<SearchIndex> | null = null;
let cachedSubjectsOverview: Promise<SubjectsOverviewShard> | null = null;
let cachedAnalyticsShard: Promise<AnalyticsShard> | null = null;
const subjectShardCache = new Map<string, Promise<SubjectShard>>();
const courseShardCache = new Map<string, Promise<CourseShard>>();
const professorShardCache = new Map<string, Promise<ProfessorShard>>();

const configuredBase = (import.meta.env.VITE_DATA_BASE_URL as string | undefined)?.replace(
  /\/$/,
  ''
);
const primaryBase = configuredBase ?? '/data';
const fallbackBase = '/data';

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new DataRequestError(path, response.status);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const inferredStatus = response.status === 200 ? 404 : response.status;
  if (!contentType.includes('application/json')) {
    throw new DataRequestError(path, inferredStatus);
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new DataRequestError(path, inferredStatus);
    }
    throw error;
  }
}

async function fetchDataJson<T>(relativePath: string): Promise<T> {
  const primaryPath = `${primaryBase}/${relativePath}`;
  try {
    return await fetchJson<T>(primaryPath);
  } catch (error) {
    if (primaryBase === fallbackBase) {
      throw error;
    }
    return fetchJson<T>(`${fallbackBase}/${relativePath}`);
  }
}

function decodeSearchIndex(raw: SearchIndex | CompactSearchIndex): SearchIndex {
  if (!('v' in raw)) {
    return raw;
  }

  const table = raw.t;
  const decode = (index: number) => table[index] ?? '';

  if (raw.v === 3) {
    const subjects: SearchIndex['subjects'] = [];
    const courses: SearchIndex['courses'] = [];
    const professors: SearchIndex['professors'] = [];
    const subjectData = raw.s as number[];
    const courseData = raw.c as number[];
    const professorData = raw.p as number[];

    for (let i = 0; i < subjectData.length; i += 3) {
      const code = decode(subjectData[i] ?? 0);
      const title = decode(subjectData[i + 1] ?? 0);
      subjects.push({
        code,
        title: title || code,
        popularity: subjectData[i + 2] ?? 0,
      });
    }
    for (let i = 0; i < courseData.length; i += 4) {
      courses.push({
        code: decode(courseData[i] ?? 0),
        title: decode(courseData[i + 1] ?? 0),
        subject: decode(courseData[i + 2] ?? 0),
        popularity: courseData[i + 3] ?? 0,
      });
    }
    for (let i = 0; i < professorData.length; i += 3) {
      professors.push({
        id: decode(professorData[i] ?? 0),
        name: decode(professorData[i + 1] ?? 0),
        popularity: professorData[i + 2] ?? 0,
      });
    }

    return { subjects, courses, professors };
  }

  if (raw.v === 2) {
    const subjects: SearchIndex['subjects'] = [];
    const courses: SearchIndex['courses'] = [];
    const professors: SearchIndex['professors'] = [];
    const subjectData = raw.s as number[];
    const courseData = raw.c as number[];
    const professorData = raw.p as number[];

    for (let i = 0; i < subjectData.length; i += 2) {
      const code = decode(subjectData[i] ?? 0);
      subjects.push({
        code,
        title: code,
        popularity: subjectData[i + 1] ?? 0,
      });
    }
    for (let i = 0; i < courseData.length; i += 4) {
      courses.push({
        code: decode(courseData[i] ?? 0),
        title: decode(courseData[i + 1] ?? 0),
        subject: decode(courseData[i + 2] ?? 0),
        popularity: courseData[i + 3] ?? 0,
      });
    }
    for (let i = 0; i < professorData.length; i += 3) {
      professors.push({
        id: decode(professorData[i] ?? 0),
        name: decode(professorData[i + 1] ?? 0),
        popularity: professorData[i + 2] ?? 0,
      });
    }

    return { subjects, courses, professors };
  }

  return {
    subjects: (raw.s as Array<[number, number]>).map(([code, popularity]) => ({
      code: decode(code),
      title: decode(code),
      popularity,
    })),
    courses: (raw.c as Array<[number, number, number, number]>).map(
      ([code, title, subject, popularity]) => ({
        code: decode(code),
        title: decode(title),
        subject: decode(subject),
        popularity,
      })
    ),
    professors: (raw.p as Array<[number, number, number]>).map(([id, name, popularity]) => ({
      id: decode(id),
      name: decode(name),
      popularity,
    })),
  };
}

function decodeCompactAggregate(values: Array<number | null>): Aggregate {
  const modeIndexValue = Number(values[5] ?? -1);
  const mode =
    modeIndexValue >= 0 && modeIndexValue < NUMERICAL_ORDER.length
      ? NUMERICAL_ORDER[modeIndexValue]
      : null;
  const numericalCounts = Object.fromEntries(
    NUMERICAL_ORDER.map((grade, index) => [grade, Number(values[7 + index] ?? 0)])
  ) as Record<string, number>;
  const nonNumericalOffset = 7 + NUMERICAL_ORDER.length;
  const nonNumericalCounts = Object.fromEntries(
    NON_NUMERICAL_ORDER.map((grade, index) => [
      grade,
      Number(values[nonNumericalOffset + index] ?? 0),
    ])
  ) as Record<string, number>;

  return {
    totalNonWReported: Number(values[0] ?? 0),
    totalVisibleNonW: Number(values[1] ?? 0),
    coverage: values[2] === null || values[2] === undefined ? null : Number(values[2]),
    mean: values[3] === null || values[3] === undefined ? null : Number(values[3]),
    median: values[4] === null || values[4] === undefined ? null : Number(values[4]),
    mode,
    numericalCounts,
    nonNumericalCounts,
    withdrawals: Number(values[6] ?? 0),
  };
}

function decodeSubjectsOverview(
  raw: SubjectsOverviewShard | CompactSubjectsOverview
): SubjectsOverviewShard {
  if (!('v' in raw)) {
    return raw;
  }

  const subjects: SubjectOverview[] = [];
  const titles = raw.v === 2 ? (raw.n ?? []) : [];
  const recordSize = 4 + AGGREGATE_COMPACT_LENGTH;
  for (let i = 0; i < raw.s.length; i += recordSize) {
    const codeIndex = Number(raw.s[i] ?? -1);
    const code = raw.k[codeIndex];
    if (!code) {
      continue;
    }
    const aggregate = decodeCompactAggregate(raw.s.slice(i + 4, i + 4 + AGGREGATE_COMPACT_LENGTH));
    subjects.push({
      code,
      title: titles[codeIndex] ?? code,
      courseCount: Number(raw.s[i + 1] ?? 0),
      sectionCount: Number(raw.s[i + 2] ?? 0),
      professorCount: Number(raw.s[i + 3] ?? 0),
      aggregate,
    });
  }

  return {
    aggregate: decodeCompactAggregate(raw.o),
    totals: {
      subjectCount: raw.t[0] ?? 0,
      courseCount: raw.t[1] ?? 0,
      professorCount: raw.t[2] ?? 0,
      sectionCount: raw.t[3] ?? 0,
    },
    subjects,
  };
}

export async function getDatasetVersion(): Promise<string> {
  if (BUILD_TIME_VERSION) {
    return BUILD_TIME_VERSION;
  }
  if (!cachedVersion) {
    cachedVersion = (async () => {
      try {
        const currentVersion = await fetchDataJson<VersionFile>('current-version.json');
        return currentVersion.version;
      } catch (error) {
        cachedVersion = null;
        throw error;
      }
    })();
  }
  return cachedVersion;
}

export async function getSearchIndex(): Promise<SearchIndex> {
  if (!cachedSearchIndex) {
    cachedSearchIndex = (async () => {
      try {
        const version = await getDatasetVersion();
        const raw = await fetchDataJson<SearchIndex | CompactSearchIndex>(
          `${version}/search-index.json`
        );
        return decodeSearchIndex(raw);
      } catch (error) {
        cachedSearchIndex = null;
        throw error;
      }
    })();
  }
  return cachedSearchIndex;
}

export async function getSubjectsOverviewShard(): Promise<SubjectsOverviewShard> {
  if (!cachedSubjectsOverview) {
    cachedSubjectsOverview = (async () => {
      try {
        const version = await getDatasetVersion();
        const raw = await fetchDataJson<SubjectsOverviewShard | CompactSubjectsOverview>(
          `${version}/subjects-overview.json`
        );
        return decodeSubjectsOverview(raw);
      } catch (error) {
        cachedSubjectsOverview = null;
        throw error;
      }
    })();
  }
  return cachedSubjectsOverview;
}

export async function getAnalyticsShard(): Promise<AnalyticsShard> {
  if (!cachedAnalyticsShard) {
    cachedAnalyticsShard = (async () => {
      try {
        const version = await getDatasetVersion();
        return await fetchDataJson<AnalyticsShard>(`${version}/analytics.json`);
      } catch (error) {
        cachedAnalyticsShard = null;
        throw error;
      }
    })();
  }
  return cachedAnalyticsShard;
}

export async function getSubjectShard(code: string): Promise<SubjectShard> {
  const key = code.toUpperCase();
  const existing = subjectShardCache.get(key);
  if (existing) {
    return existing;
  }
  const request = (async () => {
    const version = await getDatasetVersion();
    return fetchDataJson<SubjectShard>(`${version}/subjects/${key}.json`);
  })().catch((error) => {
    subjectShardCache.delete(key);
    throw error;
  });
  subjectShardCache.set(key, request);
  return request;
}

export async function getCourseShard(code: string): Promise<CourseShard> {
  const key = code.toUpperCase();
  const existing = courseShardCache.get(key);
  if (existing) {
    return existing;
  }
  const request = (async () => {
    const version = await getDatasetVersion();
    return fetchDataJson<CourseShard>(`${version}/courses/${key}.json`);
  })().catch((error) => {
    courseShardCache.delete(key);
    throw error;
  });
  courseShardCache.set(key, request);
  return request;
}

export async function getProfessorShard(id: string): Promise<ProfessorShard> {
  const key = id;
  const existing = professorShardCache.get(key);
  if (existing) {
    return existing;
  }
  const request = (async () => {
    const version = await getDatasetVersion();
    return fetchDataJson<ProfessorShard>(`${version}/professors/${key}.json`);
  })().catch((error) => {
    professorShardCache.delete(key);
    throw error;
  });
  professorShardCache.set(key, request);
  return request;
}

export function prefetchRouteData(route: string): void {
  if (route === '/subjects') {
    void getSubjectsOverviewShard();
    return;
  }
  if (route === '/analytics') {
    void getAnalyticsShard();
    return;
  }
  if (route.startsWith('/subject/')) {
    const code = route.slice('/subject/'.length);
    if (code) {
      void getSubjectShard(code);
    }
    return;
  }
  if (route.startsWith('/course/')) {
    const code = route.slice('/course/'.length);
    if (code) {
      void getCourseShard(code);
    }
    return;
  }
  if (route.startsWith('/professor/')) {
    const id = route.slice('/professor/'.length);
    if (id) {
      void getProfessorShard(id);
    }
  }
}
