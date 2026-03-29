import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestCancellation } from "@/lib/requests-api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const result = await requestCancellation(
    id,
    session.user.id,
    body.reason ?? ""
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Cannot request cancellation" },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
