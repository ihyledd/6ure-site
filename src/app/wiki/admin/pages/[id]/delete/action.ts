"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/require-admin";
import { getPageById, deletePage } from "@/lib/dal/pages";

export async function deletePageAction(formData: FormData) {
  await requireAdmin();
  const pageId = String(formData.get("pageId") ?? "").trim();
  if (!pageId) return;
  const page = await getPageById(pageId);
  if (!page) return;
  await deletePage(pageId);
  redirect("/wiki/admin");
}
