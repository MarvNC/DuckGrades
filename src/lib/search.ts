import type { SearchIndex } from "./dataClient";
import fuzzysort from "fuzzysort";

type MatchIndexes = number[];

export type RankedSubject = SearchIndex["subjects"][number] & {
  score: number;
  labelMatchIndexes: MatchIndexes;
  subtitleMatchIndexes: MatchIndexes;
};

export type RankedCourse = SearchIndex["courses"][number] & {
  score: number;
  labelMatchIndexes: MatchIndexes;
  subtitleMatchIndexes: MatchIndexes;
};

export type RankedProfessor = SearchIndex["professors"][number] & {
  score: number;
  labelMatchIndexes: MatchIndexes;
};

export type RankedSearchResult = {
  subjects: RankedSubject[];
  courses: RankedCourse[];
  professors: RankedProfessor[];
};

export const EMPTY_RANKED_RESULTS: RankedSearchResult = {
  subjects: [],
  courses: [],
  professors: [],
};

function normalizeLoose(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getIndexes(result: { indexes: ReadonlyArray<number> } | undefined): number[] {
  if (!result) {
    return [];
  }
  return [...result.indexes];
}

function getFuzzyThreshold(query: string): number {
  if (query.length <= 2) {
    return 0.4;
  }
  if (query.length <= 4) {
    return 0.3;
  }
  return 0.2;
}

function applyPopularityBoost(score: number, popularity: number): number {
  const popularityBoost = Math.log10(popularity + 1) * 0.025;
  return score + popularityBoost;
}

export function searchIndex(index: SearchIndex, query: string) {
  const normalized = query.trim();
  if (!normalized) {
    return EMPTY_RANKED_RESULTS;
  }

  const threshold = getFuzzyThreshold(normalized);

  const subjects = fuzzysort
    .go(normalized, index.subjects, {
      keys: [(subject) => subject.code, (subject) => subject.title, (subject) => normalizeLoose(subject.code), (subject) => normalizeLoose(subject.title)],
      threshold,
      limit: 6,
      scoreFn: (result) => applyPopularityBoost(result.score, result.obj.popularity),
    })
    .map((result) => ({
      ...result.obj,
      score: result.score,
      labelMatchIndexes: getIndexes(result[0]),
      subtitleMatchIndexes: getIndexes(result[1]),
    }))
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity);

  const courses = fuzzysort
    .go(normalized, index.courses, {
      keys: [
        (course) => course.code,
        (course) => course.title,
        (course) => normalizeLoose(course.code),
        (course) => normalizeLoose(course.title),
      ],
      threshold,
      limit: 6,
      scoreFn: (result) => applyPopularityBoost(result.score, result.obj.popularity),
    })
    .map((result) => ({
      ...result.obj,
      score: result.score,
      labelMatchIndexes: getIndexes(result[0]),
      subtitleMatchIndexes: getIndexes(result[1]),
    }))
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity);

  const professors = fuzzysort
    .go(normalized, index.professors, {
      keys: [(professor) => professor.name, (professor) => normalizeLoose(professor.name)],
      threshold,
      limit: 6,
      scoreFn: (result) => applyPopularityBoost(result.score, result.obj.popularity),
    })
    .map((result) => ({
      ...result.obj,
      score: result.score,
      labelMatchIndexes: getIndexes(result[0]),
    }))
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity);

  return { subjects, courses, professors } satisfies RankedSearchResult;
}
