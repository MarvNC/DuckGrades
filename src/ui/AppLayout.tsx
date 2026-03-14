import { Link, Outlet, useLocation } from "react-router-dom";
import { GlobalSearch } from "./components/GlobalSearch";

export function AppLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="shell-bg min-h-screen">
      {isHome ? null : (
        <header className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="brand">
              <span className="brand-duck">Duck</span>
              <span className="brand-grades">Grades</span>
            </Link>
            <GlobalSearch />
            <Link
              to="/subject/CS"
              className="inline-flex items-center rounded-lg border border-[var(--duck-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--duck-fg)] transition hover:bg-[#f9fbf5]"
            >
              Subjects
            </Link>
          </div>
        </header>
      )}
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
