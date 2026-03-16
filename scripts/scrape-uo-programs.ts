import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

type ProgramCategory =
  | 'ug-major'
  | 'ug-minor'
  | 'ug-certificate'
  | 'gr-degree'
  | 'gr-certificate'
  | 'gr-specialization'
  | 'gr-microcredential';

type ProgramListing = {
  name: string;
  category: ProgramCategory;
  sourcePath: string;
  sectionId: string;
  path: string;
  hash: string | null;
  credentials: string | null;
};

type ProgramSnapshot = {
  schemaVersion: 1;
  sourcePaths: string[];
  scrapedAt: string;
  programs: Array<
    ProgramListing & {
      pageTitle: string | null;
      description: string | null;
      overview: string[];
    }
  >;
};

const BASE_URL = 'https://catalog.uoregon.edu';
const OUTPUT_PATH = 'data/uo-catalog-program-metadata.json';
const REQUEST_RETRIES = 3;
const REQUEST_RETRY_DELAY_MS = 600;
const PAGE_REQUEST_CONCURRENCY = 8;

const SOURCE_SECTIONS: Array<{ path: string; sectionId: string; category: ProgramCategory }> = [
  { path: '/ug-programs/', sectionId: 'majorstextcontainer', category: 'ug-major' },
  { path: '/ug-programs/', sectionId: 'minorstextcontainer', category: 'ug-minor' },
  { path: '/ug-programs/', sectionId: 'certificatestextcontainer', category: 'ug-certificate' },
  { path: '/gr-programs/', sectionId: 'degreeprogramstextcontainer', category: 'gr-degree' },
  { path: '/gr-programs/', sectionId: 'certificatestextcontainer', category: 'gr-certificate' },
  {
    path: '/gr-programs/',
    sectionId: 'specializationstextcontainer',
    category: 'gr-specialization',
  },
  {
    path: '/gr-programs/',
    sectionId: 'microcredentialtextcontainer',
    category: 'gr-microcredential',
  },
];

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  copy: '\u00A9',
  gt: '>',
  hellip: '...',
  ldquo: '"',
  lt: '<',
  mdash: '-',
  nbsp: ' ',
  ndash: '-',
  quot: '"',
  rdquo: '"',
  reg: '\u00AE',
  rsquo: "'",
  lsquo: "'",
};

function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (fullMatch, entity) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const value = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : fullMatch;
    }
    if (entity.startsWith('#')) {
      const value = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : fullMatch;
    }
    return NAMED_ENTITIES[entity] ?? fullMatch;
  });
}

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, ' ');
}

function normalizeText(input: string): string {
  return decodeHtmlEntities(stripTags(input))
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePath(path: string): string {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

async function fetchText(path: string): Promise<string> {
  const url = new URL(normalizePath(path), BASE_URL).toString();
  let lastError: unknown;

  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'DuckGradesProgramCatalogBot/1.0 (+https://github.com/MarvNC/DuckGrades)',
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

  throw new Error(
    `Unable to fetch ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

function extractContainer(html: string, sectionId: string): string {
  const pattern = new RegExp(`<div id="${sectionId}"[^>]*>([\\s\\S]*?)<\\/div>`, 'i');
  const match = html.match(pattern);
  return match?.[1] ?? '';
}

function parseListings(
  containerHtml: string,
  sourcePath: string,
  sectionId: string,
  category: ProgramCategory
): ProgramListing[] {
  const listings: ProgramListing[] = [];
  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;

  let liMatch = liPattern.exec(containerHtml);
  while (liMatch) {
    const itemHtml = liMatch[1] ?? '';
    const anchorMatch = itemHtml.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);

    if (anchorMatch) {
      const href = anchorMatch[1].trim();
      const name = normalizeText(anchorMatch[2]);

      if (name && href && !href.startsWith('#')) {
        const resolved = new URL(href, new URL(normalizePath(sourcePath), BASE_URL));
        const path = normalizePath(resolved.pathname);
        const hash = resolved.hash ? resolved.hash.slice(1) : null;

        const withoutAnchor = itemHtml.replace(anchorMatch[0], ' ');
        const tailText = normalizeText(withoutAnchor).replace(/^:/, '').trim();
        const credentials = tailText.length > 0 ? tailText : null;

        listings.push({
          name,
          category,
          sourcePath,
          sectionId,
          path,
          hash,
          credentials,
        });
      }
    }

    liMatch = liPattern.exec(containerHtml);
  }

  return listings;
}

function parseOverviewParagraphs(html: string): string[] {
  const textContainerMatch = html.match(/<div id="textcontainer"[^>]*>([\s\S]*?)<\/div>/i);
  const searchScope = textContainerMatch?.[1] ?? html;
  const paragraphs: string[] = [];
  const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;

  let pMatch = pPattern.exec(searchScope);
  while (pMatch) {
    const text = normalizeText(pMatch[1]);
    if (text.length > 0) {
      paragraphs.push(text);
    }
    pMatch = pPattern.exec(searchScope);
  }

  return paragraphs;
}

function parsePageTitle(html: string): string | null {
  const titleMatch = html.match(/<h1 class="page-title">([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? normalizeText(titleMatch[1]) : '';
  return title || null;
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<void>
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
  const sourceHtml = new Map<string, string>();
  for (const sourcePath of new Set(SOURCE_SECTIONS.map((entry) => entry.path))) {
    sourceHtml.set(sourcePath, await fetchText(sourcePath));
  }

  const listings: ProgramListing[] = [];
  for (const section of SOURCE_SECTIONS) {
    const html = sourceHtml.get(section.path) ?? '';
    const containerHtml = extractContainer(html, section.sectionId);
    if (!containerHtml) {
      continue;
    }
    listings.push(
      ...parseListings(containerHtml, section.path, section.sectionId, section.category)
    );
  }

  const dedupedListings = new Map<string, ProgramListing>();
  for (const listing of listings) {
    const dedupeKey = `${listing.category}:${listing.name.toLowerCase()}:${listing.path}:${listing.hash ?? ''}`;
    if (!dedupedListings.has(dedupeKey)) {
      dedupedListings.set(dedupeKey, listing);
    }
  }
  const programs = [...dedupedListings.values()];

  const uniquePaths = [...new Set(programs.map((program) => program.path))];
  const pageMeta = new Map<string, { title: string | null; overview: string[] }>();

  await mapWithConcurrency(uniquePaths, PAGE_REQUEST_CONCURRENCY, async (path, index) => {
    const html = await fetchText(path);
    pageMeta.set(path, {
      title: parsePageTitle(html),
      overview: parseOverviewParagraphs(html),
    });

    if ((index + 1) % 25 === 0 || index + 1 === uniquePaths.length) {
      console.log(`Fetched ${index + 1}/${uniquePaths.length} program pages...`);
    }
  });

  const snapshot: ProgramSnapshot = {
    schemaVersion: 1,
    sourcePaths: [...new Set(SOURCE_SECTIONS.map((entry) => entry.path))],
    scrapedAt: new Date().toISOString(),
    programs: programs
      .map((program) => {
        const page = pageMeta.get(program.path);
        const overview = page?.overview ?? [];
        return {
          ...program,
          pageTitle: page?.title ?? null,
          description: overview[0] ?? null,
          overview,
        };
      })
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.name.localeCompare(b.name) ||
          a.path.localeCompare(b.path)
      ),
  };

  const outputPath = join(process.cwd(), OUTPUT_PATH);
  await mkdir(dirname(outputPath), { recursive: true });
  await Bun.write(outputPath, `${JSON.stringify(snapshot)}\n`);

  console.log(
    `Wrote ${snapshot.programs.length} program entries (${uniquePaths.length} pages) to ${OUTPUT_PATH}`
  );
}

void main();
