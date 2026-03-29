import type { Metadata } from "next";
import { MembershipClient } from "./MembershipClient";

export const metadata: Metadata = {
  title: "Membership",
  description: "Subscribe to 6URE Premium or Leak Protection plans.",
};

export default function MembershipPage() {
  return <MembershipClient />;
}
