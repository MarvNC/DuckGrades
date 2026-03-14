import type { MutableRefObject } from "react";
import { Link } from "react-router-dom";
import { prefetchRouteData } from "../../lib/dataClient";
import type { SearchItem } from "./searchModel";

type SearchResultsPageProps = {
  query: string;
  grouped: {
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

export function SearchResultsPage({
  query,
  grouped,
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
      <p className="mb-3 px-1 text-sm font-medium text-slate-500">
        Search results for <span className="font-semibold text-[var(--duck-fg)]">"{query.trim()}"</span>
      </p>
      <div className="space-y-3">
        {flattened.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">No matches found.</p>
        ) : null}
        {(["Subjects", "Courses", "Professors"] as const).map((sectionName) => {
          const items = grouped[sectionName];
          if (items.length === 0) {
            return null;
          }
          return (
            <div key={sectionName} className="space-y-2">
              <p className="px-1 text-sm font-medium text-slate-500">{sectionName}</p>
              {items.map((item) => {
                const indexValue = indexByKey.get(item.key) ?? 0;
                return (
                  <Link
                    key={item.key}
                    ref={(element) => {
                      resultRefs.current[indexValue] = element;
                    }}
                    className={`block rounded-xl border px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86ac67] ${
                      activeIndex === indexValue ? "border-[#86ac67] bg-[#effadf]" : "border-slate-200 bg-white hover:bg-[#f9fbf5]"
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
                    <p className="text-sm text-[var(--duck-fg)]">
                      <span className="font-semibold">{renderHighlightedText(item.label, item.labelMatchIndexes)}</span>
                      <span className="px-2 text-slate-300">-</span>
                      <span className="text-slate-500">{renderHighlightedText(item.subtitle, item.subtitleMatchIndexes)}</span>
                    </p>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
