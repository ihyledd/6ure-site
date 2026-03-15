import type { Metadata } from "next";
import Link from "next/link";
import { getFaqsList } from "@/lib/dal/faqs";
import { RequestsMembershipContent } from "./RequestsMembershipContent";
import { BiIcon } from "@/components/requests/BiIcon";
import "@/styles/protected-page.css";
import "../FAQ.css";
import "./Membership.css";

export const metadata: Metadata = {
  title: "Membership",
  description: "Frequently asked questions about membership.",
};

export const dynamic = "force-dynamic";

export default async function RequestsMembershipPage() {
  let faqs: Awaited<ReturnType<typeof getFaqsList>> = [];
  try {
    faqs = await getFaqsList({ category: "membership" });
  } catch (e) {
    console.error("[requests/membership] getFaqsList failed:", e);
  }

  return (
    <div className="faq-container faq-container-protected">
      <Link href="/requests" className="requests-back-link">
        ← Back to requests
      </Link>
      <section className="protected-hero">
        <BiIcon name="person-badge" size={48} className="protected-hero-icon" aria-hidden />
        <h1>Membership</h1>
        <p className="protected-hero-subtitle">Frequently asked questions about membership</p>
      </section>
      <RequestsMembershipContent
        faqs={faqs.map((f) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
        }))}
      />
    </div>
  );
}
