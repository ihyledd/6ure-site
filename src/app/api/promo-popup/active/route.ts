import { NextResponse } from "next/server";
import { getActivePromoPopup } from "@/lib/dal/promo-popups";

export async function GET() {
  try {
    const popup = await getActivePromoPopup();
    return NextResponse.json(popup ?? null);
  } catch {
    return NextResponse.json(null);
  }
}
