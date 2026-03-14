import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Aggregate } from "../../lib/dataClient";
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
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {titleHref ? (
              <Link to={titleHref} className="text-lg font-bold tracking-tight text-[var(--duck-fg)] hover:underline">
                {title}
              </Link>
            ) : (
              <p className="text-lg font-bold tracking-tight text-[var(--duck-fg)]">{title}</p>
            )}
            {(inlineMetaChips ?? []).map((chip) => (
              <span key={chip} className="rounded-full border border-slate-200/80 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {chip}
              </span>
            ))}
          </div>

          {subtitle ? <p className="mt-1 truncate text-sm text-slate-600">{subtitle}</p> : null}

          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Mean {formatGradeStat(aggregate?.mean)}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Median {formatGradeStat(aggregate?.median)}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">Mode {formatGradeCode(aggregate?.mode)}</span>
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
