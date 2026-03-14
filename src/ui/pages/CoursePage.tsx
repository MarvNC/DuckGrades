import { Link, useParams } from "react-router-dom";

export function CoursePage() {
  const { code } = useParams();

  return (
    <section className="space-y-5 rounded-3xl border border-[var(--duck-border)] bg-white/80 p-8 shadow-sm">
      <Link className="inline-flex rounded-full border border-[var(--duck-border)] px-3 py-1 text-sm font-semibold" to="/subject/CS">
        Back to subject
      </Link>
      <h1 className="text-3xl font-extrabold">{(code ?? "COURSE").toUpperCase()} Course View</h1>
      <p className="text-[var(--duck-muted)]">
        This page is ready for course-level aggregate metrics, instructor cards, and collapsible section details.
      </p>
    </section>
  );
}
