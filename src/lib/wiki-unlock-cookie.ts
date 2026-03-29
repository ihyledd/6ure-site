import { createHmac, timingSafeEqual } from "crypto";

const UNLOCK_COOKIE = "wiki_unlocked";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET or NEXTAUTH_SECRET (min 16 chars) required for wiki unlock signing",
    );
  }
  return secret;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function base64UrlDecode(str: string): Buffer | null {
  try {
    return Buffer.from(str, "base64url");
  } catch {
    return null;
  }
}

/** Create a signed cookie value. Only the server can create valid signatures. */
export function createSignedCookie(slugs: string[]): string {
  const payload = JSON.stringify(slugs);
  const payloadBuf = Buffer.from(payload, "utf8");
  const signature = createHmac("sha256", getSecret())
    .update(payloadBuf)
    .digest();
  return `${base64UrlEncode(signature)}.${base64UrlEncode(payloadBuf)}`;
}

/** Verify and parse the cookie. Returns null if tampered, invalid, or secret missing. */
export function verifySignedCookie(value: string | undefined): string[] | null {
  if (!value || !value.includes(".")) return null;
  const [sigPart, payloadPart] = value.split(".", 2);
  const payloadBuf = base64UrlDecode(payloadPart);
  if (!payloadBuf) return null;

  let expectedSig: Buffer;
  try {
    expectedSig = createHmac("sha256", getSecret()).update(payloadBuf).digest();
  } catch {
    return null; // secret missing or invalid
  }

  const actualSig = base64UrlDecode(sigPart);
  if (!actualSig || actualSig.length !== expectedSig.length) return null;
  if (!timingSafeEqual(expectedSig, actualSig)) return null;

  try {
    const parsed = JSON.parse(payloadBuf.toString("utf8"));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export { UNLOCK_COOKIE, MAX_AGE };
