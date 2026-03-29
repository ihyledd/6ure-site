import type { Metadata } from "next";
import { YourRequestsClient } from "@/components/requests/YourRequestsClient";
import "@/styles/protected-page.css";
import "../YourRequests.css";

export const metadata: Metadata = {
  title: "Your requests",
  description: "View your submitted requests.",
};

export const dynamic = "force-dynamic";

export default function YourRequestsPage() {
  return (
    <div className="your-requests-container">
      <YourRequestsClient />
    </div>
  );
}
