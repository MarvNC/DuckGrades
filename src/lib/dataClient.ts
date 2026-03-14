export type SearchIndex = {
  subjects: Array<{ code: string; popularity: number }>;
  courses: Array<{ code: string; title: string; subject: string; popularity: number }>;
  professors: Array<{ id: string; name: string; popularity: number }>;
};

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
  totalNonWReported: number;
  counts: Record<string, number | null>;
};

export type SubjectShard = {
  subjectCode: string;
  aggregate: Aggregate;
  courses: Array<{
    courseCode: string;
    number: string;
    title: string;
    sectionCount: number;
    aggregate: Aggregate;
  }>;
};

export type CourseShard = {
  courseCode: string;
  subject: string;
  number: string;
  title: string;
  aggregate: Aggregate;
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

let cachedVersion: Promise<string> | null = null;
let cachedSearchIndex: Promise<SearchIndex> | null = null;
const subjectShardCache = new Map<string, Promise<SubjectShard>>();
const courseShardCache = new Map<string, Promise<CourseShard>>();
const professorShardCache = new Map<string, Promise<ProfessorShard>>();

const configuredBase = (import.meta.env.VITE_DATA_BASE_URL as string | undefined)?.replace(/\/$/, "");
const primaryBase = configuredBase ?? "/data";
const fallbackBase = "/data";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Request failed for ${path}: ${response.status}`);
  }
  return (await response.json()) as T;
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

export async function getDatasetVersion(): Promise<string> {
  if (!cachedVersion) {
    cachedVersion = (async () => {
      const currentVersion = await fetchDataJson<VersionFile>("current-version.json");
      return currentVersion.version;
    })();
  }
  return cachedVersion;
}

export async function getSearchIndex(): Promise<SearchIndex> {
  if (!cachedSearchIndex) {
    cachedSearchIndex = (async () => {
      const version = await getDatasetVersion();
      return fetchDataJson<SearchIndex>(`${version}/search-index.json`);
    })();
  }
  return cachedSearchIndex;
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
  })();
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
  })();
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
  })();
  professorShardCache.set(key, request);
  return request;
}

export function prefetchRouteData(route: string): void {
  if (route.startsWith("/subject/")) {
    const code = route.slice("/subject/".length);
    if (code) {
      void getSubjectShard(code);
    }
    return;
  }
  if (route.startsWith("/course/")) {
    const code = route.slice("/course/".length);
    if (code) {
      void getCourseShard(code);
    }
    return;
  }
  if (route.startsWith("/professor/")) {
    const id = route.slice("/professor/".length);
    if (id) {
      void getProfessorShard(id);
    }
  }
}
