import { getRequestsSession } from "@/lib/requests-auth";

export async function auth() {
  return getRequestsSession();
}
