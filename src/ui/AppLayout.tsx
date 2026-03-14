import { Link, Outlet, useLocation } from "react-router-dom";
import { GlobalSearch } from "./components/GlobalSearch";

export function AppLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="shell-bg relative min-h-screen">
      <div className="home-grid-bg" aria-hidden="true" />
      <div className="home-bg-overlay" aria-hidden="true" />
      {isHome ? null : (
        <header className="relative z-30 mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="brand">
              <span className="brand-duck">Duck</span>
              <span className="brand-grades">Grades</span>
            </Link>
            <GlobalSearch />
            <Link
              to="/subject/CS"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-[#124734]"
            >
              Subjects
            </Link>
          </div>
        </header>
      )}
      <main className={`relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-8 ${isHome ? "" : "pb-16"}`}>
        <Outlet />
      </main>
    </div>
  );
}
