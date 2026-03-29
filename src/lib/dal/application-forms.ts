import { queryOne } from "@/lib/db";

export async function countActiveApplicationForms(): Promise<number> {
  const row = await queryOne<{ n: number }>(
    "SELECT COUNT(*) as n FROM ApplicationForm WHERE isActive = true",
    []
  );
  return Number(row?.n ?? 0);
}
