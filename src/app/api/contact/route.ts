import { NextRequest } from "next/server";
import { createContactMessage } from "@/lib/dal/contact";
import { contactLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Rate limit: 3 requests per minute per IP
  const ip = getClientIp(request);
  const { success, reset } = contactLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const body = await request.json() as { name?: string; email?: string; message?: string };
  const { name, email, message } = body;
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return Response.json({ error: "All fields are required" }, { status: 400 });
  }

  // Basic input length validation
  if (name.trim().length > 100 || email.trim().length > 254 || message.trim().length > 5000) {
    return Response.json({ error: "Input too long" }, { status: 400 });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return Response.json({ error: "Invalid email address" }, { status: 400 });
  }

  await createContactMessage({
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
  });
  return Response.json({ ok: true });
}
