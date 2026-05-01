import { LegalPage } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMCA & Copyright",
  description: "DMCA policy for 6ure - copyright protection, takedown procedures, and request removal of copyrighted work including presets.",
};

export default function DMCAPage() {
  return <LegalPage type="dmca" />;
}
