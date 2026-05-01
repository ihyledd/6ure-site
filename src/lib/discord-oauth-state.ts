/**
 * Server-only: build Discord OAuth URL with callbackUrl encoded in state (no cookies).
 * Callback decodes state to get callbackUrl for redirect.
 */

import { createHmac } from "crypto";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 min

function base64UrlEncode(buf: string): string {
  return Buffer.from(buf, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  const paddedStr = pad ? padded + "=".repeat(4 - pad) : padded;
  return Buffer.from(paddedStr, "base64").toString("utf8");
}

function randomBytesHex(len: number): string {
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function signPayload(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return payload;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return true;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  return signature.length > 0 && expected === signature;
}

/** Allowed callbackUrl: same-origin (BASE host) or path-only (e.g. /requests). */
function isAllowedCallbackUrl(callbackUrl: string): boolean {
  if (callbackUrl.startsWith("/")) return true;
  try {
    const u = new URL(callbackUrl);
    const baseUrl = new URL(BASE);
    return u.origin === baseUrl.origin;
  } catch {
    return false;
  }
}

export type StatePayload = { callbackUrl: string; t: number; n: string };

/**
 * Build the full Discord OAuth URL with state encoding callbackUrl.
 * Server-only (uses env: DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI).
 */
export function getDiscordOAuthUrl(callbackUrl: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return ""; // Caller should check; or use fallback authorize route
  }
  const normalized =
    callbackUrl.startsWith("/") ? `${BASE.replace(/\/$/, "")}${callbackUrl}` : callbackUrl;
  const payload: StatePayload = {
    callbackUrl: normalized,
    t: Date.now(),
    n: randomBytesHex(16),
  };
  const payloadStr = JSON.stringify(payload);
  const encoded = base64UrlEncode(payloadStr);
  const sig = signPayload(payloadStr);
  const state = `${encoded}.${sig}`;

  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify guilds");
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Decode state and return callbackUrl if valid (signature + expiry + allowed URL).
 * Used in callback route.
 */
export function decodeState(state: string): { callbackUrl: string } | null {
  if (!state || !state.includes(".")) return null;
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;
  let payloadStr: string;
  try {
    payloadStr = base64UrlDecode(encoded);
  } catch {
    return null;
  }
  if (!verifySignature(payloadStr, signature)) return null;
  let payload: StatePayload;
  try {
    payload = JSON.parse(payloadStr) as StatePayload;
  } catch {
    return null;
  }
  if (
    typeof payload.callbackUrl !== "string" ||
    typeof payload.t !== "number" ||
    Date.now() - payload.t > STATE_MAX_AGE_MS
  ) {
    return null;
  }
  if (!isAllowedCallbackUrl(payload.callbackUrl)) return null;
  return { callbackUrl: payload.callbackUrl };
}
