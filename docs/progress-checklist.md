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
- [x] 8 Fallback to same-origin when CDN fetch fails.
- [~] 9 Numerical heatmap-style chart and non-numerical histogram UI (interactive bin/bar states added; full trapezoid fidelity still pending).
- [x] 10 Search UX: grouped results + debounce + arrows/tab/shift+tab/esc/enter implemented.
- [x] 10 Search shell is now available from persistent header quick-search across routes.
- [~] 11 Subject page partial: sort + URL state + year/term filters + virtualization + back-to-top done; further polish pending.
- [~] 12 Course page partial: aggregate + instructor metadata + shared collapsible section drilldown done; content-depth polish pending.
- [~] 13 Professor page partial: aggregate + course metadata + shared collapsible section drilldown done; richer comparison views pending.
- [~] 14 Performance budgets measured and enforced (analysis tooling added; hard limits + optimization pending).
- [~] 14 Performance budgets measured and enforced (search-index compacted from ~984 KB to ~614 KB uncompressed; more optimization pending).
- [~] 15 Build integrity checks partial: deterministic/collision behavior done; schema/hash/cross-ref validation pending.
- [~] 16 Data CDN branch strategy + deployment workflow (docs + GH Pages workflow added; live branch wiring pending).
- [~] 17 Accessibility QA pass and edge-case QA plan execution (chart keyboard + text alternatives + global focus-visible styling landed; full audit pending).
- [ ] 18 Legal/attribution validation notes.

## In Progress

- [ ] Replace placeholder page blocks with chart components and richer drill-down content.
- [x] Add keyboard-first grouped search behavior (tab/shift+tab focus travel and Esc close state polish).
- [x] Add loading, no-data, and redaction coverage states across all route pages.
- [~] Add build-time integrity checks (hash + cross-reference done; schema-contract validation still pending).
- [~] Revamp subject/course distributions for dense inline cards (compact chart + hover details + clarified P/NP/Other/W semantics).

## Next Up (Priority)

- [ ] Implement numerical/non-numerical chart primitives matching spec language.
- [x] Wire course/professor drill-down sections with collapsible section records.
- [x] Add route-level data prefetch from search results (hover/focus).
- [x] Add deployment docs for GitHub Pages and Cloudflare Pages with `VITE_DATA_BASE_URL`.
- [ ] Add virtualized course list + back-to-top behavior for deep subject scrolling.
- [x] Add virtualized course list + back-to-top behavior for deep subject scrolling.
- [ ] Reduce shard/index payload sizes to approach spec budget targets.

## Verification Log

- [x] `bun run check` passes after data pipeline + page integrations.
- [x] `bun run build:data` emits dataset `v20260314`.
- [x] `bun run build` passes with production bundle output.
- [x] Re-ran `bun run build:data`, `bun run check`, and `bun run build` on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after search/drilldown upgrades on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after route prefetch integration on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after deployment workflow updates on 2026-03-14.
- [x] Re-ran `bun run build:data`, `bun run check`, and `bun run build` after year/term filter implementation on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after subject virtualization + back-to-top implementation on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after interactive distribution chart improvements on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after shared section drilldown refactor on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after trapezoid-style chart fidelity update on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after loading/redaction state improvements on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after persistent header search-shell implementation on 2026-03-14.
- [x] Re-ran `bun run build:data`, `bun run check`, and `bun run build` after integrity-check enhancements on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after chart keyboard/a11y improvements on 2026-03-14.
- [x] Ran `bun run analyze:budgets` and re-ran `bun run check` + `bun run build` after budget tooling additions on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after global focus-visible accessibility polish on 2026-03-14.
- [x] Re-ran `bun run build:data`, `bun run analyze:budgets`, `bun run check`, and `bun run build` after compact search-index encoding on 2026-03-14.
- [x] Re-ran `bun run check` after homepage hero copy cleanup on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after homepage minimal search-first redesign on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after homepage/header search-shell + nav simplification on 2026-03-14.
- [x] Re-ran `bun run check` after homepage logo hierarchy polish on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after centered homepage hierarchy cleanup on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after homepage logo scale and vertical-centering adjustments on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after homepage spacing and logo scale rebalance on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after homepage visual redesign inspired by reference mockup on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after homepage logo weight/tracking and search-shadow refinement on 2026-03-14.
- [x] Re-ran `bun run check` after tightening homepage subtitle-to-search spacing on 2026-03-14.
- [x] Re-ran `bun run check` after increasing homepage logo scale on 2026-03-14.
- [x] Re-ran `bun run check` after fixing homepage logo size consistency across viewport widths on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after non-home page visual refresh for homepage design consistency on 2026-03-14.
- [x] Re-ran `bun run check` after reducing non-home logo scale while preserving homepage hero sizing on 2026-03-14.
- [x] Re-ran `bun run check` after unifying homepage/header search placeholder copy on 2026-03-14.
- [x] Re-ran `bun run check` after compact subject/course distribution revamp and search dropdown opacity fix on 2026-03-14.
- [x] Re-ran `bun run check` and `bun run build` after disabling Vite `emptyOutDir` to avoid intermittent Windows `ENOTEMPTY` dist cleanup failures on 2026-03-14.

## Recent Commits

- `0808803` feat: compact course distributions and clarify non-numeric grades
- `7beb3f6` feat: compact search-index with string table and flat tuples
- `47d97a2` feat: add consistent focus-visible accessibility styling
- `d829d88` feat: add dataset budget analysis script
- `640e5f1` feat: add keyboard and screenreader chart accessibility
- `674569a` feat: add build-data hash and cross-reference integrity checks
- `7e812db` feat: add persistent header quick-search shell
- `6e85c53` feat: surface loading and coverage redaction states
- `f8c838b` feat: render trapezoid-style interactive numerical chart
- `a62d3df` feat: enrich detail routes with shared section drilldown
- `5199456` feat: add interactive grade distribution card states
- `8585b9d` feat: virtualize subject course list with back-to-top
- `624bccb` feat: add subject year and term filtering model
- `9e00c21` feat: add free-tier deployment docs and gh pages workflow
- `35cf0b7` feat: prefetch shard routes from search interactions
- `a04803f` feat: improve search UX and add route drilldown states
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
- Research report from `uo.zone` deep dive is at `docs/uo-zone-ux-structure-report.md` (intentionally not committed).
- Latest budget snapshot shows current payloads are above target and need compression-oriented schema/sharding optimization.
- `OTHER` is a separate source bucket (not withdrawals); `W` remains a distinct withdrawal bucket and is now displayed explicitly in compact charts.
