import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdDownloadLink } from "@/lib/ad-download";
import { AdGatePage } from "@/components/AdGatePage";
import { DownloadUnlocked } from "@/components/DownloadUnlocked";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const link = await getAdDownloadLink(slug);
  if (!link) return { title: "Not Found" };

  return {
    title: `Download ${link.resourceName}`,
    description: link.description ?? `Download ${link.resourceName} from 6ure`,
    openGraph: {
      title: `Download ${link.resourceName} — 6ure`,
      description: link.description ?? `Download ${link.resourceName} from 6ure`,
      images: link.thumbnailUrl ? [{ url: link.thumbnailUrl }] : [],
    },
    robots: "noindex, nofollow",
  };
}

export default async function DownloadPage({ params }: Props) {
  const { slug } = await params;
  const link = await getAdDownloadLink(slug);

  if (!link) notFound();

  // Track view (fire-and-forget, done client-side via API call)

  // Serialize for client component
  const serialized = {
    id: link.id,
    slug: link.slug,
    resourceName: link.resourceName,
    downloadUrl: link.downloadUrl,
    adEnabled: link.adEnabled,
    thumbnailUrl: link.thumbnailUrl,
    editorName: link.editorName,
    description: link.description,
    password: link.password,
    campaign: link.campaign
      ? {
          id: link.campaign.id,
          name: link.campaign.name,
          sponsorEnabled: Boolean(link.campaign.sponsorEnabled),
          sponsorName: link.campaign.sponsorName,
          sponsorTagline: link.campaign.sponsorTagline,
          sponsorLogoUrl: link.campaign.sponsorLogoUrl,
          sponsorCtaText: link.campaign.sponsorCtaText,
          sponsorCtaUrl: link.campaign.sponsorCtaUrl,
          videoUrl: link.campaign.videoUrl,
          videoDurationSecs: link.campaign.videoDurationSecs,
          headlineTemplate: link.campaign.headlineTemplate,
          subheadline: link.campaign.subheadline,
        }
      : null,
    allCampaigns: link.allCampaigns?.map((c) => ({
      id: c.id,
      name: c.name,
      sponsorEnabled: Boolean(c.sponsorEnabled),
      sponsorName: c.sponsorName,
      sponsorTagline: c.sponsorTagline,
      sponsorLogoUrl: c.sponsorLogoUrl,
      sponsorCtaText: c.sponsorCtaText,
      sponsorCtaUrl: c.sponsorCtaUrl,
      videoUrl: c.videoUrl,
      videoDurationSecs: c.videoDurationSecs,
      headlineTemplate: c.headlineTemplate,
      subheadline: c.subheadline,
    })),
  };

  // If ad is disabled or no campaign, show direct download
  if (!link.adEnabled || !link.campaign) {
    return <DownloadUnlocked link={serialized} />;
  }

  return <AdGatePage link={serialized} />;
}
