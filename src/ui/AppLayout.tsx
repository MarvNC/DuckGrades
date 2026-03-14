import { Link, NavLink, Outlet } from "react-router-dom";
import { GlobalSearch } from "./components/GlobalSearch";

const navItems = [
  { to: "/", label: "Search" },
  { to: "/subject/CS", label: "Subjects" },
  { to: "/course/CS-122", label: "Courses" },
  { to: "/professor/unknown", label: "Professors" },
];

export function AppLayout() {
  return (
    <div className="shell-bg min-h-screen">
      <header className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="brand">
            <span className="brand-duck">Duck</span>
            <span className="brand-grades">Grades</span>
          </Link>
          <GlobalSearch />
          <nav className="flex items-center gap-2 rounded-full border border-[var(--duck-border)] bg-white/75 p-1 shadow-sm backdrop-blur-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[var(--duck-primary)] text-[var(--duck-fg)]"
                      : "text-[var(--duck-muted)] hover:text-[var(--duck-fg)]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
