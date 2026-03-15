import type { MutableRefObject } from "react";
import { BookOpen, Layers, User } from "lucide-react";
import { Link } from "react-router-dom";
import { prefetchRouteData } from "../../lib/dataClient";
import type { SearchItem } from "./searchModel";

type SearchResultsPageProps = {
  query: string;
  grouped?: {
    Subjects: SearchItem[];
    Courses: SearchItem[];
    Professors: SearchItem[];
  };
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
  return text.split("").map((character, index) => (
    <span key={`${character}-${index}`} className={highlighted.has(index) ? "font-semibold text-[var(--duck-fg)]" : undefined}>
      {character}
    </span>
  ));
}

function renderSectionIcon(section: SearchItem["section"]) {
  if (section === "Professor") {
    return <User className="h-4 w-4" aria-hidden="true" />;
  }
  if (section === "Course") {
    return <BookOpen className="h-4 w-4" aria-hidden="true" />;
  }
  return <Layers className="h-4 w-4" aria-hidden="true" />;
}

export function SearchResultsPage({
  query,
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
      <p className="mb-3 px-1 text-sm font-medium text-[var(--duck-muted)]">
        Search results for <span className="font-semibold text-[var(--duck-fg)]">"{query.trim()}"</span>
      </p>
      <div className="space-y-2">
        {flattened.length === 0 ? (
          <p className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface)] px-3 py-3 text-sm text-[var(--duck-muted)]">No matches found.</p>
        ) : null}
        {flattened.map((item, listIndex) => {
          const indexValue = indexByKey.get(item.key) ?? listIndex;
          return (
            <Link
              key={item.key}
              ref={(element) => {
                resultRefs.current[indexValue] = element;
              }}
              className={`block rounded-xl border px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--duck-focus)] ${
                activeIndex === indexValue
                  ? "border-[var(--duck-focus)] bg-[var(--duck-surface-soft)]"
                  : "border-[var(--duck-border)] bg-[var(--duck-surface)] hover:bg-[var(--duck-surface-soft)]"
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
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  const next = (indexValue + 1) % flattened.length;
                  setActiveIndex(next);
                  focusResult(next);
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  const prev = (indexValue - 1 + flattened.length) % flattened.length;
                  setActiveIndex(prev);
                  focusResult(prev);
                }
                if (event.key === "Tab" && event.shiftKey && indexValue === 0) {
                  event.preventDefault();
                  focusInput();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  clearQuery();
                  focusInput();
                }
              }}
            >
              <div className="flex items-center gap-3 text-sm text-[var(--duck-fg)]">
                <span className="shrink-0 text-[var(--duck-muted)]">{renderSectionIcon(item.section)}</span>
                <div className="min-w-0 flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{renderHighlightedText(item.label, item.labelMatchIndexes)}</span>
                  <span className="rounded-full border border-[var(--duck-border)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--duck-muted)]">
                    {item.section}
                  </span>
                  <span className="text-[var(--duck-muted)]">-</span>
                  <span className="text-[var(--duck-muted)]">{renderHighlightedText(item.subtitle, item.subtitleMatchIndexes)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
