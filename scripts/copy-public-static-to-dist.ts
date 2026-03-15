import { cp, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const PUBLIC_ROOT = "public";
const DIST_ROOT = "dist";
const SKIP_ENTRIES = new Set(["data"]);

async function main() {
  await mkdir(DIST_ROOT, { recursive: true });

  const entries = await readdir(PUBLIC_ROOT, { withFileTypes: true });
  const copiedNames: string[] = [];

  for (const entry of entries) {
    if (SKIP_ENTRIES.has(entry.name)) {
      continue;
    }

    const sourcePath = join(PUBLIC_ROOT, entry.name);
    const targetPath = join(DIST_ROOT, entry.name);
    await cp(sourcePath, targetPath, { recursive: true });
    copiedNames.push(entry.name);
  }

  copiedNames.sort((a, b) => a.localeCompare(b));
  console.log(`Copied ${copiedNames.length} public static assets to ${DIST_ROOT}`);
}

void main();
