import { DocsShell } from "@/components/docs/docs-shell";
import { DEFAULT_LANG, getDefaultDocPath } from "@/lib/docs";
import { getDocPage, getNavigation } from "@/lib/docs-content";

export default async function Home() {
  const defaultPath = getDefaultDocPath();
  const [page, navigation] = await Promise.all([
    getDocPage(DEFAULT_LANG, defaultPath.group, defaultPath.slug),
    getNavigation(DEFAULT_LANG),
  ]);

  if (!page) return null;

  return (
    <DocsShell
      lang={DEFAULT_LANG}
      currentGroup={page.group}
      currentSlug={page.slug}
      title={page.title}
      description={page.description}
      markdown={page.markdown}
      navigation={navigation}
      headings={page.headings}
    />
  );
}
