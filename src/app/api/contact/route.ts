import { NextRequest } from "next/server";
import { createContactMessage } from "@/lib/dal/contact";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json() as { name?: string; email?: string; message?: string };
  const { name, email, message } = body;
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return Response.json({ error: "All fields are required" }, { status: 400 });
  }
  await createContactMessage({
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
  });
  return Response.json({ ok: true });
}
