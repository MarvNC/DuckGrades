import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

type CatalogSubjectRecord = {
  code: string;
  title: string;
  path: string;
};

type CatalogCourseRecord = {
  code: string;
  subjectCode: string;
  number: string;
  title: string;
  description: string;
  path: string;
};

type CatalogSnapshot = {
  schemaVersion: 1;
  source: string;
  scrapedAt: string;
  subjects: CatalogSubjectRecord[];
  courses: CatalogCourseRecord[];
};

const BASE_URL = "https://catalog.uoregon.edu";
const COURSES_INDEX_PATH = "/courses/";
const OUTPUT_PATH = "data/uo-catalog-course-metadata.json";
const SUBJECT_REQUEST_CONCURRENCY = 6;
const REQUEST_RETRIES = 3;
const REQUEST_RETRY_DELAY_MS = 600;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  copy: "\u00A9",
  gt: ">",
  hellip: "...",
  ldquo: '"',
  lt: "<",
  mdash: "-",
  nbsp: " ",
  ndash: "-",
  quot: '"',
  rdquo: '"',
  reg: "\u00AE",
  rsquo: "'",
  lsquo: "'",
};

function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (fullMatch, entity) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const value = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : fullMatch;
    }
    if (entity.startsWith("#")) {
      const value = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : fullMatch;
    }
    return NAMED_ENTITIES[entity] ?? fullMatch;
  });
}

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, " ");
}

function normalizeText(input: string): string {
  return decodeHtmlEntities(stripTags(input))
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePath(path: string): string {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

async function fetchText(path: string): Promise<string> {
  const normalizedPath = normalizePath(path);
  const url = new URL(normalizedPath, BASE_URL).toString();

  let lastError: unknown;
  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "DuckGradesCatalogBot/1.0 (+https://github.com/MarvNC/DuckGrades)",
        },
      });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < REQUEST_RETRIES) {
        await Bun.sleep(REQUEST_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new Error(`Unable to fetch ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function parseSubjectList(html: string): CatalogSubjectRecord[] {
  const subjectByCode = new Map<string, CatalogSubjectRecord>();
  const anchorPattern = /<a[^>]+href="(\/courses\/crs-[^"]*\/)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match = anchorPattern.exec(html);
  while (match) {
    const path = normalizePath(match[1]);
    const label = normalizeText(match[2]);
    const codeMatch = label.match(/\(([A-Z]{2,6})\)\s*$/);

    if (codeMatch) {
      const code = codeMatch[1].toUpperCase();
      const title = label.slice(0, codeMatch.index).trim();
      if (title && !subjectByCode.has(code)) {
        subjectByCode.set(code, { code, title, path });
      }
    }

    match = anchorPattern.exec(html);
  }

  return [...subjectByCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function parseCourseBlocks(html: string, sourcePath: string): CatalogCourseRecord[] {
  const courses: CatalogCourseRecord[] = [];
  const courseBlockPattern = /<div class="courseblock">([\s\S]*?)<\/div>/gi;

  let blockMatch = courseBlockPattern.exec(html);
  while (blockMatch) {
    const blockHtml = blockMatch[1];
    const titleMatch = blockHtml.match(/<p class="courseblocktitle[^\"]*">\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>/i);
    if (!titleMatch) {
      blockMatch = courseBlockPattern.exec(html);
      continue;
    }

    const header = normalizeText(titleMatch[1]);
    const headerMatch = header.match(/^([A-Z]{2,6})\s+([0-9][0-9A-Z]*)\.\s*(.+)$/);
    if (!headerMatch) {
      blockMatch = courseBlockPattern.exec(html);
      continue;
    }

    const subjectCode = headerMatch[1].toUpperCase();
    const number = headerMatch[2].toUpperCase();
    const rawCourseTitle = headerMatch[3].trim();
    const withoutCredits = rawCourseTitle.replace(/\.\s+\d+(?:-\d+)?\s+Credits?\.?$/i, "").trim();
    const title = withoutCredits.endsWith(".") ? withoutCredits.slice(0, -1).trim() : withoutCredits;

    const descMatch = blockHtml.match(/<p class="courseblockdesc">\s*([\s\S]*?)\s*<\/p>/i);
    const descriptionHtml = descMatch?.[1] ?? "";
    const primaryDescriptionHtml = descriptionHtml.split(/<br\s*\/?\s*>\s*<b>/i)[0] ?? descriptionHtml;
    const description = normalizeText(primaryDescriptionHtml);

    courses.push({
      code: `${subjectCode}-${number}`,
      subjectCode,
      number,
      title,
      description,
      path: sourcePath,
    });

    blockMatch = courseBlockPattern.exec(html);
  }

  return courses;
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length || 1);

  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
}

async function main() {
  const indexHtml = await fetchText(COURSES_INDEX_PATH);
  const subjects = parseSubjectList(indexHtml);
  if (subjects.length === 0) {
    throw new Error("No subjects were discovered from the catalog courses index.");
  }

  const coursesByCode = new Map<string, CatalogCourseRecord>();

  await mapWithConcurrency(subjects, SUBJECT_REQUEST_CONCURRENCY, async (subject, index) => {
    const html = await fetchText(subject.path);
    const parsedCourses = parseCourseBlocks(html, subject.path);

    for (const course of parsedCourses) {
      const existing = coursesByCode.get(course.code);
      if (!existing || (!existing.description && course.description)) {
        coursesByCode.set(course.code, course);
      }
    }

    if ((index + 1) % 15 === 0 || index + 1 === subjects.length) {
      console.log(`Fetched ${index + 1}/${subjects.length} subject pages...`);
    }
  });

  const snapshot: CatalogSnapshot = {
    schemaVersion: 1,
    source: new URL(COURSES_INDEX_PATH, BASE_URL).toString(),
    scrapedAt: new Date().toISOString(),
    subjects,
    courses: [...coursesByCode.values()].sort((a, b) => a.code.localeCompare(b.code)),
  };

  const output = `${JSON.stringify(snapshot)}\n`;
  const outputPath = join(process.cwd(), OUTPUT_PATH);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");

  console.log(`Wrote ${snapshot.subjects.length} subjects and ${snapshot.courses.length} courses to ${OUTPUT_PATH}`);
}

void main();
