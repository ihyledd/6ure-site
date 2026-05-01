import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordPage } from "@/components/PasswordPage";

export const metadata: Metadata = {
  title: "Password",
  description: "Unlock the official 6ure password. Access to all presets freely.",
  openGraph: {
    title: "Password Access - 6ure",
    description: "Unlock the official 6ure password. Access to all presets freely.",
  },
};

export default function Password() {
  return (
    <Suspense fallback={<div className="pw-loading" style={{ padding: "48px 24px", textAlign: "center" }}>Loading...</div>}>
      <PasswordPage />
    </Suspense>
  );
}
