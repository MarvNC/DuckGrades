import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './ui/AppLayout';
import { HomePage } from './ui/pages/HomePage';
import { DeferredRoute } from './ui/DeferredRoute';
import {
  CoursePage,
  ProfessorPage,
  SubjectPage,
  SubjectsOverviewPage,
  NotFoundPage,
  AnalyticsPage,
} from './ui/pages/lazyPages';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'subjects',
        element: (
          <DeferredRoute>
            <SubjectsOverviewPage />
          </DeferredRoute>
        ),
      },
      {
        path: 'analytics',
        element: (
          <DeferredRoute>
            <AnalyticsPage />
          </DeferredRoute>
        ),
      },
      {
        path: 'subject/:code',
        element: (
          <DeferredRoute>
            <SubjectPage />
          </DeferredRoute>
        ),
      },
      {
        path: 'course/:code',
        element: (
          <DeferredRoute>
            <CoursePage />
          </DeferredRoute>
        ),
      },
      {
        path: 'professor/:id',
        element: (
          <DeferredRoute>
            <ProfessorPage />
          </DeferredRoute>
        ),
      },
      {
        path: '*',
        element: (
          <DeferredRoute>
            <NotFoundPage />
          </DeferredRoute>
        ),
      },
    ],
  },
]);
