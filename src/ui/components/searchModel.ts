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

export function buildSearchItems(
  ranked: RankedSearchResult,
  limits: { subjects?: number; courses?: number; professors?: number; total?: number } = {}
) {
  const subjects = ranked.subjects.slice(0, limits.subjects ?? 6).map((subject) => ({
    key: `subject:${subject.code}`,
    label: subject.code,
    subtitle: subject.title,
    score: subject.score,
    labelMatchIndexes: subject.labelMatchIndexes,
    subtitleMatchIndexes: subject.subtitleMatchIndexes,
    to: `/subject/${subject.code}`,
    section: 'Subject' as const,
  }));

  const courses = ranked.courses.slice(0, limits.courses ?? 6).map((course) => ({
    key: `course:${course.code}`,
    label: course.code,
    subtitle: course.title,
    score: course.score,
    labelMatchIndexes: course.labelMatchIndexes,
    subtitleMatchIndexes: course.subtitleMatchIndexes,
    to: `/course/${course.code}`,
    section: 'Course' as const,
  }));

  const professors = ranked.professors.slice(0, limits.professors ?? 6).map((professor) => ({
    key: `professor:${professor.id}`,
    label: professor.name,
    subtitle: `${professor.popularity.toLocaleString()} students`,
    score: professor.score,
    labelMatchIndexes: professor.labelMatchIndexes,
    to: `/professor/${professor.id}`,
    section: 'Professor' as const,
  }));

  // Order sections by their top result's score so the most relevant type surfaces first
  const allSections: SearchSection[] = [
    { name: 'Subject' as const, items: subjects },
    { name: 'Course' as const, items: courses },
    { name: 'Professor' as const, items: professors },
  ]
    .filter((s) => s.items.length > 0)
    .sort((a, b) => (b.items[0]?.score ?? 0) - (a.items[0]?.score ?? 0));

  // Build flattened in visual/section order so keyboard navigation matches what's on screen
  const flattenedAll = allSections.flatMap((s) => s.items);
  const flattened = flattenedAll.slice(0, limits.total ?? 18) as SearchItem[];

  // Trim sections to only include items that survived the total cap
  const keptKeys = new Set(flattened.map((i) => i.key));
  const orderedSections = allSections
    .map((s) => ({ ...s, items: s.items.filter((i) => keptKeys.has(i.key)) }))
    .filter((s) => s.items.length > 0);

  return { orderedSections, flattened };
}
