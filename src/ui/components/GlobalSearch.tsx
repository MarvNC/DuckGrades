import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSearchIndex, prefetchRouteData } from "../../lib/dataClient";
import { searchIndex } from "../../lib/search";

type SearchItem = {
  key: string;
  label: string;
  subtitle: string;
  to: string;
  section: "Subjects" | "Courses" | "Professors";
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<Awaited<ReturnType<typeof getSearchIndex>> | null>(null);

  useEffect(() => {
    if (index) {
      return;
    }
    void getSearchIndex().then(setIndex).catch(() => setIndex({ subjects: [], courses: [], professors: [] }));
  }, [index]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const element = rootRef.current;
      if (element && !element.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  const ranked = useMemo(() => {
    if (!index) {
      return { subjects: [], courses: [], professors: [] };
    }
    return searchIndex(index, query);
  }, [index, query]);

  const items: SearchItem[] = [
    ...ranked.subjects.slice(0, 3).map((subject) => ({
      key: `s-${subject.code}`,
      label: subject.code,
      subtitle: `${subject.popularity} sections`,
      to: `/subject/${subject.code}`,
      section: "Subjects" as const,
    })),
    ...ranked.courses.slice(0, 3).map((course) => ({
      key: `c-${course.code}`,
      label: course.code,
      subtitle: course.title,
      to: `/course/${course.code}`,
      section: "Courses" as const,
    })),
    ...ranked.professors.slice(0, 3).map((professor) => ({
      key: `p-${professor.id}`,
      label: professor.name,
      subtitle: `${professor.popularity} students`,
      to: `/professor/${professor.id}`,
      section: "Professors" as const,
    })),
  ];

  return (
    <div ref={rootRef} className="relative w-full max-w-sm">
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((prev) => (items.length === 0 ? 0 : (prev + 1) % items.length));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((prev) => (items.length === 0 ? 0 : (prev - 1 + items.length) % items.length));
          }
          if (event.key === "Enter") {
            const target = items[active];
            if (target) {
              event.preventDefault();
              navigate(target.to);
              setOpen(false);
            }
          }
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Quick search"
        className="w-full rounded-full border border-[var(--duck-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--duck-fg)] outline-none focus:border-[#86ac67]"
      />

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-11 z-30 rounded-2xl border border-[var(--duck-border)] bg-white p-2 shadow-lg">
          {items.length === 0 ? <p className="px-2 py-2 text-sm text-[var(--duck-muted)]">No matches found.</p> : null}
          {items.map((item, indexValue) => (
            <Link
              key={item.key}
              to={item.to}
              className={`block rounded-lg px-3 py-2 ${active === indexValue ? "bg-[#effadf]" : "hover:bg-[#f5faea]"}`}
              onMouseEnter={() => {
                setActive(indexValue);
                prefetchRouteData(item.to);
              }}
              onFocus={() => {
                setActive(indexValue);
                prefetchRouteData(item.to);
              }}
              onClick={() => setOpen(false)}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--duck-muted)]">{item.section}</p>
              <p className="text-sm font-bold">{item.label}</p>
              <p className="text-xs text-[var(--duck-muted)]">{item.subtitle}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
