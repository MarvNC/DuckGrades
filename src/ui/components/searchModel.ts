import { useEffect, useRef, useState } from "react";
import { rankSearchQuery, warmSearchWorker } from "../../lib/searchWorkerClient";
import { EMPTY_RANKED_RESULTS, type RankedSearchResult } from "../../lib/search";

export type SearchItem = {
  key: string;
  label: string;
  subtitle: string;
  labelMatchIndexes?: number[];
  subtitleMatchIndexes?: number[];
  to: string;
  section: "Subjects" | "Courses" | "Professors";
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
  limits: { subjects?: number; courses?: number; professors?: number } = {},
) {
  const subjects = ranked.subjects.slice(0, limits.subjects ?? 6).map((subject) => ({
    key: `subject:${subject.code}`,
    label: subject.code,
    subtitle: subject.title,
    labelMatchIndexes: subject.labelMatchIndexes,
    subtitleMatchIndexes: subject.subtitleMatchIndexes,
    to: `/subject/${subject.code}`,
    section: "Subjects" as const,
  }));
  const courses = ranked.courses.slice(0, limits.courses ?? 6).map((course) => ({
    key: `course:${course.code}`,
    label: course.code,
    subtitle: course.title,
    labelMatchIndexes: course.labelMatchIndexes,
    subtitleMatchIndexes: course.subtitleMatchIndexes,
    to: `/course/${course.code}`,
    section: "Courses" as const,
  }));
  const professors = ranked.professors.slice(0, limits.professors ?? 6).map((professor) => ({
    key: `professor:${professor.id}`,
    label: professor.name,
    subtitle: `${professor.popularity} students`,
    labelMatchIndexes: professor.labelMatchIndexes,
    to: `/professor/${professor.id}`,
    section: "Professors" as const,
  }));

  const grouped = {
    Subjects: subjects,
    Courses: courses,
    Professors: professors,
  };

  return {
    grouped,
    flattened: [...subjects, ...courses, ...professors] as SearchItem[],
  };
}
