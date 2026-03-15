import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { prefetchRouteData, type Aggregate } from "../../lib/dataClient";
import { formatGradeCode, formatGradeStat } from "../../lib/grades";
import { GradeDistributionStrip } from "./GradeDistributionStrip";

type EntityAggregateCardProps = {
  title: string;
  titleHref?: string;
  subtitle?: string;
  inlineMetaChips?: string[];
  aggregate: Aggregate | null | undefined;
  distributionSize?: "sm" | "md";
  showStudentCountInDistribution?: boolean;
  children?: ReactNode;
};

export function EntityAggregateCard({
  title,
  titleHref,
  subtitle,
  inlineMetaChips,
  aggregate,
  distributionSize = "sm",
  showStudentCountInDistribution = false,
  children,
}: EntityAggregateCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--duck-border)] bg-[var(--duck-surface)] p-3.5 shadow-sm">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {titleHref ? (
              <Link
                to={titleHref}
                className="text-lg font-bold tracking-tight text-[var(--duck-fg)] hover:underline"
                onMouseEnter={() => prefetchRouteData(titleHref)}
                onFocus={() => prefetchRouteData(titleHref)}
              >
                {title}
              </Link>
            ) : (
              <p className="text-lg font-bold tracking-tight text-[var(--duck-fg)]">{title}</p>
            )}
            {(inlineMetaChips ?? []).map((chip) => (
              <span key={chip} className="rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--duck-muted-strong)]">
                {chip}
              </span>
            ))}
          </div>

          {subtitle ? <p className="mt-1 truncate text-sm text-[var(--duck-muted)]">{subtitle}</p> : null}

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-[var(--duck-muted)]">
            <span>
              <span className="uppercase tracking-[0.08em] text-[var(--duck-muted)]">Mean</span> {formatGradeStat(aggregate?.mean)}
            </span>
            <span>
              <span className="uppercase tracking-[0.08em] text-[var(--duck-muted)]">Median</span> {formatGradeStat(aggregate?.median)}
            </span>
            <span>
              <span className="uppercase tracking-[0.08em] text-[var(--duck-muted)]">Mode</span> {formatGradeCode(aggregate?.mode)}
            </span>
          </div>
        </div>

        <div className="flex w-full justify-end sm:w-auto sm:pl-2">
          <GradeDistributionStrip aggregate={aggregate} size={distributionSize} showStudentCount={showStudentCountInDistribution} />
        </div>
      </div>

      {children ? <div className="mt-2">{children}</div> : null}
    </article>
  );
}
