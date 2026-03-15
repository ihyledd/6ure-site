import { getSidebarNav } from "@/lib/nav";
import { WikiSidebar } from "@/components/WikiSidebar";
import { WikiSuggestChangesCard } from "@/components/WikiSuggestChangesCard";

export async function WikiDocsLayout({ children }: { children: React.ReactNode }) {
  const nav = await getSidebarNav();
  return (
    <div className="wiki-docs">
      <WikiSidebar nav={nav} />
      <div className="wiki-docs-main">
        {children}
        <WikiSuggestChangesCard />
      </div>
    </div>
  );
}
