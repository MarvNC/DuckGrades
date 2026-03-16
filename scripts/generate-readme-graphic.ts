/**
 * generate-readme-graphic.ts
 *
 * Captures a centered screenshot of the DuckGrades homepage hero
 * (logo + wordmark + tagline) for use as a README / social graphic.
 *
 * The output maintains a 2:1 aspect ratio (OG / Twitter summary_large_image
 * standard) so the same file works as both a GitHub README banner and as
 * the og:image / twitter:image in index.html. Width is derived from the
 * natural single-line width of the subtitle so it never wraps.
 *
 * Usage:
 *   npx tsx scripts/generate-readme-graphic.ts [--url <url>] [--out <path>]
 *
 * Defaults:
 *   --url  http://localhost:5173  (local dev server)
 *   --out  public/readme-graphic.png
 *
 * Re-run this script whenever the logo, wordmark, or tagline text changes.
 */

import { chromium } from 'playwright';
import { resolve } from 'node:path';

/* ------------------------------------------------------------------ */
/*  CLI args                                                           */
/* ------------------------------------------------------------------ */

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const TARGET_URL = arg('--url', 'http://localhost:5173');
const OUT_PATH = resolve(arg('--out', 'public/readme-graphic.png'));

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/**
 * Viewport wide enough that the subtitle renders on one line at desktop
 * font sizes, but narrow enough to avoid excessive empty space.
 */
const VIEWPORT_W = 1280;
const VIEWPORT_H = 800;

/** Horizontal padding added each side of the subtitle's natural width. */
const PAD_X = 80;

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  console.log(`Opening ${TARGET_URL} …`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_W, height: VIEWPORT_H },
    deviceScaleFactor: 2, // Retina-quality output → physical px = CSS px × 2
  });
  const page = await context.newPage();

  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

  // Wait for fade-in-up animations to complete (longest: 240ms delay + 800ms duration)
  await page.waitForTimeout(1500);

  // Hide UI chrome not wanted in the graphic. Passed as a string to avoid DOM
  // type errors in the Node tsconfig (which intentionally excludes "dom" lib).
  await page.evaluate(`(() => {
    const hide = (sel) => {
      document.querySelectorAll(sel).forEach(el => { el.style.display = 'none'; });
    };
    hide('button');
    const sections = document.querySelectorAll('section.fade-in-up');
    if (sections[1]) sections[1].style.display = 'none';
    if (sections[2]) sections[2].style.display = 'none';
    hide('footer');
  })()`);

  // Measure elements after hiding chrome
  const brandEl = page.locator('.brand-home').first();
  const subtitleEl = page.locator('section.fade-in-up p').first();

  const brandBox = await brandEl.boundingBox();
  const subtitleBox = await subtitleEl.boundingBox();

  if (!brandBox || !subtitleBox) {
    console.error('Could not locate hero elements on the page.');
    await browser.close();
    process.exit(1);
  }

  // Crop width = subtitle's natural single-line width + side padding.
  // Crop height = width / 2  →  maintains 2:1 OG/Twitter aspect ratio.
  const cropW = Math.ceil(subtitleBox.width) + PAD_X * 2;
  const cropH = Math.round(cropW / 2);

  // Center horizontally on the subtitle midpoint (shared with brand).
  const heroCenterX = subtitleBox.x + subtitleBox.width / 2;
  // Center vertically on the brand-to-subtitle content midpoint.
  const heroTop = brandBox.y;
  const heroBottom = subtitleBox.y + subtitleBox.height;
  const heroCenterY = (heroTop + heroBottom) / 2;

  const clipX = Math.max(0, heroCenterX - cropW / 2);
  const clipY = Math.max(0, heroCenterY - cropH / 2);

  await page.screenshot({
    path: OUT_PATH,
    clip: { x: clipX, y: clipY, width: cropW, height: cropH },
  });

  const physW = cropW * 2;
  const physH = cropH * 2;
  console.log(`Saved ${OUT_PATH}  (${physW}×${physH} px — 2:1 OG/Twitter)`);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
