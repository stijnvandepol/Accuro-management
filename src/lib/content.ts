import { promises as fs } from "node:fs";
import path from "node:path";
import { GENERAL_DOCS_ROOT, PAGES_CONTENT_ROOT } from "../../config/content";

export interface GeneralDocContent {
  title: string;
  folder: string;
  order: number;
  content: string;
  slug: string;
  sourcePath: string;
}

export interface DocsPageContent {
  page: {
    title: string;
    description: string;
  };
  general: {
    title: string;
    description: string;
    newFolderPlaceholder: string;
    addFolderButton: string;
    emptyFolders: string;
    emptyFolderDocs: string;
    newDocumentPrefix: string;
    newDocumentTitlePlaceholder: string;
    newDocumentContentPlaceholder: string;
    addDocumentButton: string;
    emptyPreview: string;
    cancelButton: string;
    saveButton: string;
    editButton: string;
    copyButton: string;
    copiedButton: string;
    deleteConfirm: string;
  };
  client: {
    title: string;
    description: string;
    newDocumentTitlePlaceholder: string;
    newDocumentContentPlaceholder: string;
    addDocumentButton: string;
    emptyList: string;
    emptyPreview: string;
    cancelButton: string;
    saveButton: string;
    editButton: string;
    copyButton: string;
    copiedButton: string;
    deleteConfirm: string;
  };
}

type FrontmatterMap = Record<string, string>;

function parseFrontmatter(raw: string) {
  if (!raw.startsWith("---\n")) {
    return { frontmatter: {} as FrontmatterMap, content: raw.trim() };
  }

  const endIndex = raw.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return { frontmatter: {} as FrontmatterMap, content: raw.trim() };
  }

  const frontmatterBlock = raw.slice(4, endIndex).trim();
  const content = raw.slice(endIndex + 5).trim();

  const frontmatter = Object.fromEntries(
    frontmatterBlock
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) return [line, ""];
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        return [key, value];
      }),
  );

  return { frontmatter, content };
}

async function collectMarkdownFiles(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return collectMarkdownFiles(fullPath);
      }
      return entry.name.endsWith(".md") ? [fullPath] : [];
    }),
  );

  return files.flat();
}

export async function loadGeneralDocsContent(): Promise<GeneralDocContent[]> {
  const files = await collectMarkdownFiles(GENERAL_DOCS_ROOT);
  const docs = await Promise.all(
    files.map(async (filePath) => {
      const raw = await fs.readFile(filePath, "utf8");
      const { frontmatter, content } = parseFrontmatter(raw);

      return {
        title: frontmatter.title ?? path.basename(filePath, ".md"),
        folder: frontmatter.folder ?? "Algemeen",
        order: Number(frontmatter.order ?? 999),
        content,
        slug: path.basename(filePath, ".md"),
        sourcePath: filePath,
      };
    }),
  );

  return docs.sort((a, b) => {
    if (a.folder !== b.folder) return a.folder.localeCompare(b.folder, "nl");
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title, "nl");
  });
}

export async function loadDocsPageContent(): Promise<DocsPageContent> {
  const filePath = path.join(PAGES_CONTENT_ROOT, "docs.json");
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as DocsPageContent;
}
