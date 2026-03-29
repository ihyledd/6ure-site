import type { Metadata } from "next";
import { MembershipClient } from "./MembershipClient";

export const metadata: Metadata = {
  title: "Membership — 6URE",
  description: "Subscribe to 6URE Premium or Leak Protection for exclusive benefits.",
};

export default function MembershipPage() {
  return <MembershipClient />;
}
