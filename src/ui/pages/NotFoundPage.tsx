import { Link } from 'react-router-dom';
import { Compass, Search } from 'lucide-react';
import { usePageTitle } from '../usePageTitle';

type NotFoundPageProps = {
  title?: string;
  description?: string;
};

export function NotFoundPage({
  title = "We couldn't find that page",
  description = 'The link may be outdated, the URL may be mistyped, or the course/subject/professor may not exist in this dataset.',
}: NotFoundPageProps) {
  usePageTitle('404 Page Not Found');

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 items-center py-6 sm:py-10">
      <div className="w-full rounded-3xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--duck-muted)] uppercase">
          <Compass className="h-3.5 w-3.5" aria-hidden="true" />
          Error 404
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--duck-fg)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--duck-muted)] sm:text-base">
          {description}
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            to="/"
            className="inline-flex items-center rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--duck-fg)] transition hover:-translate-y-0.5 hover:border-[var(--duck-border-strong)] hover:bg-[var(--duck-surface)]"
          >
            Go home
          </Link>
          <Link
            to="/subjects"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)] px-4 py-2 text-sm font-semibold text-[var(--duck-muted-strong)] transition hover:-translate-y-0.5 hover:border-[var(--duck-border-strong)] hover:bg-[var(--duck-surface-soft)] hover:text-[var(--duck-accent-strong)]"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Browse subjects
          </Link>
        </div>
      </div>
    </section>
  );
}
