import { Github } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-6 pt-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-4 border-t border-[var(--duck-border)] pt-8 text-center sm:flex-row sm:gap-5 sm:text-left">
        <div className="space-y-1">
          <p className="text-[11px] text-[var(--duck-muted)]">Data obtained via FOIA request. Some data is not available due to anonymization by the University.</p>
          <p className="text-[11px] text-[var(--duck-muted)]">DuckGrades is an independent project built to give students insights into course grade distributions and statistics.</p>
          <p className="text-[11px] text-[var(--duck-muted)]">DuckGrades is not affiliated with the University of Oregon.</p>
        </div>
        <a
          href="https://github.com/MarvNC/DuckGrades"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--duck-muted)] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--duck-border-strong)] hover:text-[var(--duck-accent-strong)] hover:shadow-md"
        >
          <Github className="h-4 w-4" aria-hidden="true" />
          View on GitHub
        </a>
      </div>
    </footer>
  );
}
