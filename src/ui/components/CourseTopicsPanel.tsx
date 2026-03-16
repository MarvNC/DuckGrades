import { ChevronDown, Compass } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SectionRow } from '../../lib/dataClient';

type TopicSummary = {
  title: string;
  count: number;
};

function buildTopicSummaries(sections: SectionRow[]): TopicSummary[] {
  const map = new Map<string, TopicSummary>();

  for (const section of sections) {
    const title = section.csvTitle?.trim();
    if (!title) {
      continue;
    }

    const existing = map.get(title);

    if (!existing) {
      map.set(title, {
        title,
        count: 1,
      });
      continue;
    }

    existing.count += 1;
  }

  return [...map.values()];
}

function sortTopics(topics: TopicSummary[]): TopicSummary[] {
  return [...topics].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return left.title.localeCompare(right.title);
  });
}

type CourseTopicsPanelProps = {
  sections: SectionRow[];
};

export function CourseTopicsPanel({ sections }: CourseTopicsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [hasCollapsedOverflow, setHasCollapsedOverflow] = useState(false);
  const topicsWrapRef = useRef<HTMLDivElement | null>(null);

  const topics = useMemo(() => buildTopicSummaries(sections), [sections]);
  const sortedTopics = useMemo(() => sortTopics(topics), [topics]);

  useEffect(() => {
    const element = topicsWrapRef.current;
    if (!element || expanded) {
      setHasCollapsedOverflow(false);
      return;
    }

    const nextHasOverflow = element.scrollHeight - element.clientHeight > 1;
    setHasCollapsedOverflow(nextHasOverflow);
  }, [expanded, sortedTopics]);

  if (topics.length <= 1) {
    return null;
  }

  return (
    <section
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      className="relative rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--duck-border-strong)] hover:bg-[var(--duck-surface-soft)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--duck-focus)] sm:p-4"
      onClick={() => setExpanded((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setExpanded((value) => !value);
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--duck-fg)] sm:text-base">
            <Compass
              className="h-3.5 w-3.5 text-[var(--duck-muted)] sm:h-4 sm:w-4"
              aria-hidden="true"
            />
            Topics
          </h2>
        </div>

        <p className="shrink-0 text-[11px] font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
          {topics.length} topics - {sections.length} sections
        </p>
      </div>

      <div
        ref={topicsWrapRef}
        className={`mt-2.5 flex flex-wrap gap-1 transition-[max-height] duration-200 sm:mt-3 sm:gap-1.5 ${expanded ? '' : 'max-h-[46px] overflow-hidden sm:max-h-[70px]'}`}
      >
        {sortedTopics.map((topic) => (
          <span
            key={topic.title}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--duck-muted-strong)] sm:px-2 sm:text-xs"
            title={topic.title}
          >
            <span className="truncate">{topic.title}</span>
            <span className="rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)] px-1 py-px text-[10px] font-semibold text-[var(--duck-muted)] sm:px-1.5">
              {topic.count}
            </span>
          </span>
        ))}
      </div>

      {hasCollapsedOverflow && !expanded ? (
        <div
          className="pointer-events-none absolute right-2.5 bottom-0 left-2.5 h-7 rounded-b-2xl sm:right-3 sm:left-3 sm:h-10"
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in srgb, var(--duck-surface) 0%, transparent), var(--duck-surface) 85%)',
          }}
          aria-hidden="true"
        />
      ) : null}

      {hasCollapsedOverflow && !expanded ? (
        <ChevronDown
          className="pointer-events-none absolute bottom-1 left-1/2 h-3.5 w-3.5 -translate-x-1/2 text-[var(--duck-muted)]/70"
          aria-hidden="true"
        />
      ) : null}
    </section>
  );
}
