import type { Metadata } from "next";
import { queryOne, query } from "@/lib/db";
import { ResourceDetailClient } from "@/components/resources/ResourceDetailClient";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import fs from "fs/promises";
import path from "path";

async function getDirSize(dirPath: string): Promise<number> {
  let size = 0;
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        size += await getDirSize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        size += stats.size;
      }
    }
  } catch (e) {}
  return size;
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await queryOne<{ name: string; editor_name: string; thumbnail_url: string | null }>(
    `SELECT name, editor_name, thumbnail_url FROM resources_items WHERE id = ?`,
    [id]
  );
  if (!item) return { title: "Resource Not Found — 6ure" };
  return {
    title: `${item.name} by ${item.editor_name} — 6ure`,
    description: `Download ${item.name} by ${item.editor_name}. Premium video editing resource available on 6ure.`,
    openGraph: item.thumbnail_url ? { images: [{ url: item.thumbnail_url }] } : undefined,
  };
}

export const dynamic = "force-dynamic";

export default async function ResourceDetailPage({ params }: Props) {
  const { id } = await params;

  const item = await queryOne<Record<string, unknown>>(
    `SELECT r.*, e.social_url AS editor_social_url, e.avatar_url AS editor_avatar_url,
            e.total_downloads AS editor_total_downloads,
            e.resource_count AS editor_resource_count,
            u.avatar AS discord_member_avatar
     FROM resources_items r
     LEFT JOIN resources_editors e ON e.id = r.editor_id
     LEFT JOIN users u ON u.id = r.discord_member_id
     WHERE r.id = ?`,
    [id]
  );

  if (!item) notFound();

  // Hide hidden / status='Hidden' resources from non-admin viewers.
  const sessionForVisibility = await auth();
  const isAdminViewer = sessionForVisibility?.user?.role === "ADMIN";
  if (!isAdminViewer) {
    const hidden = Number((item as any).hidden) === 1;
    const status = String((item as any).status || "");
    if (hidden || status === "Hidden") notFound();
  }

  let related = await query(
    `SELECT r.id, r.name, r.thumbnail_url, r.category, r.download_count, r.leaked_at, r.editor_name, r.is_premium,
            e.avatar_url AS editor_avatar_url, e.social_url AS editor_social_url
     FROM resources_items r
     LEFT JOIN resources_editors e ON e.id = r.editor_id
     WHERE r.editor_id = ? AND r.id != ?
     ORDER BY r.download_count DESC
     LIMIT 6`,
    [item.editor_id, id]
  );

  let isSimilar = false;
  if (related.length === 0) {
    const titleWords = String(item.name || "").toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2 && !["the", "and", "for", "with"].includes(w));

    const scoreParams: any[] = [];
    let scoreExpr = "0";

    // Reward same category
    if (item.category) {
      scoreExpr += " + (CASE WHEN r.category = ? THEN 10 ELSE 0 END)";
      scoreParams.push(item.category);
    }

    // Reward keyword matches in name
    titleWords.forEach(word => {
      scoreExpr += " + (CASE WHEN r.name LIKE ? THEN 5 ELSE 0 END)";
      scoreParams.push(`%${word}%`);
    });

    related = await query(
      `SELECT r.id, r.name, r.thumbnail_url, r.category, r.download_count, r.leaked_at, r.editor_name, r.is_premium,
              e.avatar_url AS editor_avatar_url, e.social_url AS editor_social_url,
              (${scoreExpr}) as relevance
       FROM resources_items r
       LEFT JOIN resources_editors e ON e.id = r.editor_id
       WHERE r.id != ? AND (${scoreExpr}) > 0
       ORDER BY relevance DESC, RAND()
       LIMIT 3`,
      [...scoreParams, id, ...scoreParams]
    );
    isSimilar = true;
  }

  const session = await auth();
  const userAccess = {
    isLoggedIn: !!session?.user?.id,
    isStaff: session?.user?.role === "ADMIN",
    isPremium: !!(session as any)?.user?.patreon_premium,
    isBooster: ((session as any)?.user?.boost_level ?? 0) > 0,
    username: session?.user?.name ?? null,
    avatar: session?.user?.image ?? null,
  };

  let fileSizeFormatted = "0.00 KB";
  if (item.file_path && typeof item.file_path === "string") {
    try {
      const sftpgoUser = process.env.SFTPGO_USERNAME || "ihyledd";
      const basePath = `/usr/share/sftpgo/storages/${sftpgoUser}`;
      const absolutePath = path.join(basePath, item.file_path);
      const bytes = await getDirSize(absolutePath);
      if (bytes > 0) {
        if (bytes >= 1024 * 1024 * 1024) fileSizeFormatted = (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
        else if (bytes >= 1024 * 1024) fileSizeFormatted = (bytes / (1024 * 1024)).toFixed(2) + " MB";
        else fileSizeFormatted = (bytes / 1024).toFixed(2) + " KB";
      }
    } catch (e) {}
  }
  item.file_size_formatted = fileSizeFormatted;

  const { getSiteSetting } = await import("@/lib/site-settings");
  const discordUrl = (await getSiteSetting("discord_url")) || "https://discord.gg/6ureleaks";

  return (
    <div className="resources-page-wrapper">
      <ResourceDetailClient 
        item={item as any} 
        related={related as any} 
        userAccess={userAccess} 
        isSimilar={isSimilar} 
        discordUrl={discordUrl}
      />
    </div>
  );
}
