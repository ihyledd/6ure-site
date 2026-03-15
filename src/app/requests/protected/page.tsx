import type { Metadata } from "next";
import { ProtectedPageClient } from "@/components/requests/ProtectedPageClient";

export const metadata: Metadata = {
  title: "Protected content",
  description: "Protected creators and content.",
};

export const dynamic = "force-dynamic";

export default function ProtectedPage() {
  return <ProtectedPageClient />;
}
