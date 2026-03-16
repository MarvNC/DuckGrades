import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './ui/AppLayout';
import { HomePage } from './ui/pages/HomePage';
import './styles.css';

const CoursePage = lazy(async () =>
  import('./ui/pages/CoursePage').then((module) => ({ default: module.CoursePage }))
);
const ProfessorPage = lazy(async () =>
  import('./ui/pages/ProfessorPage').then((module) => ({ default: module.ProfessorPage }))
);
const SubjectPage = lazy(async () =>
  import('./ui/pages/SubjectPage').then((module) => ({ default: module.SubjectPage }))
);
const SubjectsOverviewPage = lazy(async () =>
  import('./ui/pages/SubjectsOverviewPage').then((module) => ({
    default: module.SubjectsOverviewPage,
  }))
);
const NotFoundPage = lazy(async () =>
  import('./ui/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage }))
);
const AnalyticsPage = lazy(async () =>
  import('./ui/pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage }))
);

function DeferredRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="sr-only">Loading page...</div>}>{children}</Suspense>;
}

const router = createBrowserRouter([
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
