import path from "node:path";

export const CONTENT_ROOT = path.join(process.cwd(), "content");
export const GENERAL_DOCS_ROOT = path.join(CONTENT_ROOT, "docs", "general");
export const PAGES_CONTENT_ROOT = path.join(CONTENT_ROOT, "pages");
