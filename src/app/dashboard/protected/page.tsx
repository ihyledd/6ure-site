import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LeakerProtectionView } from "@/components/leaker/LeakerProtectionView";

export const metadata = {
  title: "Protected Editors | Leaker Dashboard",
  robots: "noindex, nofollow",
};

export default async function ProtectedEditorsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/?callbackUrl=/dashboard/protected");
  return <LeakerProtectionView />;
}
