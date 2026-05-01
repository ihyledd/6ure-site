import { redirect } from "next/navigation";

export default function RequestsPrivacyRedirect() {
  redirect("/privacy");
}
