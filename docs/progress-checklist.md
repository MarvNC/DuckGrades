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

## Recent Commits

- `251d21c` feat: add subject sorting with url state
- `42374d3` feat: add static data pipeline and route data loading
- `7471017` feat: scaffold vite react tailwind app shell
- `f0a49d0` chore: initialize repository baseline

## Notes for Next Agent

- Spec authority is `docs/duckgrades-static-spec.md`; verify behavior against it before changing UX/data semantics.
- Keep hosting constraints in mind: static files only, CDN-friendly immutable data versioning, free GH/CF Pages long-term.
- Main CSVs are intentionally committed and treated as stable source input.
