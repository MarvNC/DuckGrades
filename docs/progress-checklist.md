# DuckGrades Progress Checklist

Last updated: 2026-03-15

## Current Session

- [x] Scrape UO catalog subjects/courses into local metadata snapshot.
- [x] Integrate catalog subject titles and course descriptions into build-data output.
- [x] Make subject titles searchable in global search and subjects overview.
- [x] Render course descriptions and subject titles in route UI.
- [x] Keep per-section CSV course title in section drilldown for CRN-level source traceability.
- [x] Scrape undergraduate and graduate program pages (majors/minors/certificates/degree programs/specializations/microcredentials) and store normalized descriptions.
- [x] Merge high-confidence legacy subject codes (CIS->CS, J/JC->JCOM, GEOL->ERTH, AEII/AEIP/AEGP->AEIS) into canonical subject/course shards.
- [x] Surface source subject code in expanded section drilldown when a merged alias differs from canonical subject.
- [x] Update subject header format to `CODE - Title`.

## Verification

- [x] `bun run build:catalog`
- [x] `bun run build:programs`
- [x] `bun run build:data`
- [x] `bun run check`
- [x] `bun run build`
- [x] Verified alias merge outputs and subject description/title coverage logs from build script.

## Notes

- Catalog snapshot now captures 142 subjects and 6295 courses (including nested Physical Education subject pages).
- Program snapshot captures 313 program entries across 285 unique pages from `/ug-programs/` and `/gr-programs/`.
- Raw CSV subject mismatch against current catalog subjects is 111/250; after explicit alias merges this becomes 104/243 canonical subjects.
- Subject description coverage from current program-name matching is 93/243 canonical subjects.

## Next 1-3 Tasks

1. Expand manual alias map for additional legacy codes where high-confidence equivalence is confirmed.
2. Add schema validation for scraped catalog data files.
3. Improve subject-description matching with richer manual title aliases for remaining unmatched subjects.

## Blockers

- None.

## Latest Commit Hash

- `06bd508` feat: scrape catalog programs and expanded course subjects
- `883da8a` feat: merge legacy subject codes into canonical shards
