import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { execute } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, ids, data } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No resources selected" }, { status: 400 });
    }

    const idPlaceholders = ids.map(() => "?").join(",");

    switch (action) {
      case "delete":
        await execute(`DELETE FROM resources_items WHERE id IN (${idPlaceholders})`, ids);
        break;
      
      case "change_category":
        if (!data?.category) return NextResponse.json({ error: "No category provided" }, { status: 400 });
        await execute(
          `UPDATE resources_items SET category = ? WHERE id IN (${idPlaceholders})`,
          [data.category, ...ids]
        );
        break;

      case "toggle_premium":
        if (typeof data?.is_premium !== "boolean") return NextResponse.json({ error: "No premium status provided" }, { status: 400 });
        await execute(
          `UPDATE resources_items SET is_premium = ? WHERE id IN (${idPlaceholders})`,
          [data.is_premium ? 1 : 0, ...ids]
        );
        break;

      case "set_hidden":
        if (typeof data?.hidden !== "boolean") return NextResponse.json({ error: "No hidden flag provided" }, { status: 400 });
        await execute(
          `UPDATE resources_items SET hidden = ? WHERE id IN (${idPlaceholders})`,
          [data.hidden ? 1 : 0, ...ids]
        );
        break;

      case "set_protected":
        if (typeof data?.is_protected !== "boolean") return NextResponse.json({ error: "No protected flag provided" }, { status: 400 });
        await execute(
          `UPDATE resources_items SET is_protected = ? WHERE id IN (${idPlaceholders})`,
          [data.is_protected ? 1 : 0, ...ids]
        );
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error("Bulk action error:", error);
    return NextResponse.json({ error: "Failed to perform bulk action" }, { status: 500 });
  }
}
