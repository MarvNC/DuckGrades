import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

type VersionFile = {
  version: string;
};

const SOURCE_ROOT = 'public/data';
const DIST_ROOT = 'dist/data';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const versionFilePath = join(SOURCE_ROOT, 'current-version.json');
  const versionFile = (await Bun.file(versionFilePath).json()) as VersionFile;

  assert(
    typeof versionFile.version === 'string' && versionFile.version.length > 0,
    'Invalid public/data/current-version.json'
  );

  const version = versionFile.version;
  const sourceVersionDir = join(SOURCE_ROOT, version);
  const distVersionDir = join(DIST_ROOT, version);

  await rm(DIST_ROOT, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
  await mkdir(DIST_ROOT, { recursive: true });

  await cp(versionFilePath, join(DIST_ROOT, 'current-version.json'));
  await cp(sourceVersionDir, distVersionDir, { recursive: true });

  console.log(`Copied ${version} data shards to ${DIST_ROOT}`);
}

void main();
