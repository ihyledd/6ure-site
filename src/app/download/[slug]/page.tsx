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
    title: `Download ${link.resource_name}`,
    description: link.description ?? `Download ${link.resource_name} from 6ure`,
    openGraph: {
      title: `Download ${link.resource_name} — 6ure`,
      description: link.description ?? `Download ${link.resource_name} from 6ure`,
      images: link.thumbnail_url ? [{ url: link.thumbnail_url }] : [],
    },
    robots: "noindex, nofollow",
  };
}

export default async function DownloadPage({ params }: Props) {
  const { slug } = await params;
  const link = await getAdDownloadLink(slug);

  if (!link) notFound();

  // Serialize for client component (snake_case keys match MySQL columns)
  const serialized = {
    id: link.id,
    slug: link.slug,
    resource_name: link.resource_name,
    download_url: link.download_url,
    ad_enabled: link.ad_enabled,
    thumbnail_url: link.thumbnail_url,
    editor_name: link.editor_name,
    description: link.description,
    password: link.password,
    campaign: link.campaign
      ? {
          id: link.campaign.id,
          name: link.campaign.name,
          sponsor_enabled: Boolean(link.campaign.sponsor_enabled),
          sponsor_name: link.campaign.sponsor_name,
          sponsor_tagline: link.campaign.sponsor_tagline,
          sponsor_logo_url: link.campaign.sponsor_logo_url,
          sponsor_cta_text: link.campaign.sponsor_cta_text,
          sponsor_cta_url: link.campaign.sponsor_cta_url,
          video_url: link.campaign.video_url,
          video_duration_secs: link.campaign.video_duration_secs,
          headline_template: link.campaign.headline_template,
          subheadline: link.campaign.subheadline,
        }
      : null,
    allCampaigns: link.allCampaigns?.map((c) => ({
      id: c.id,
      name: c.name,
      sponsor_enabled: Boolean(c.sponsor_enabled),
      sponsor_name: c.sponsor_name,
      sponsor_tagline: c.sponsor_tagline,
      sponsor_logo_url: c.sponsor_logo_url,
      sponsor_cta_text: c.sponsor_cta_text,
      sponsor_cta_url: c.sponsor_cta_url,
      video_url: c.video_url,
      video_duration_secs: c.video_duration_secs,
      headline_template: c.headline_template,
      subheadline: c.subheadline,
    })),
  };

  // If ad is disabled or no campaign, show direct download
  if (!link.ad_enabled || !link.campaign) {
    return <DownloadUnlocked link={serialized} />;
  }

  return <AdGatePage link={serialized} />;
}
