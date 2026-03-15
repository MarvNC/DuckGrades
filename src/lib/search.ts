import type { SearchIndex } from './dataClient';
import fuzzysort from 'fuzzysort';

type MatchIndexes = number[];

const RESULT_LIMIT_PER_TYPE = 15;
const CANDIDATE_LIMIT_PER_VARIANT = 24;

export type RankedSubject = SearchIndex['subjects'][number] & {
  score: number;
  labelMatchIndexes: MatchIndexes;
  subtitleMatchIndexes: MatchIndexes;
};

export type RankedCourse = SearchIndex['courses'][number] & {
  score: number;
  labelMatchIndexes: MatchIndexes;
  subtitleMatchIndexes: MatchIndexes;
};

export type RankedProfessor = SearchIndex['professors'][number] & {
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

type SearchKind = 'subject' | 'course' | 'professor';

type QueryProfile = {
  query: string;
  lower: string;
  loose: string;
  tokens: string[];
  singularTokens: string[];
  variants: string[];
  looksLikeCourseCode: boolean;
  looksLikeSubjectCode: boolean;
  looksLikeName: boolean;
};

type FuzzyResultLike<T> = {
  obj: T;
  score: number;
  [index: number]:
    | {
        indexes: ReadonlyArray<number>;
      }
    | undefined;
};

type Candidate<T> = {
  obj: T;
  fuzzyScore: number;
  labelMatchIndexes: MatchIndexes;
  subtitleMatchIndexes: MatchIndexes;
};

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeLoose(value: string): string {
  return normalizeForComparison(value).replace(/[^a-z0-9]+/g, '');
}

function tokenize(value: string): string[] {
  return normalizeForComparison(value)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function singularizeToken(token: string): string {
  if (token.length <= 3) {
    return token;
  }
  if (token.endsWith('ies') && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith('es') && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith('s')) {
    return token.slice(0, -1);
  }
  return token;
}

function createQueryProfile(query: string): QueryProfile {
  const trimmed = query.trim();
  const lower = normalizeForComparison(trimmed);
  const loose = normalizeLoose(trimmed);
  const tokens = tokenize(trimmed);
  const singularTokens = [...new Set(tokens.map((token) => singularizeToken(token)))];
  const compact = lower.replace(/\s+/g, '');
  const singularVariant = singularTokens.join(' ');
  const variants = [trimmed];

  if (singularVariant && singularVariant !== lower) {
    variants.push(singularVariant);
  }
  if (loose && loose !== compact) {
    variants.push(loose);
  }

  const looksLikeCourseCode =
    /^[a-z]{2,5}\s*-?\s*\d{2,4}[a-z]?$/i.test(trimmed) || /^[a-z]{2,5}\d{2,4}[a-z]?$/i.test(loose);
  const looksLikeSubjectCode =
    !looksLikeCourseCode && tokens.length === 1 && /^[a-z]{2,6}$/i.test(compact);
  const looksLikeName = !/\d/.test(trimmed) && !looksLikeSubjectCode && tokens.length >= 1;

  return {
    query: trimmed,
    lower,
    loose,
    tokens,
    singularTokens,
    variants,
    looksLikeCourseCode,
    looksLikeSubjectCode,
    looksLikeName,
  };
}

function getIndexes(result: { indexes: ReadonlyArray<number> } | undefined): number[] {
  if (!result) {
    return [];
  }
  return [...result.indexes];
}

function countTokenMatches(targetTokens: Set<string>, queryTokens: readonly string[]): number {
  let matches = 0;
  for (const token of queryTokens) {
    if (targetTokens.has(token)) {
      matches += 1;
    }
  }
  return matches;
}

function scorePrimaryText(profile: QueryProfile, value: string): number {
  if (!value) {
    return 0;
  }

  const lower = normalizeForComparison(value);
  const loose = normalizeLoose(value);
  const tokens = new Set(tokenize(value));
  const tokenMatchCount = countTokenMatches(tokens, profile.tokens);
  const singularMatchCount = countTokenMatches(tokens, profile.singularTokens);

  let score = 0;

  if (profile.loose && loose === profile.loose) {
    score += 7;
  }
  if (profile.lower && lower === profile.lower) {
    score += 5;
  }
  if (profile.lower && lower.startsWith(profile.lower)) {
    score += 2.5;
  }
  if (profile.loose && loose.startsWith(profile.loose)) {
    score += 1.75;
  }
  if (profile.lower && lower.includes(profile.lower)) {
    score += 1.2;
  }
  if (profile.loose && loose.includes(profile.loose)) {
    score += 1;
  }

  if (profile.tokens.length > 0 && tokenMatchCount === profile.tokens.length) {
    score += 3;
  } else {
    score += tokenMatchCount * 0.8;
  }

  if (profile.singularTokens.length > 0 && singularMatchCount === profile.singularTokens.length) {
    score += 0.7;
  } else {
    score += singularMatchCount * 0.2;
  }

  return score;
}

function scoreSecondaryText(profile: QueryProfile, value: string): number {
  if (!value) {
    return 0;
  }

  const lower = normalizeForComparison(value);
  const loose = normalizeLoose(value);
  const tokens = new Set(tokenize(value));
  const tokenMatchCount = countTokenMatches(tokens, profile.tokens);

  let score = 0;
  if (profile.lower && lower.startsWith(profile.lower)) {
    score += 0.75;
  }
  if (profile.lower && lower.includes(profile.lower)) {
    score += 0.6;
  }
  if (profile.loose && loose.includes(profile.loose)) {
    score += 0.5;
  }

  if (profile.tokens.length > 0 && tokenMatchCount === profile.tokens.length) {
    score += 1.6;
  } else {
    score += tokenMatchCount * 0.4;
  }

  return score;
}

function getIntentBoost(profile: QueryProfile, kind: SearchKind): number {
  if (profile.looksLikeCourseCode) {
    if (kind === 'course') {
      return 1.8;
    }
    return -0.3;
  }

  if (profile.looksLikeSubjectCode) {
    if (kind === 'subject') {
      return 1.5;
    }
    if (kind === 'course') {
      return 0.4;
    }
    return -0.2;
  }

  if (profile.looksLikeName && kind === 'professor') {
    return 0.8;
  }

  return 0;
}

function applyPopularityBoost(score: number, popularity: number): number {
  return score + Math.log10(popularity + 1) * 0.06;
}

function collectBestCandidates<T>(params: {
  items: readonly T[];
  queryVariants: readonly string[];
  threshold: number;
  keys: Array<(item: T) => string>;
  keyForMap: (item: T) => string;
}): Candidate<T>[] {
  const bestByKey = new Map<string, Candidate<T>>();

  for (const variant of params.queryVariants) {
    const fuzzyResults = fuzzysort.go(variant, params.items as T[], {
      keys: params.keys,
      threshold: params.threshold,
      limit: CANDIDATE_LIMIT_PER_VARIANT,
    }) as ReadonlyArray<FuzzyResultLike<T>>;

    for (const result of fuzzyResults) {
      const mapKey = params.keyForMap(result.obj);
      const candidate: Candidate<T> = {
        obj: result.obj,
        fuzzyScore: result.score,
        labelMatchIndexes: getIndexes(result[0]),
        subtitleMatchIndexes: getIndexes(result[1]),
      };

      const current = bestByKey.get(mapKey);
      if (!current || candidate.fuzzyScore > current.fuzzyScore) {
        bestByKey.set(mapKey, candidate);
      }
    }
  }

  return [...bestByKey.values()];
}

function getFuzzyThreshold(query: string): number {
  if (query.length <= 2) {
    return 0.45;
  }
  if (query.length <= 4) {
    return 0.32;
  }
  return 0.22;
}

export function searchIndex(index: SearchIndex, query: string) {
  const profile = createQueryProfile(query);
  if (!profile.query) {
    return EMPTY_RANKED_RESULTS;
  }

  const threshold = getFuzzyThreshold(profile.query);

  const subjectCandidates = collectBestCandidates({
    items: index.subjects,
    queryVariants: profile.variants,
    threshold,
    keys: [
      (subject) => subject.code,
      (subject) => subject.title,
      (subject) => normalizeLoose(subject.code),
      (subject) => normalizeLoose(subject.title),
    ],
    keyForMap: (subject) => subject.code,
  });

  const courseCandidates = collectBestCandidates({
    items: index.courses,
    queryVariants: profile.variants,
    threshold,
    keys: [
      (course) => course.code,
      (course) => course.title,
      (course) => course.subject,
      (course) => normalizeLoose(course.code),
      (course) => normalizeLoose(course.title),
      (course) => normalizeLoose(course.subject),
    ],
    keyForMap: (course) => course.code,
  });

  const professorCandidates = collectBestCandidates({
    items: index.professors,
    queryVariants: profile.variants,
    threshold,
    keys: [(professor) => professor.name, (professor) => normalizeLoose(professor.name)],
    keyForMap: (professor) => professor.id,
  });

  const subjects = subjectCandidates
    .map((candidate) => ({
      ...candidate.obj,
      score: applyPopularityBoost(
        candidate.fuzzyScore +
          scorePrimaryText(profile, candidate.obj.code) +
          scoreSecondaryText(profile, candidate.obj.title) +
          getIntentBoost(profile, 'subject'),
        candidate.obj.popularity
      ),
      labelMatchIndexes: candidate.labelMatchIndexes,
      subtitleMatchIndexes: candidate.subtitleMatchIndexes,
    }))
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity);
  const courses = courseCandidates
    .map((candidate) => ({
      ...candidate.obj,
      score: applyPopularityBoost(
        candidate.fuzzyScore +
          scorePrimaryText(profile, candidate.obj.code) +
          scoreSecondaryText(profile, `${candidate.obj.title} ${candidate.obj.subject}`) +
          getIntentBoost(profile, 'course'),
        candidate.obj.popularity
      ),
      labelMatchIndexes: candidate.labelMatchIndexes,
      subtitleMatchIndexes: candidate.subtitleMatchIndexes,
    }))
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity);

  const professors = professorCandidates
    .map((candidate) => ({
      ...candidate.obj,
      score: applyPopularityBoost(
        candidate.fuzzyScore +
          scorePrimaryText(profile, candidate.obj.name) +
          getIntentBoost(profile, 'professor'),
        candidate.obj.popularity
      ),
      labelMatchIndexes: candidate.labelMatchIndexes,
    }))
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity);

  return {
    subjects: subjects.slice(0, RESULT_LIMIT_PER_TYPE),
    courses: courses.slice(0, RESULT_LIMIT_PER_TYPE),
    professors: professors.slice(0, RESULT_LIMIT_PER_TYPE),
  } satisfies RankedSearchResult;
}
