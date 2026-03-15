import type { MutableRefObject } from 'react';
import { BookOpen, Layers, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { prefetchRouteData } from '../../lib/dataClient';
import type { SearchItem, SearchSection } from './searchModel';

type SearchResultsPageProps = {
  query: string;
  orderedSections: SearchSection[];
  flattened: SearchItem[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  clearQuery: () => void;
  focusInput: () => void;
  pickResult: (item: SearchItem) => void;
  resultRefs: MutableRefObject<Array<HTMLAnchorElement | null>>;
  indexByKey: Map<string, number>;
};

function renderHighlightedText(text: string, indexes?: ReadonlyArray<number>) {
  if (!indexes || indexes.length === 0) {
    return text;
  }
  const highlighted = new Set(indexes);
  return text.split('').map((character, index) => (
    <span
      key={`${character}-${index}`}
      className={highlighted.has(index) ? 'font-semibold text-[var(--duck-fg)]' : undefined}
    >
      {character}
    </span>
  ));
}

function SectionIcon({ name }: { name: SearchSection['name'] }) {
  if (name === 'Professor') return <User className="h-3.5 w-3.5" aria-hidden="true" />;
  if (name === 'Course') return <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />;
  return <Layers className="h-3.5 w-3.5" aria-hidden="true" />;
}

const SECTION_LABELS: Record<SearchSection['name'], string> = {
  Subject: 'Subjects',
  Course: 'Courses',
  Professor: 'Professors',
};

export function SearchResultsPage({
  query,
  orderedSections,
  flattened,
  activeIndex,
  setActiveIndex,
  clearQuery,
  focusInput,
  pickResult,
  resultRefs,
  indexByKey,
}: SearchResultsPageProps) {
  function focusResult(indexValue: number) {
    const target = resultRefs.current[indexValue];
    if (target) {
      target.focus();
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl pb-8 text-left">
      <p className="mb-4 px-1 text-sm font-medium text-[var(--duck-muted)]">
        Results for <span className="font-semibold text-[var(--duck-fg)]">"{query.trim()}"</span>
      </p>

      {flattened.length === 0 ? (
        <p className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-4 py-3 text-sm text-[var(--duck-muted)]">
          No matches found.
        </p>
      ) : (
        <div className="space-y-5">
          {orderedSections.map((section) => (
            <div key={section.name}>
              {/* Section header */}
              <div className="mb-1.5 flex items-center gap-1.5 px-1">
                <span className="text-[var(--duck-muted)]">
                  <SectionIcon name={section.name} />
                </span>
                <span className="text-[11px] font-semibold tracking-[0.1em] text-[var(--duck-muted)] uppercase">
                  {SECTION_LABELS[section.name]}
                </span>
                <span className="rounded-full border border-[var(--duck-border)] px-1.5 py-px text-[10px] font-medium text-[var(--duck-muted)]">
                  {section.items.length}
                </span>
              </div>

              {/* Result cards */}
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const indexValue = indexByKey.get(item.key) ?? 0;
                  return (
                    <Link
                      key={item.key}
                      ref={(element) => {
                        resultRefs.current[indexValue] = element;
                      }}
                      className={`block rounded-xl border px-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--duck-focus)] ${
                        activeIndex === indexValue
                          ? 'border-[var(--duck-focus)] bg-[var(--duck-surface-soft)]'
                          : 'border-[var(--duck-border)] bg-[var(--duck-surface)] hover:border-[var(--duck-border-strong)] hover:bg-[var(--duck-surface-soft)]'
                      }`}
                      to={item.to}
                      onMouseEnter={() => {
                        setActiveIndex(indexValue);
                        prefetchRouteData(item.to);
                      }}
                      onFocus={() => {
                        setActiveIndex(indexValue);
                        prefetchRouteData(item.to);
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        pickResult(item);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          const next = (indexValue + 1) % flattened.length;
                          setActiveIndex(next);
                          focusResult(next);
                        }
                        if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          const prev = (indexValue - 1 + flattened.length) % flattened.length;
                          setActiveIndex(prev);
                          focusResult(prev);
                        }
                        if (event.key === 'Tab' && event.shiftKey && indexValue === 0) {
                          event.preventDefault();
                          focusInput();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          clearQuery();
                          focusInput();
                        }
                      }}
                    >
                      <div className="text-sm leading-snug text-[var(--duck-fg)]">
                        <span className="font-semibold">
                          {renderHighlightedText(item.label, item.labelMatchIndexes)}
                        </span>
                        {item.subtitle && item.section !== 'Professor' && (
                          <span className="text-[var(--duck-muted)]">
                            {' · '}
                            {renderHighlightedText(item.subtitle, item.subtitleMatchIndexes)}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
