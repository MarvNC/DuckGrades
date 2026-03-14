# DuckGrades Progress Checklist

Last updated: 2026-03-14

## Handoff Rules

- Before ending a session, update this checklist and mark current status.
- Include blockers, next 1-3 concrete tasks, and latest commit hash.
- Keep commits small and verified (`bun run check`, `bun run build`, and data tasks when relevant).

## Current Status

- [x] Initialize git repo and baseline commit with docs + CSV data.
- [x] Add `AGENTS.md` with commit/spec guidance, stack, and hosting goal.
- [x] Scaffold Bun + TypeScript + React + Vite + Tailwind app shell.
- [x] Set up route skeleton for home/subject/course/professor.
- [x] Implement initial design language (Sora + Duck theme variables).
- [x] Add data build pipeline (`scripts/build-data.ts`) for versioned JSON shards.
- [x] Generate deterministic professor IDs with collision suffix fallback.
- [x] Emit manifest/search index/subject/course/professor shards.
- [x] Add runtime data client and search loading on homepage.
- [x] Add subject sorting with URL query-state persistence.
- [x] Add reusable aggregate summary card and wire it across subject/course/professor pages.

## Spec Coverage Snapshot

- [x] 1-3 Purpose/IA/design baseline started (branding tokens + Sora + core routes).
- [x] 4 Data source + grade mapping implemented in build script.
- [x] 5 Aggregation metrics implemented (mean/mode/median/coverage).
- [x] 6 Deterministic professor IDs + unknown fallback implemented.
- [x] 7 Static sharded output + manifest/search index implemented.
- [x] 8 Runtime fetch uses versioned base URL (`VITE_DATA_BASE_URL` aware).
- [ ] 8 Fallback to same-origin when CDN fetch fails.
- [ ] 9 Numerical heatmap-style chart and non-numerical histogram UI.
- [~] 10 Search UX partial: grouped results + arrows/enter/esc done; debounce/tab traversal pending.
- [~] 11 Subject page partial: sort + URL state done; year/term filters + virtualization pending.
- [~] 12 Course page partial: aggregate + instructor list done; metadata/details/collapsibles pending.
- [~] 13 Professor page partial: aggregate + course list done; collapsible section details pending.
- [ ] 14 Performance budgets measured and enforced.
- [~] 15 Build integrity checks partial: deterministic/collision behavior done; schema/hash/cross-ref validation pending.
- [ ] 16 Data CDN branch strategy + deployment workflow.
- [ ] 17 Accessibility QA pass and edge-case QA plan execution.
- [ ] 18 Legal/attribution validation notes.

## In Progress

- [ ] Replace placeholder page blocks with chart components and richer drill-down content.
- [ ] Add keyboard-first grouped search behavior (tab/shift+tab focus travel and Esc close state polish).
- [ ] Add loading, no-data, and redaction coverage states across all route pages.

## Next Up (Priority)

- [ ] Implement numerical/non-numerical chart primitives matching spec language.
- [ ] Wire course/professor drill-down sections with collapsible section records.
- [ ] Add route-level data prefetch from search results (hover/focus).
- [ ] Add deployment docs for GitHub Pages and Cloudflare Pages with `VITE_DATA_BASE_URL`.

## Verification Log

- [x] `bun run check` passes after data pipeline + page integrations.
- [x] `bun run build:data` emits dataset `v20260314`.
- [x] `bun run build` passes with production bundle output.
- [x] Re-ran `bun run build:data`, `bun run check`, and `bun run build` on 2026-03-14.

## Recent Commits

- `be97dd5` feat: share aggregate summary card across detail routes
- `d22f02f` chore: add handoff progress checklist workflow
- `251d21c` feat: add subject sorting with url state
- `42374d3` feat: add static data pipeline and route data loading
- `7471017` feat: scaffold vite react tailwind app shell
- `f0a49d0` chore: initialize repository baseline

## Notes for Next Agent

- Spec authority is `docs/duckgrades-static-spec.md`; verify behavior against it before changing UX/data semantics.
- Keep hosting constraints in mind: static files only, CDN-friendly immutable data versioning, free GH/CF Pages long-term.
- Main CSVs are intentionally committed and treated as stable source input.
