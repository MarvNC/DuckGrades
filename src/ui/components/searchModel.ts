import { useEffect, useMemo, useState } from "react";
import { getSearchIndex } from "../../lib/dataClient";
import { searchIndex } from "../../lib/search";

export type SearchItem = {
  key: string;
  label: string;
  subtitle: string;
  to: string;
  section: "Subjects" | "Courses" | "Professors";
};

const EMPTY_RANKED = { subjects: [], courses: [], professors: [] };

export function useRankedSearch(query: string) {
  const [index, setIndex] = useState<Awaited<ReturnType<typeof getSearchIndex>> | null>(null);

  useEffect(() => {
    if (index) {
      return;
    }
    void getSearchIndex().then(setIndex).catch(() => setIndex({ subjects: [], courses: [], professors: [] }));
  }, [index]);

  return useMemo(() => {
    if (!index) {
      return EMPTY_RANKED;
    }
    return searchIndex(index, query);
  }, [index, query]);
}

export function buildSearchItems(
  ranked: ReturnType<typeof searchIndex>,
  limits: { subjects?: number; courses?: number; professors?: number } = {},
) {
  const subjects = ranked.subjects.slice(0, limits.subjects ?? 6).map((subject) => ({
    key: `subject:${subject.code}`,
    label: subject.code,
    subtitle: `${subject.popularity} sections`,
    to: `/subject/${subject.code}`,
    section: "Subjects" as const,
  }));
  const courses = ranked.courses.slice(0, limits.courses ?? 6).map((course) => ({
    key: `course:${course.code}`,
    label: course.code,
    subtitle: course.title,
    to: `/course/${course.code}`,
    section: "Courses" as const,
  }));
  const professors = ranked.professors.slice(0, limits.professors ?? 6).map((professor) => ({
    key: `professor:${professor.id}`,
    label: professor.name,
    subtitle: `${professor.popularity} students`,
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
