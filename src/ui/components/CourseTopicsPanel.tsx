import { ChevronDown, Compass } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SectionRow } from '../../lib/dataClient';

type TopicSummary = {
  title: string;
  count: number;
};

const TOPIC_PREVIEW_LIMIT = 8;

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

  const topics = useMemo(() => buildTopicSummaries(sections), [sections]);
  const sortedTopics = useMemo(() => sortTopics(topics), [topics]);

  const previewTopics = useMemo(() => sortedTopics.slice(0, TOPIC_PREVIEW_LIMIT), [sortedTopics]);
  const displayedTopics = expanded ? sortedTopics : previewTopics;

  if (topics.length <= 1) {
    return null;
  }

  return (
    <section
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      className="relative rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--duck-border-strong)] hover:bg-[var(--duck-surface-soft)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--duck-focus)] sm:p-4"
      onClick={() => setExpanded((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setExpanded((value) => !value);
        }
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-base font-bold text-[var(--duck-fg)]">
            <Compass className="h-4 w-4 text-[var(--duck-muted)]" aria-hidden="true" />
            Section topics
          </h2>
          <p className="mt-1 text-xs font-semibold tracking-[0.08em] text-[var(--duck-muted)] uppercase">
            {topics.length} unique topics across {sections.length} sections
          </p>
        </div>

        <p className="text-xs text-[var(--duck-muted)]">Most common first</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {displayedTopics.map((topic) => (
          <span
            key={topic.title}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-2 py-0.5 text-xs font-medium text-[var(--duck-muted-strong)]"
            title={topic.title}
          >
            <span className="truncate">{topic.title}</span>
            <span className="rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface)] px-1.5 py-px text-[10px] font-semibold text-[var(--duck-muted)]">
              {topic.count}
            </span>
          </span>
        ))}
      </div>

      {topics.length > TOPIC_PREVIEW_LIMIT && !expanded ? (
        <ChevronDown
          className="pointer-events-none absolute bottom-1 left-1/2 h-3.5 w-3.5 -translate-x-1/2 text-[var(--duck-muted)]/70"
          aria-hidden="true"
        />
      ) : null}
    </section>
  );
}
