import { useEffect } from "react";

const SITE_NAME = "DuckGrades";
const UNIVERSITY_KEYWORD = "University of Oregon";

function withUniversityKeyword(pageTitle: string): string {
  if (/\buniversity of oregon\b/i.test(pageTitle)) {
    return pageTitle;
  }
  return `${pageTitle} - ${UNIVERSITY_KEYWORD}`;
}

export function formatPageTitle(pageTitle: string): string {
  return `${withUniversityKeyword(pageTitle)} | ${SITE_NAME}`;
}

export function usePageTitle(pageTitle: string) {
  useEffect(() => {
    document.title = formatPageTitle(pageTitle);
  }, [pageTitle]);
}
