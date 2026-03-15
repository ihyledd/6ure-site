import { notFound } from "next/navigation";
import { getRequestById } from "@/lib/requests-api";
import { RequestDetailClient } from "@/components/requests/RequestDetailClient";
import { buildRequestTitle, buildRequestDescription } from "@/lib/requests-utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return { title: "Request" };
  const req = await getRequestById(id);
  if (!req) return { title: "Request" };
  return {
    title: buildRequestTitle(req),
    description: buildRequestDescription(req),
    openGraph: req.image_url ? { images: [req.image_url] } : undefined,
  };
}

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({ params }: Props) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) notFound();

  const req = await getRequestById(id);
  if (!req) notFound();

  return <RequestDetailClient initialRequest={req} />;
}
