import { readFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import { toString as mdastToString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import {
  DOC_ORDER,
  type DocGroupId,
  GROUP_TITLES,
  type HeadingItem,
  type Lang,
  type NavGroup,
  slugify,
} from "@/lib/docs";

interface ParsedDoc {
  title: string;
  description: string;
  markdown: string;
}

export interface DocPageData extends ParsedDoc {
  group: DocGroupId;
  slug: string;
  headings: HeadingItem[];
}

const CONTENT_ROOT = path.join(process.cwd(), "content");
const docCache = new Map<string, Promise<DocPageData | null>>();

function getDocFilePath(lang: Lang, group: DocGroupId, slug: string) {
  return path.join(CONTENT_ROOT, lang, group, `${slug}.md`);
}

function extractHeadings(markdown: string): HeadingItem[] {
  const ast = unified().use(remarkParse).parse(markdown);
  const headings: HeadingItem[] = [];

  visit(ast, "heading", (node: { depth: number; children: unknown[] }) => {
    if (node.depth !== 2 && node.depth !== 3) return;

    const text = mdastToString(node).trim();
    if (!text) return;

    headings.push({
      depth: node.depth,
      text,
      id: slugify(text),
    });
  });

  return headings;
}

async function readDocFile(
  lang: Lang,
  group: DocGroupId,
  slug: string,
): Promise<ParsedDoc | null> {
  try {
    const filePath = getDocFilePath(lang, group, slug);
    const raw = await readFile(filePath, "utf8");
    const parsed = matter(raw);

    const title =
      typeof parsed.data.title === "string" ? parsed.data.title : slug;
    const description =
      typeof parsed.data.description === "string"
        ? parsed.data.description
        : "";

    return {
      title,
      description,
      markdown: parsed.content.trim(),
    };
  } catch {
    return null;
  }
}

export async function getDocPage(
  lang: Lang,
  group: DocGroupId,
  slug: string,
): Promise<DocPageData | null> {
  const cacheKey = `${lang}/${group}/${slug}`;
  const cached = docCache.get(cacheKey);
  if (cached) return cached;

  const promise = readDocFile(lang, group, slug).then((doc) => {
    if (!doc) return null;

    return {
      group,
      slug,
      title: doc.title,
      description: doc.description,
      markdown: doc.markdown,
      headings: extractHeadings(doc.markdown),
    };
  });

  docCache.set(cacheKey, promise);
  return promise;
}

export async function getNavigation(lang: Lang): Promise<NavGroup[]> {
  const groups = Object.keys(DOC_ORDER) as DocGroupId[];

  return Promise.all(
    groups.map(async (groupId) => {
      const pages = await Promise.all(
        DOC_ORDER[groupId].map(async (slug) => {
          const doc = await getDocPage(lang, groupId, slug);

          if (!doc) {
            return {
              slug,
              title: slug,
              description: "",
            };
          }

          return {
            slug,
            title: doc.title,
            description: doc.description,
          };
        }),
      );

      return {
        id: groupId,
        title: GROUP_TITLES[groupId][lang],
        pages,
      };
    }),
  );
}
