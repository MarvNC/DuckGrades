import { BookOpen, Calendar, GraduationCap, Layers, Library, Users } from 'lucide-react';

export function MetaChip({ chip }: { chip: string }) {
  const normalized = chip.trim().toLowerCase();
  const icon = normalized.endsWith(' sections') ? (
    <Layers className="h-3 w-3" aria-hidden="true" />
  ) : normalized.endsWith(' students') ? (
    <Users className="h-3 w-3" aria-hidden="true" />
  ) : normalized.endsWith(' courses') ? (
    <BookOpen className="h-3 w-3" aria-hidden="true" />
  ) : normalized.endsWith(' professors') || normalized.endsWith(' instructors') ? (
    <GraduationCap className="h-3 w-3" aria-hidden="true" />
  ) : normalized.endsWith(' subjects') ? (
    <Library className="h-3 w-3" aria-hidden="true" />
  ) : normalized.includes('–') ? (
    <Calendar className="h-3 w-3" aria-hidden="true" />
  ) : null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--duck-border)] bg-[var(--duck-surface-soft)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--duck-muted-strong)]">
      {icon}
      <span>{chip}</span>
    </span>
  );
}
