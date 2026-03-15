# Agent Guidelines

- Commit often in small, reviewable chunks.
- Follow conventional commits so commitlint passes.
- Preferred stack: Bun + TypeScript + React + Vite + Tailwind CSS.
- Product goal: keep DuckGrades free to host on GitHub Pages and/or Cloudflare Pages long-term.
- Session flow: implement -> verify -> commit -> update any docs (if relevant) before handoff.
- Note that other agents may be making changes simultaneously. If other files are unexpectedly modified or the build fails due files being edited, ignore and proceed with your own task. When committing, make sure you are committing only your own work.
- We use bun
- Follow the design identity defined in [docs/design.md](docs/design.md) for all UI work: colors, typography, spacing, components, and interaction patterns.
