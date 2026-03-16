import { lazy } from 'react';

export const CoursePage = lazy(async () =>
  import('./CoursePage').then((module) => ({ default: module.CoursePage }))
);
export const ProfessorPage = lazy(async () =>
  import('./ProfessorPage').then((module) => ({ default: module.ProfessorPage }))
);
export const SubjectPage = lazy(async () =>
  import('./SubjectPage').then((module) => ({ default: module.SubjectPage }))
);
export const SubjectsOverviewPage = lazy(async () =>
  import('./SubjectsOverviewPage').then((module) => ({
    default: module.SubjectsOverviewPage,
  }))
);
export const NotFoundPage = lazy(async () =>
  import('./NotFoundPage').then((module) => ({ default: module.NotFoundPage }))
);
export const AnalyticsPage = lazy(async () =>
  import('./AnalyticsPage').then((module) => ({ default: module.AnalyticsPage }))
);
