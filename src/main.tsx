import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './ui/AppLayout';
import { HomePage } from './ui/pages/HomePage';
import { CoursePage } from './ui/pages/CoursePage';
import { ProfessorPage } from './ui/pages/ProfessorPage';
import { SubjectPage } from './ui/pages/SubjectPage';
import { SubjectsOverviewPage } from './ui/pages/SubjectsOverviewPage';
import { NotFoundPage } from './ui/pages/NotFoundPage';
import { AnalyticsPage } from './ui/pages/AnalyticsPage';
import './styles.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'subjects', element: <SubjectsOverviewPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'subject/:code', element: <SubjectPage /> },
      { path: 'course/:code', element: <CoursePage /> },
      { path: 'professor/:id', element: <ProfessorPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
