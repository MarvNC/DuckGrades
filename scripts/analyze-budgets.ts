import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type CurrentVersion = { version: string };
type Manifest = {
  files: Record<string, { bytes: number; sha256: string }>;
};

const OUTPUT_ROOT = 'public/data';

function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  const current = JSON.parse(
    await readFile(join(OUTPUT_ROOT, 'current-version.json'), 'utf8')
  ) as CurrentVersion;
  const manifestPath = join(OUTPUT_ROOT, current.version, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;

  const entries = Object.entries(manifest.files);
  const shardEntries = entries.filter(([path]) => /\/(subjects|courses|professors)\//.test(path));
  const largestShard = shardEntries.reduce((max, currentEntry) =>
    currentEntry[1].bytes > max[1].bytes ? currentEntry : max
  );

  const searchIndex = entries.find(([path]) => path.endsWith('/search-index.json'));
  const totalBytes = entries.reduce((sum, [, meta]) => sum + meta.bytes, 0);

  console.log(`Budget analysis for ${current.version}`);
  console.log(`Total files indexed: ${entries.length}`);
  console.log(`Total bytes (uncompressed): ${formatKB(totalBytes)}`);
  if (searchIndex) {
    console.log(`Search index size: ${formatKB(searchIndex[1].bytes)} (${searchIndex[0]})`);
  }
  if (largestShard) {
    console.log(`Largest shard size: ${formatKB(largestShard[1].bytes)} (${largestShard[0]})`);
  }

  const topFive = [...shardEntries].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 5);
  console.log('Top 5 shard sizes:');
  for (const [path, meta] of topFive) {
    console.log(`- ${formatKB(meta.bytes)} ${path}`);
  }
}

void main();
