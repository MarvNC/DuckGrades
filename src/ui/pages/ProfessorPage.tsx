import { useParams } from "react-router-dom";

export function ProfessorPage() {
  const { id } = useParams();

  return (
    <section className="rounded-3xl border border-[var(--duck-border)] bg-white/80 p-8 shadow-sm">
      <h1 className="text-3xl font-extrabold">Professor {id}</h1>
      <p className="mt-3 text-[var(--duck-muted)]">
        This route is prepared for a professor aggregate card plus per-course section breakdowns using deterministic instructor IDs.
      </p>
    </section>
  );
}
