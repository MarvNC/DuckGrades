import { Github } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-4 pb-6 sm:px-8 sm:pt-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col-reverse items-center justify-between gap-5 border-t border-[var(--duck-border)] pt-5 text-center sm:flex-row sm:gap-8 sm:pt-8 sm:text-left">
        <div className="max-w-2xl space-y-1.5 text-[11px] leading-relaxed text-[var(--duck-muted)] sm:space-y-1">
          <p>
            Data obtained via FOIA request. Some data is not available due to anonymization by the
            University.
          </p>
          <p>
            DuckGrades is an independent project built to give students insights into course grade
            distributions and statistics. Not affiliated with the University of Oregon.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:items-end">
          <a
            href="https://github.com/MarvNC/DuckGrades"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)] px-4 py-2 text-sm font-semibold whitespace-nowrap text-[var(--duck-muted)] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--duck-border-strong)] hover:text-[var(--duck-accent-strong)] hover:shadow-md"
          >
            <Github className="h-5 w-5" aria-hidden="true" />
            View on GitHub
          </a>
          <span className="text-xs text-[var(--duck-muted)]">
            Built by{' '}
            <a
              href="https://github.com/MarvNC"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline hover:text-[var(--duck-accent-strong)]"
            >
              MarvNC
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
