import type { Metadata } from "next";
import { ResourcesPageClient } from "@/components/resources/ResourcesPageClient";

export const metadata: Metadata = {
  title: "Resources — 6ure",
  description: "Browse and download premium video editing packs, presets, templates and more.",
};

export const dynamic = "force-dynamic";

export default function ResourcesPage() {
  return (
    <div className="resources-page-wrapper">
      <ResourcesPageClient />
    </div>
  );
}
