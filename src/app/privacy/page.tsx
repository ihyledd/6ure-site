import { LegalPage } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for 6ure - transparent data practices, your rights, and how we protect your information.",
};

export default function PrivacyPage() {
  return <LegalPage type="privacy" />;
}
