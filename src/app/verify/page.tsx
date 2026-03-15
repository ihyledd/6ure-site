import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { VerifyPage } from "@/components/VerifyPage";

export const metadata: Metadata = {
  title: "Verify",
  description: "Official 6ure Discord verification page. Securely verify your account to access the server.",
  openGraph: {
    title: "Verify - 6ure",
    description: "Official 6ure Discord verification page. Securely verify your account to access the server.",
  },
};

export default function Verify() {
  return (
    <Suspense fallback={
      <div className="verify-page-wrap">
        <Link href="/" className="verify-back-link">← Back to home</Link>
        <div className="verify-container">
          <section className="about-hero">
            <h1 className="about-hero-title">Loading...</h1>
          </section>
        </div>
      </div>
    }>
      <VerifyPage />
    </Suspense>
  );
}
