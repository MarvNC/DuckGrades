import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

type VersionFile = {
  version: string;
};

const PUBLIC_DIR = 'public';
const DATA_ROOT = join(PUBLIC_DIR, 'data');
const DEFAULT_SITE_URL = 'https://duckgrades.maarv.dev';

function normalizeSiteUrl(input: string): string {
  return input.trim().replace(/\/$/, '');
}

function toRouteCode(fileName: string): string {
  return fileName.replace(/\.json$/i, '');
}

function toSitemapUrl(siteUrl: string, pathName: string): string {
  return `${siteUrl}${pathName}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function listCodes(pathToDir: string): Promise<string[]> {
  const entries = await readdir(pathToDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => toRouteCode(entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function main() {
  const siteUrl = normalizeSiteUrl(process.env.SITE_URL ?? DEFAULT_SITE_URL);

  const versionFile = (await Bun.file(
    join(DATA_ROOT, 'current-version.json')
  ).json()) as VersionFile;
  const datasetVersion = versionFile.version;

  if (!datasetVersion) {
    throw new Error('Missing data version in public/data/current-version.json');
  }

  const versionRoot = join(DATA_ROOT, datasetVersion);
  const [subjectCodes, courseCodes, professorIds] = await Promise.all([
    listCodes(join(versionRoot, 'subjects')),
    listCodes(join(versionRoot, 'courses')),
    listCodes(join(versionRoot, 'professors')),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const urls: Array<{ path: string; changefreq: string; priority: string }> = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/subjects', changefreq: 'daily', priority: '0.9' },
    { path: '/analytics', changefreq: 'daily', priority: '0.9' },
    ...subjectCodes.map((code) => ({
      path: `/subject/${encodeURIComponent(code)}`,
      changefreq: 'weekly',
      priority: '0.8',
    })),
    ...courseCodes.map((code) => ({
      path: `/course/${encodeURIComponent(code)}`,
      changefreq: 'weekly',
      priority: '0.7',
    })),
    ...professorIds.map((id) => ({
      path: `/professor/${encodeURIComponent(id)}`,
      changefreq: 'weekly',
      priority: '0.6',
    })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (entry) =>
        `  <url><loc>${escapeXml(toSitemapUrl(siteUrl, entry.path))}</loc><lastmod>${today}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`
    ),
    '</urlset>',
    '',
  ].join('\n');

  const robotsText = [`User-agent: *`, `Allow: /`, `Sitemap: ${siteUrl}/sitemap.xml`, ``].join(
    '\n'
  );

  await Promise.all([
    Bun.write(join(PUBLIC_DIR, 'sitemap.xml'), xml),
    Bun.write(join(PUBLIC_DIR, 'robots.txt'), robotsText),
  ]);

  console.log(`Generated sitemap (${urls.length} URLs) and robots.txt for ${siteUrl}`);
}

void main();
