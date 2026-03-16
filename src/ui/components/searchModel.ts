import { useEffect, useRef, useState } from 'react';
import { rankSearchQuery, warmSearchWorker } from '../../lib/searchWorkerClient';
import { EMPTY_RANKED_RESULTS, type RankedSearchResult } from '../../lib/search';

export type SearchItem = {
  key: string;
  label: string;
  subtitle: string;
  score: number;
  labelMatchIndexes?: number[];
  subtitleMatchIndexes?: number[];
  to: string;
  section: 'Subject' | 'Course' | 'Professor';
  /** Total students (non-W) for courses and professors; undefined for subjects. */
  popularity?: number;
};

export type SearchSection = {
  name: 'Subject' | 'Course' | 'Professor';
  items: SearchItem[];
};

export function useRankedSearch(query: string) {
  const [ranked, setRanked] = useState<RankedSearchResult>(EMPTY_RANKED_RESULTS);
  const requestCounter = useRef(0);

  useEffect(() => {
    warmSearchWorker();
  }, []);

  useEffect(() => {
    const currentRequest = ++requestCounter.current;
    if (!query.trim()) {
      setRanked(EMPTY_RANKED_RESULTS);
      return;
    }

    void rankSearchQuery(query)
      .then((result) => {
        if (currentRequest !== requestCounter.current) {
          return;
        }
        setRanked(result);
      })
      .catch(() => {
        if (currentRequest !== requestCounter.current) {
          return;
        }
        setRanked(EMPTY_RANKED_RESULTS);
      });
  }, [query]);

  return ranked;
}

export function buildSearchItems(ranked: RankedSearchResult, limits: { total?: number } = {}) {
  const subjects = ranked.subjects.map((subject) => ({
    key: `subject:${subject.code}`,
    label: subject.code,
    subtitle: subject.title,
    score: subject.score,
    labelMatchIndexes: subject.labelMatchIndexes,
    subtitleMatchIndexes: subject.subtitleMatchIndexes,
    to: `/subject/${subject.code}`,
    section: 'Subject' as const,
  }));

  const courses = ranked.courses.map((course) => {
    const baseTo = `/course/${course.code}`;
    const to = course.matchedSectionTitle
      ? `${baseTo}?topic=${encodeURIComponent(course.matchedSectionTitle)}`
      : baseTo;
    return {
      key: `course:${course.code}`,
      label: course.code,
      subtitle: course.matchedSectionTitle ?? course.title,
      score: course.score,
      labelMatchIndexes: course.labelMatchIndexes,
      // When a matched section title is shown as subtitle, use its pre-adjusted highlight
      // indexes instead of the generic subtitleMatchIndexes (which point into course.title).
      subtitleMatchIndexes: course.matchedSectionTitle
        ? course.sectionTitleMatchIndexes
        : course.subtitleMatchIndexes,
      to,
      section: 'Course' as const,
      popularity: course.popularity,
    };
  });

  const professors = ranked.professors.map((professor) => ({
    key: `professor:${professor.id}`,
    label: professor.name,
    subtitle: professor.name,
    score: professor.score,
    labelMatchIndexes: professor.labelMatchIndexes,
    to: `/professor/${professor.id}`,
    section: 'Professor' as const,
    popularity: professor.popularity,
  }));

  // Merge all candidates into one pool and take the global top N by score
  const flattened = [...subjects, ...courses, ...professors]
    .sort((a, b) => b.score - a.score)
    .slice(0, limits.total ?? 15) as SearchItem[];

  // Group survivors into sections ordered by each section's best result
  const bySection = new Map<SearchSection['name'], SearchItem[]>();
  for (const item of flattened) {
    const bucket = bySection.get(item.section) ?? [];
    bucket.push(item);
    bySection.set(item.section, bucket);
  }

  const sectionOrder: SearchSection['name'][] = ['Subject', 'Course', 'Professor'];
  const orderedSections: SearchSection[] = sectionOrder
    .filter((name) => bySection.has(name))
    .map((name) => ({ name, items: bySection.get(name)! }))
    .sort((a, b) => (b.items[0]?.score ?? 0) - (a.items[0]?.score ?? 0));

  return { orderedSections, flattened };
}
