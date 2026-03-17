# Agent Guidelines

- Commit often in small, reviewable chunks.
- Follow conventional commits so commitlint passes.
- Preferred stack: Bun + TypeScript + React + Vite + Tailwind CSS.
- Product goal: keep DuckGrades free to host on GitHub Pages and/or Cloudflare Pages long-term.
- Session flow: implement -> verify -> commit -> update any docs (if relevant) before handoff.
- Note that other agents may be making changes simultaneously. If other files are unexpectedly modified or the build fails due files being edited, ignore and proceed with your own task. When committing, make sure you are committing only your own work. Do NOT ever run `git add .`.
- We use bun
- Before committing, run lint and format checks and fix any issues: `bun run lint:fix && bun run format:fix`
- Follow the design identity defined in [docs/design.md](docs/design.md) for all UI work: colors, typography, spacing, components, and interaction patterns.
- When working on design, you MUST load [.impeccable.md](.impeccable.md) for design direction and treat it as the primary source of truth.
- For browser automation and UI checks, load and use the `playwright-cli` skill.
- Default local app URL is `http://localhost:5173/` unless otherwise specified; if unavailable, assume the dev server is not currently running.
