import React, { Suspense } from 'react';

export function DeferredRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="sr-only">Loading page...</div>}>{children}</Suspense>;
}
