import { redirect } from "next/navigation";

/** OAuth return landing page. Redirects to the target path. */
export default async function AuthReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: target } = await searchParams;
  if (
    typeof target === "string" &&
    target.startsWith("/") &&
    !target.startsWith("//")
  ) {
    redirect(target);
  }
  redirect("/");
}
