/**
 * Skeleton loading components for DuckGrades
 * Provides animated pulse placeholders that match the card structure
 */

export function EntityCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3.5 shadow-sm">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          <div className="h-6 w-32 animate-pulse rounded-lg bg-[var(--duck-surface-soft)]" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--duck-surface-soft)]" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--duck-surface-soft)]" />
          </div>
        </div>
        <div className="flex w-full flex-col items-end gap-1.5 sm:w-auto sm:pl-2">
          <div className="h-6 w-32 animate-pulse rounded-lg bg-[var(--duck-surface-soft)]" />
          <div className="flex gap-3">
            <div className="h-3 w-12 animate-pulse rounded bg-[var(--duck-surface-soft)]" />
            <div className="h-3 w-12 animate-pulse rounded bg-[var(--duck-surface-soft)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EntityCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }, (_, index) => (
        <EntityCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function SummaryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3.5 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex w-full flex-col items-start gap-1.5 sm:w-auto sm:items-end">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-[var(--duck-surface-soft)]" />
          <div className="flex gap-3">
            <div className="h-3 w-12 animate-pulse rounded bg-[var(--duck-surface-soft)]" />
            <div className="h-3 w-12 animate-pulse rounded bg-[var(--duck-surface-soft)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-[var(--duck-surface-soft)]" />
      <div className="flex flex-wrap gap-1.5">
        <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--duck-surface-soft)]" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--duck-surface-soft)]" />
        <div className="h-5 w-24 animate-pulse rounded-full bg-[var(--duck-surface-soft)]" />
      </div>
      <div className="h-16 w-full animate-pulse rounded-lg bg-[var(--duck-surface-soft)] sm:w-96" />
    </div>
  );
}

export function ChartSkeleton({ height = 250 }: { height?: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-xl bg-[var(--duck-surface-soft)]"
      style={{ height }}
    />
  );
}

export function FilterBarSkeleton() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2">
        <div className="h-9 w-48 animate-pulse rounded-xl bg-[var(--duck-surface-soft)]" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-20 animate-pulse rounded-xl bg-[var(--duck-surface-soft)]" />
        <div className="h-9 w-20 animate-pulse rounded-xl bg-[var(--duck-surface-soft)]" />
      </div>
    </div>
  );
}

export function LoadingText({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--duck-border)] border-t-[var(--duck-accent-strong)]" />
      <p className="text-sm text-[var(--duck-muted)]">{message}</p>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-[var(--duck-danger-border)] bg-[var(--duck-danger-bg)] p-4">
      <p className="text-sm text-[var(--duck-danger-text)]">{message}</p>
    </div>
  );
}

export function EmptyState({ message, suggestion }: { message: string; suggestion?: string }) {
  return (
    <div className="rounded-xl border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] p-6 text-center">
      <p className="text-sm text-[var(--duck-muted-strong)]">{message}</p>
      {suggestion ? <p className="mt-1 text-xs text-[var(--duck-muted)]">{suggestion}</p> : null}
    </div>
  );
}
