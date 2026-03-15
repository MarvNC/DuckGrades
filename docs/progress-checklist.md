# DuckGrades Progress Checklist

Last updated: 2026-03-15

## Current Session

- [x] Scrape UO catalog subjects/courses into local metadata snapshot.
- [x] Integrate catalog subject titles and course descriptions into build-data output.
- [x] Make subject titles searchable in global search and subjects overview.
- [x] Render course descriptions and subject titles in route UI.
- [x] Keep per-section CSV course title in section drilldown for CRN-level source traceability.

## Verification

- [x] `bun run build:catalog`
- [x] `bun run build:data`
- [x] `bun run check`
- [x] `bun run build`
- [x] Re-ran `bun run check` and `bun run build:data` after section-level CSV title update.

## Notes

- Catalog snapshot captured 128 subjects and 6138 courses from `https://catalog.uoregon.edu/courses/`.
- Current grade-dataset course coverage by catalog course metadata is about 70.3% (5082 / 7231).
- When catalog metadata is unavailable for a course, the app falls back to CSV title semantics.

## Next 1-3 Tasks

1. Add schema validation for `data/uo-catalog-course-metadata.json` in the build pipeline.
2. Improve historical course-code/title coverage with archived catalog mappings.
3. Optionally surface an explicit fallback label when catalog descriptions are unavailable.

## Blockers

- None.

## Latest Commit Hash

- `68c62b6` feat: enrich catalog metadata for search and course details
