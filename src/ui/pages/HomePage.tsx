import { Link } from "react-router-dom";

const quickLinks = [
  { title: "Computer Science", subtitle: "53 courses", to: "/subject/CS" },
  { title: "Math 251", subtitle: "Differential Calculus", to: "/course/MATH-251" },
  { title: "Unknown Instructor", subtitle: "No-id fallback profile", to: "/professor/unknown" },
];

export function HomePage() {
  return (
    <section className="space-y-8">
      <div className="hero-card relative overflow-hidden rounded-3xl border border-[var(--duck-border)] p-7 shadow-lg sm:p-10">
        <div className="hero-glow" aria-hidden="true" />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--duck-muted)]">University of Oregon grade explorer</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
          Search-first grade insights, rebuilt for static hosting.
        </h1>
        <p className="mt-4 max-w-xl text-sm text-[var(--duck-muted)] sm:text-base">
          DuckGrades is tuned for free, long-term hosting on GitHub Pages and Cloudflare Pages with JSON shards and route-level fetches.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/subject/CS" className="pill-button">
            Browse by subject
          </Link>
          <Link to="/course/CS-122" className="pill-button pill-button-secondary">
            Open a sample course
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-2xl border border-[var(--duck-border)] bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold text-[var(--duck-muted)]">{item.subtitle}</p>
            <p className="mt-2 text-xl font-bold text-[var(--duck-fg)]">{item.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
