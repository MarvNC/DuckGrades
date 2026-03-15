import { describe, expect, test } from "bun:test";
import type { SearchIndex } from "../src/lib/dataClient";
import { searchIndex } from "../src/lib/search";
import { buildSearchItems } from "../src/ui/components/searchModel";

describe("search ranking", () => {
  test("prioritizes exact professor surname over partial non-professor matches", () => {
    const index: SearchIndex = {
      subjects: [{ code: "CHST", title: "Child Studies", popularity: 900 }],
      courses: [{ code: "CHST200", title: "Introduction to Child Studies", subject: "CHST", popularity: 800 }],
      professors: [{ id: "p-childs", name: "Childs, Taylor", popularity: 50 }],
    };

    const ranked = searchIndex(index, "childs");
    const { flattened } = buildSearchItems(ranked, { total: 10 });

    expect(flattened[0]?.section).toBe("Professor");
    expect(flattened[0]?.label).toBe("Childs, Taylor");
  });

  test("prefers exact course code when query looks like a course code", () => {
    const index: SearchIndex = {
      subjects: [
        { code: "CS", title: "Computer Science", popularity: 2000 },
        { code: "CSE", title: "Computer Science and Engineering", popularity: 1200 },
      ],
      courses: [
        { code: "CS210", title: "Computer Science I", subject: "CS", popularity: 1400 },
        { code: "CS211", title: "Computer Science II", subject: "CS", popularity: 1300 },
      ],
      professors: [{ id: "p-casey", name: "Casey Stone", popularity: 900 }],
    };

    const ranked = searchIndex(index, "cs210");
    const { flattened } = buildSearchItems(ranked, { total: 10 });

    expect(flattened[0]?.section).toBe("Course");
    expect(flattened[0]?.label).toBe("CS210");
  });

  test("matches reordered professor names from token overlap", () => {
    const index: SearchIndex = {
      subjects: [{ code: "CHST", title: "Child Studies", popularity: 700 }],
      courses: [{ code: "CHST101", title: "Child Development", subject: "CHST", popularity: 650 }],
      professors: [
        { id: "p-jane-childs", name: "Childs, Jane", popularity: 120 },
        { id: "p-jane-doe", name: "Doe, Jane", popularity: 450 },
      ],
    };

    const ranked = searchIndex(index, "jane childs");
    const { flattened } = buildSearchItems(ranked, { total: 10 });

    expect(flattened[0]?.section).toBe("Professor");
    expect(flattened[0]?.label).toBe("Childs, Jane");
  });
});
