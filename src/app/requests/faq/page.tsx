import type { Metadata } from "next";
import Link from "next/link";
import { getFaqsList } from "@/lib/dal/faqs";
import { RequestsFaqClient } from "@/components/requests/RequestsFaqClient";
import { BiIcon } from "@/components/requests/BiIcon";
import "@/styles/protected-page.css";
import "../FAQ.css";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about requests.",
};

export const dynamic = "force-dynamic";

export default async function RequestsFaqPage() {
  let faqs: Awaited<ReturnType<typeof getFaqsList>> = [];
  try {
    faqs = await getFaqsList();
  } catch (e) {
    console.error("[requests/faq] getFaqsList failed:", e);
  }

  return (
    <div className="faq-container faq-container-protected">
      <Link href="/requests" className="requests-back-link">
        ← Back to requests
      </Link>
      <section className="protected-hero">
        <BiIcon name="question-circle" size={48} className="protected-hero-icon" aria-hidden />
        <h1>FAQ</h1>
        <p className="protected-hero-subtitle">Frequently asked questions about requests</p>
      </section>
      <RequestsFaqClient
        items={faqs.map((f) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
          category: f.category ?? undefined,
        }))}
      />
    </div>
  );
}
