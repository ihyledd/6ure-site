import { LegalPage } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for 6ure - fair rules, clear expectations, and mutual respect for our community.",
};

export default function TermsPage() {
  return <LegalPage type="terms" />;
}
