import { useEffect } from "react";

const SITE_NAME = "DuckGrades";

export function formatPageTitle(pageTitle: string): string {
  return `${pageTitle} | ${SITE_NAME}`;
}

export function usePageTitle(pageTitle: string) {
  useEffect(() => {
    document.title = formatPageTitle(pageTitle);
  }, [pageTitle]);
}
