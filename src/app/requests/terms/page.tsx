import { redirect } from "next/navigation";

export default function RequestsTermsRedirect() {
  redirect("/terms");
}
