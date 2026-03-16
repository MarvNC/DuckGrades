import { describe, expect, test } from 'bun:test';
import type { SearchIndex } from '../src/lib/dataClient';
import { searchIndex } from '../src/lib/search';
import { buildSearchItems } from '../src/ui/components/searchModel';

describe('search highlighting', () => {
  test('highlights label when query matches course code directly', () => {
    const index: SearchIndex = {
      subjects: [],
      courses: [{ code: 'CS210', title: 'Computer Science I', subject: 'CS', popularity: 100 }],
      professors: [],
    };

    const ranked = searchIndex(index, 'cs210');
    const { flattened } = buildSearchItems(ranked, { total: 5 });
    const course = flattened.find((item) => item.label === 'CS210');

    expect(course).toBeDefined();
    // All characters in 'CS210' should be highlighted (indexes 0-4)
    expect(course?.labelMatchIndexes).toEqual([0, 1, 2, 3, 4]);
  });

  test('highlights label when query omits separator in course code', () => {
    const index: SearchIndex = {
      subjects: [],
      courses: [{ code: 'SPAN-101', title: 'Spanish I', subject: 'SPAN', popularity: 100 }],
      professors: [],
    };

    const ranked = searchIndex(index, 'span101');
    const { flattened } = buildSearchItems(ranked, { total: 5 });
    const course = flattened.find((item) => item.label === 'SPAN-101');

    expect(course).toBeDefined();
    // S(0)P(1)A(2)N(3) -(4 skipped) 1(5)0(6)1(7) should all be highlighted
    const indexes = course?.labelMatchIndexes ?? [];
    expect(indexes).not.toHaveLength(0);
    // Dash at index 4 should NOT be in the highlight
    expect(indexes).not.toContain(4);
    // All alphanumeric chars should be highlighted
    expect(indexes).toContain(0); // S
    expect(indexes).toContain(1); // P
    expect(indexes).toContain(2); // A
    expect(indexes).toContain(3); // N
    expect(indexes).toContain(5); // 1
    expect(indexes).toContain(6); // 0
    expect(indexes).toContain(7); // 1
  });

  test('highlights subtitle when matchedSectionTitle is displayed instead of course title', () => {
    const index: SearchIndex = {
      subjects: [],
      courses: [
        {
          code: 'HIST200',
          title: 'Topics in History',
          subject: 'HIST',
          sectionTitles: 'Cantonese | Japanese Culture',
          popularity: 100,
        },
      ],
      professors: [],
    };

    const ranked = searchIndex(index, 'japanese');
    const { flattened } = buildSearchItems(ranked, { total: 5 });
    const course = flattened.find((item) => item.label === 'HIST200');

    expect(course).toBeDefined();
    // subtitle should be 'Japanese Culture' (the matched section title)
    expect(course?.subtitle).toBe('Japanese Culture');
    // subtitleMatchIndexes should point into 'Japanese Culture', not into 'Topics in History'
    // 'Japanese' = J(0)a(1)p(2)a(3)n(4)e(5)s(6)e(7)
    const indexes = course?.subtitleMatchIndexes ?? [];
    expect(indexes).not.toHaveLength(0);
    // The indexes must be valid for 'Japanese Culture' (max index < 16)
    const subtitle = course?.subtitle ?? '';
    for (const idx of indexes) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(subtitle.length);
    }
    // 'Japanese' chars should be highlighted
    expect(indexes).toContain(0); // J
    expect(indexes).toContain(1); // a
    expect(indexes).toContain(2); // p
  });

  test('subtitle match indexes are valid positions within displayed subtitle string', () => {
    const index: SearchIndex = {
      subjects: [],
      courses: [
        {
          code: 'LANG300',
          title: 'Special Topics',
          subject: 'LANG',
          sectionTitles: 'Greek Mythology | Roman History | Medieval Studies',
          popularity: 100,
        },
      ],
      professors: [],
    };

    const ranked = searchIndex(index, 'roman history');
    const { flattened } = buildSearchItems(ranked, { total: 5 });
    const course = flattened.find((item) => item.label === 'LANG300');

    expect(course).toBeDefined();
    expect(course?.subtitle).toBe('Roman History');
    const indexes = course?.subtitleMatchIndexes ?? [];
    expect(indexes).not.toHaveLength(0);
    const subtitle = course?.subtitle ?? '';
    // Every index must be within bounds
    for (const idx of indexes) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(subtitle.length);
    }
  });

  test('highlights professor name when query matches with accented characters', () => {
    const index: SearchIndex = {
      subjects: [],
      courses: [],
      professors: [{ id: 'p-garcia', name: 'García, María', popularity: 200 }],
    };

    const ranked = searchIndex(index, 'garcia');
    const { flattened } = buildSearchItems(ranked, { total: 5 });
    const prof = flattened.find((item) => item.label === 'García, María');

    expect(prof).toBeDefined();
    const indexes = prof?.labelMatchIndexes ?? [];
    expect(indexes).not.toHaveLength(0);
    // 'García' = G(0)a(1)r(2)c(3)í(4)a(5) — all 6 chars should be highlighted
    expect(indexes).toContain(0); // G
    expect(indexes).toContain(1); // a
    expect(indexes).toContain(2); // r
    expect(indexes).toContain(3); // c
    expect(indexes).toContain(5); // a (after í)
  });

  test('label highlight indexes are valid positions within the label string', () => {
    const index: SearchIndex = {
      subjects: [{ code: 'CS', title: 'Computer Science', popularity: 500 }],
      courses: [
        { code: 'CS 101', title: 'Intro to CS', subject: 'CS', popularity: 300 },
        { code: 'CS210', title: 'Data Structures', subject: 'CS', popularity: 200 },
      ],
      professors: [],
    };

    const ranked = searchIndex(index, 'cs101');
    const { flattened } = buildSearchItems(ranked, { total: 10 });

    for (const item of flattened) {
      const indexes = item.labelMatchIndexes ?? [];
      for (const idx of indexes) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(item.label.length);
      }
    }
  });
});

describe('search ranking', () => {
  test('prioritizes exact professor surname over partial non-professor matches', () => {
    const index: SearchIndex = {
      subjects: [{ code: 'CHST', title: 'Child Studies', popularity: 900 }],
      courses: [
        {
          code: 'CHST200',
          title: 'Introduction to Child Studies',
          subject: 'CHST',
          popularity: 800,
        },
      ],
      professors: [{ id: 'p-childs', name: 'Childs, Taylor', popularity: 50 }],
    };

    const ranked = searchIndex(index, 'childs');
    const { flattened } = buildSearchItems(ranked, { total: 10 });

    expect(flattened[0]?.section).toBe('Professor');
    expect(flattened[0]?.label).toBe('Childs, Taylor');
  });

  test('prefers exact course code when query looks like a course code', () => {
    const index: SearchIndex = {
      subjects: [
        { code: 'CS', title: 'Computer Science', popularity: 2000 },
        { code: 'CSE', title: 'Computer Science and Engineering', popularity: 1200 },
      ],
      courses: [
        { code: 'CS210', title: 'Computer Science I', subject: 'CS', popularity: 1400 },
        { code: 'CS211', title: 'Computer Science II', subject: 'CS', popularity: 1300 },
      ],
      professors: [{ id: 'p-casey', name: 'Casey Stone', popularity: 900 }],
    };

    const ranked = searchIndex(index, 'cs210');
    const { flattened } = buildSearchItems(ranked, { total: 10 });

    expect(flattened[0]?.section).toBe('Course');
    expect(flattened[0]?.label).toBe('CS210');
  });

  test('matches reordered professor names from token overlap', () => {
    const index: SearchIndex = {
      subjects: [{ code: 'CHST', title: 'Child Studies', popularity: 700 }],
      courses: [{ code: 'CHST101', title: 'Child Development', subject: 'CHST', popularity: 650 }],
      professors: [
        { id: 'p-jane-childs', name: 'Childs, Jane', popularity: 120 },
        { id: 'p-jane-doe', name: 'Doe, Jane', popularity: 450 },
      ],
    };

    const ranked = searchIndex(index, 'jane childs');
    const { flattened } = buildSearchItems(ranked, { total: 10 });

    expect(flattened[0]?.section).toBe('Professor');
    expect(flattened[0]?.label).toBe('Childs, Jane');
  });
});
