const routeModuleCache = new Map<string, Promise<unknown>>();

function cachePrefetch(key: string, loader: () => Promise<unknown>): void {
  if (routeModuleCache.has(key)) {
    return;
  }
  const request = loader().catch(() => {
    routeModuleCache.delete(key);
  });
  routeModuleCache.set(key, request);
}

export function prefetchRouteModule(route: string): void {
  if (route === '/subjects') {
    cachePrefetch('/subjects', () => import('../ui/pages/SubjectsOverviewPage'));
    return;
  }

  if (route === '/analytics') {
    cachePrefetch('/analytics', () => import('../ui/pages/AnalyticsPage'));
    return;
  }

  if (route.startsWith('/subject/')) {
    cachePrefetch('/subject/:code', () => import('../ui/pages/SubjectPage'));
    return;
  }

  if (route.startsWith('/course/')) {
    cachePrefetch('/course/:code', () => import('../ui/pages/CoursePage'));
    return;
  }

  if (route.startsWith('/professor/')) {
    cachePrefetch('/professor/:id', () => import('../ui/pages/ProfessorPage'));
    return;
  }

  cachePrefetch('*', () => import('../ui/pages/NotFoundPage'));
}
