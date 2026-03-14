# DuckGrades Static App Specification

## 1. Purpose and Scope

DuckGrades is a static, search-first grade exploration web app for University of Oregon data.
It mirrors a proven interaction model while using DuckGrades branding, UO-themed visual design, and a static JSON/CDN architecture suitable for free hosting.

This specification assumes the source dataset is:

- `data/pub_rec_master_w2016-f2025.csv`

Non-goals for v1:

- Localization routes
- COVID-era default exclusions
- Server-side API dependencies at runtime

## 2. Product Requirements

### 2.1 Core User Jobs

- Search for a subject, course, or professor quickly.
- Inspect aggregate grade tendencies and distributions.
- Compare instructor-level outcomes inside a course.
- Evaluate instructor patterns across courses.

### 2.2 High-Level IA

- `/` Home + global search
- `/subject/:code` Subject aggregate + filter/sort + course list
- `/course/:code` Course details + aggregate + instructor breakdown
- `/professor/:id` Professor details + aggregate + course breakdown

### 2.3 Interaction Goals

- Search-first homepage and grouped live results.
- Keyboard search navigation (arrows/tab/shift+tab/esc/enter).
- Reusable summary cards with consistent grade graph language.
- Expandable section-level drill-down cards.
- Filter state persisted in URL query params on subject page.

## 3. Design System Requirements

### 3.1 Branding

- Do not reuse third-party visual brand assets.
- Use DuckGrades identity with UO-inspired pastel green/yellow accents.
- Keep clean, low-chrome, data-first UI.

### 3.2 Typography

- Primary font: Sora (Google Fonts)
- Suggested fallback stack: `ui-sans-serif, system-ui, sans-serif`

### 3.3 Color Tokens (CSS Variables)

Define at minimum:

- `--duck-bg`, `--duck-fg`
- `--duck-primary` (pastel green)
- `--duck-accent` (pastel yellow)
- `--duck-muted`, `--duck-border`
- grade semantic colors (fail -> pass spectrum)

### 3.4 Components

- Paper card primitives (default/link variants)
- Badge/chip primitives for metadata
- Tab links for view switching
- Collapsible details for section-level expansion
- Dropdown filter controls
- Tooltip and hover-state affordances

## 4. Data Source and Canonical Semantics

### 4.1 CSV Input Columns

Required columns from source CSV:

- `TERM`, `SUBJ`, `NUMB`, `TITLE`, `CRN`, `INSTRUCTOR`
- grade buckets: `AP,A,AM,BP,B,BM,CP,C,CM,DP,D,DM,F,P,N,OTHER,W`
- `TOT_NON_W`

`TERM_DESC` is optional and can be dropped for compactness if term labels are derived client-side.

### 4.2 Grade Mapping for DuckGrades

Numerical bins (left-to-right, low-to-high):

- `F`, `DM` (D-), `D`, `DP` (D+), `CM` (C-), `C`, `CP` (C+), `BM` (B-), `B`, `BP` (B+), `AM` (A-), `A`, `AP` (A+)

Non-numerical bins:

- `P`, `N`, `OTHER`

Withdrawals:

- `W` tracked separately and excluded from `TOT_NON_W` calculations.

### 4.3 Redaction / Missing Values

- `*` means unavailable/redacted in source.
- Do not coerce `*` to zero in aggregate metrics.
- Track coverage metrics to communicate visible-data fraction.

## 5. Aggregation Rules

### 5.1 Section-Level Records

Normalize each row into an internal section record:

- identity: term, subject, number, title, crn, instructor
- grade counts for all bins (nullable if redacted)
- reported total non-withdrawal (`TOT_NON_W`)

### 5.2 Aggregate Metrics

- `totalNonWReported`: sum of `TOT_NON_W` across included rows
- `totalVisibleNonW`: sum of visible bucket counts (excluding `W`)
- `coverage = totalVisibleNonW / totalNonWReported` (if denominator > 0)
- `mean`: weighted average over numerical bins only
- `mode`: highest count bin among visible bins
- `median`: recommended numerical-only median

### 5.3 No-Data Behavior

If visible totals are zero:

- show explicit no-grade-data states
- keep cards and routing intact
- show redaction/coverage explanatory text

## 6. Professor Identity Strategy

The source CSV does not provide a stable professor ID column. DuckGrades must generate one.

### 6.1 Canonical Name

Define `instructorCanonical` as:

- trim leading/trailing whitespace
- collapse repeated internal whitespace
- preserve punctuation and case for display string

### 6.2 Deterministic ID

Generate deterministic `professorId` from canonical name, e.g.:

- `base36(fnv1a_64(instructorCanonical))`

Requirements:

- deterministic across builds
- collision check at build time
- collision fallback (`-2`, `-3` suffix) if ever needed

### 6.3 Unknown / Unavailable Instructor

- If instructor is blank or explicitly unknown after normalization, map to `professorId = "unknown"`.
- Keep unknown instructor groups visible in course breakdowns.

## 7. Static Data Architecture (Sharding)

### 7.1 Why Sharding

- Minimizes initial payload
- Improves route latency
- Keeps parsing overhead low on mobile

### 7.2 Output Layout

Version data immutably:

- `data/vYYYYMMDD/manifest.json`
- `data/vYYYYMMDD/search-index.json`
- `data/vYYYYMMDD/subjects/{SUBJ}.json`
- `data/vYYYYMMDD/courses/{SUBJ}-{NUMB}.json`
- `data/vYYYYMMDD/professors/{id}.json`

### 7.3 Encoding

Use compact JSON structures (tuple/columnar + dictionaries) to reduce size.
Do not require client-side zip decoding libraries.
Rely on CDN/browser HTTP compression (Brotli/Gzip).

### 7.4 Manifest Contract

`manifest.json` must include:

- schema version
- dataset version/build timestamp
- global grade orders
- file index with hash + byte size
- optional compatibility flags

## 8. Fetch and Caching Model

### 8.1 Runtime Fetch Flow

At startup:

1. Fetch `manifest.json`
2. Fetch `search-index.json`

By route:

- subject page -> corresponding subject shard
- course page -> corresponding course shard
- professor page -> corresponding professor shard

### 8.2 Config

Set base URL via env:

- `VITE_DATA_BASE_URL`

### 8.3 Caching

- data files: long-lived immutable cache headers
- app shell: shorter cache policy
- include same-origin fallback if CDN request fails

## 9. Graph Specification (DuckGrades “Heatmap”-Style Distribution)

### 9.1 Numerical Distribution Chart

- Render a horizontal grade spectrum background (fail -> pass colors).
- Overlay area profile as adjacent trapezoid strips between neighboring bins.
- Provide hover/touch nearest-bin selection with:
  - selected grade label
  - count
  - percent
  - guide lines / pinpoint marker

### 9.2 Non-Numerical Histogram

- Render vertical bars for `P`, `N`, `OTHER`.
- On hover/tap, toggle label to absolute count.

### 9.3 Layout Composition

- Graph block includes:
  - total students tag
  - non-numerical bars
  - spacing gutter
  - numerical distribution chart

### 9.4 Sizes

- `sm`: list cards
- `md`: top summary cards

## 10. Search Specification

### 10.1 Index Content

`search-index.json` should include:

- subjects (code + title)
- courses (code + title + subject)
- professors (id + display name)

### 10.2 Ranking

Suggested ranking pipeline:

1. exact code/name match
2. prefix match
3. token contains/fuzzy match
4. tie-break by enrollment/popularity

### 10.3 UX

- debounce input (~250-300ms)
- grouped result sections
- keyboard traversal between results and input
- Esc to close search mode

## 11. Subject Page Specification

### 11.1 Header and Summary

- subject code + title heading
- summary card (all courses in subject)

### 11.2 Filter Menu

Support:

- sort by `code`, `average`, `mode` (median optional)
- sort direction toggle
- filter by course year bucket (1-5)
- filter by term (fall/winter/spring/summer as modeled)
- reset filters

Persist filter state in URL query params.

### 11.3 List Rendering

- virtualized course list for performance
- card-per-course with compact graph (`sm`)
- floating back-to-top button after deep scroll

## 12. Course Page Specification

### 12.1 Top Metadata

- subject breadcrumb link
- course title
- badges (units/faculty/subject if available)

### 12.2 Content

- description, requirements, components (if present)
- overall aggregate summary card
- instructor cards with section-level collapsible details
- unknown-instructor grouping retained

## 13. Professor Page Specification

### 13.1 Header

- professor display name
- optional external metadata badges (future extension)

### 13.2 Content

- aggregate all-courses summary card
- per-course cards with section-level collapsible details

## 14. Performance Targets

Target budgets:

- initial index fetch <= 150 KB Brotli
- common shard fetch <= 80 KB Brotli
- largest shard <= 120 KB Brotli
- route-level parse/decode comfortably sub-100ms on mid-tier mobile

Additional constraints:

- code split route modules
- avoid loading large shard sets eagerly
- prefetch next likely shard on focused/hovered search result

## 15. Build Pipeline Specification

### 15.1 Script

Implement `scripts/build-data` to:

1. read source CSV
2. normalize rows
3. generate deterministic IDs (including professor IDs)
4. compute aggregates
5. emit versioned shard files
6. emit manifest and search index
7. run integrity checks

### 15.2 Integrity Checks

- schema validation for all artifacts
- hash verification in manifest
- cross-reference verification (search index -> shard exists)
- collision detection for generated professor IDs

## 16. Hosting and Branch Strategy

### 16.1 Repository Layout

- `main`: app source code
- `data-cdn` orphan branch: generated static data only

### 16.2 Delivery Options

- same-origin data from site deploy
- or jsDelivr over GitHub branch/tag for data CDN

Recommended runtime behavior:

- primary fetch from configured CDN base URL
- fallback to same-origin data path

## 17. Accessibility and QA

### 17.1 Accessibility

- keyboard-first search navigation
- focus-visible on all interactive elements
- chart labels/tooltips with meaningful text alternatives
- color contrast checks for pastel palette

### 17.2 QA

- no-data and redaction edge cases
- very large subject list scrolling
- mobile interactions for chart hover/touch
- cache/version cutovers between dataset versions

## 18. Legal and Attribution Notes

- The reference repository currently has no explicit license file; do not copy code/assets verbatim unless permission/license is clarified.
- Re-implement behavior and interaction patterns with original DuckGrades code and branding.
