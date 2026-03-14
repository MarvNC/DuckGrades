import { useParams } from "react-router-dom";

export function SubjectPage() {
  const { code } = useParams();

  return (
    <section className="rounded-3xl border border-[var(--duck-border)] bg-white/80 p-8 shadow-sm">
      <h1 className="text-3xl font-extrabold">{(code ?? "SUBJ").toUpperCase()} Subject View</h1>
      <p className="mt-3 text-[var(--duck-muted)]">
        This route is wired for subject-level aggregate cards, URL-persisted filters, and virtualized course rows per the static spec.
      </p>
    </section>
  );
}
