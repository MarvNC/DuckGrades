import type { SearchIndex } from "./dataClient";

type Ranked<T> = T & { score: number };

function rankValue(query: string, candidate: string): number {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  if (c === q) {
    return 100;
  }
  if (c.startsWith(q)) {
    return 70;
  }
  if (c.includes(q)) {
    return 40;
  }
  return 0;
}

export function searchIndex(index: SearchIndex, query: string) {
  const normalized = query.trim();
  if (!normalized) {
    return {
      subjects: [] as Ranked<SearchIndex["subjects"][number]>[],
      courses: [] as Ranked<SearchIndex["courses"][number]>[],
      professors: [] as Ranked<SearchIndex["professors"][number]>[],
    };
  }

  const subjects = index.subjects
    .map((subject) => ({ ...subject, score: rankValue(normalized, subject.code) }))
    .filter((subject) => subject.score > 0)
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity)
    .slice(0, 6);

  const courses = index.courses
    .map((course) => ({ ...course, score: Math.max(rankValue(normalized, course.code), rankValue(normalized, course.title)) }))
    .filter((course) => course.score > 0)
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity)
    .slice(0, 6);

  const professors = index.professors
    .map((professor) => ({ ...professor, score: rankValue(normalized, professor.name) }))
    .filter((professor) => professor.score > 0)
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity)
    .slice(0, 6);

  return { subjects, courses, professors };
}
