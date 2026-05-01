import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { MyResourcesClient } from "@/components/leaker/MyResourcesClient";

export const metadata = {
  title: "My Resources | Leaker Dashboard",
};

export default async function MyResourcesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/?callbackUrl=/dashboard/resources");

  const uploads = await query(`
    SELECT
      r.id, r.name, r.editor_name,
      r.leaked_at, r.download_count, r.view_count,
      r.category, r.is_premium, r.thumbnail_url, r.description,
      r.file_path, r.place_url, r.price, r.price_numeric, r.file_size_bytes,
      r.status, r.hidden, r.is_protected, r.is_featured, r.tags,
      e.social_url AS editor_social_url
    FROM resources_items r
    LEFT JOIN resources_editors e ON e.id = r.editor_id
    WHERE r.discord_member_id = ?
    ORDER BY r.leaked_at DESC
  `, [session.user.id]);

  return <MyResourcesClient initialUploads={uploads as any} />;
}
