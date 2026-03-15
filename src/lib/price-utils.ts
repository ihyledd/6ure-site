/**
 * Price parsing and EUR conversion for sorting.
 * Ported from old requests site (server/database.js + utils/currencyRates.js).
 * UI always shows original price; price_numeric is used only for sort order.
 */

/** Parse price string to number. Returns { value, currency } or null. */
export function parsePriceAndCurrency(priceStr: string | null | undefined): { value: number; currency: string } | null {
  if (!priceStr || typeof priceStr !== "string") return null;
  const raw = priceStr.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  let currency = "USD";
  if (raw.includes("€") || /\bEUR\b/i.test(raw) || /\beuros?\b/i.test(raw)) currency = "EUR";
  else if (raw.includes("£") || /\bGBP\b/i.test(raw) || /\bpounds?\b/i.test(raw)) currency = "GBP";
  else if (/\bA\$|AUD\b/i.test(raw) || /A\s*\$/.test(raw)) currency = "AUD";
  else if (/\bC\$|CAD\b/i.test(raw) || /C\s*\$/.test(raw)) currency = "CAD";
  else if (/\bCHF\b/i.test(raw) || raw.includes("CHF")) currency = "CHF";
  else if (/\bJPY\b/i.test(raw) || (raw.includes("¥") && !raw.includes("A¥") && !/\bCNY\b|人民币|RMB|CN\s*¥|¥\s*CN/i.test(raw)) || /\byen\b/i.test(raw)) currency = "JPY";
  else if (/\bMXN\b|MX\$/.test(raw)) currency = "MXN";
  else if (/\bBRL\b/i.test(raw) || raw.includes("R$")) currency = "BRL";
  else if (/\bINR\b/i.test(raw) || raw.includes("₹") || /\brupees?\b/i.test(raw)) currency = "INR";
  else if (/\bPLN\b/i.test(raw) || raw.includes("zł") || raw.includes("ZŁ")) currency = "PLN";
  else if ((/\bSEK\b/i.test(raw) || /\bkr\b/i.test(raw)) && !/\bNOK\b/i.test(raw) && !/\bDKK\b/i.test(raw)) currency = "SEK";
  else if (/\bNOK\b/i.test(raw)) currency = "NOK";
  else if (/\bDKK\b/i.test(raw)) currency = "DKK";
  else if (/\bTRY\b/i.test(raw) || raw.includes("₺")) currency = "TRY";
  else if (/\bHUF\b/i.test(raw) || /\bFt\b/i.test(raw) || raw.includes(" Ft") || raw.includes(" FT")) currency = "HUF";
  else if (/\bCZK\b/i.test(raw) || raw.includes("Kč") || raw.includes("Kc") || /\bKč\b/i.test(raw)) currency = "CZK";
  else if (/\bRON\b/i.test(raw) || /\blei\b/i.test(raw)) currency = "RON";
  else if (/\bBGN\b/i.test(raw) || raw.includes("лв") || /\bleva\b/i.test(raw)) currency = "BGN";
  else if (/\bRUB\b/i.test(raw) || raw.includes("₽")) currency = "RUB";
  else if (/\bCNY\b|人民币|RMB|CN\s*¥|¥\s*CN|\byuan\b/i.test(raw)) currency = "CNY";
  else if (/\bHKD\b/i.test(raw) || /HK\s*\$/.test(raw) || raw.includes("HK$")) currency = "HKD";
  else if (/\bSGD\b/i.test(raw) || /S\s*\$/.test(raw) || raw.includes("S$")) currency = "SGD";
  else if (/\bKRW\b/i.test(raw) || raw.includes("₩") || /\bwon\b/i.test(raw)) currency = "KRW";
  else if (/\bTHB\b/i.test(raw) || raw.includes("฿") || /\bbaht\b/i.test(raw)) currency = "THB";
  else if (/\bIDR\b/i.test(raw) || /\bRp\b/i.test(raw) || /\bRp\s*\d/.test(raw)) currency = "IDR";
  else if (/\bZAR\b/i.test(raw)) currency = "ZAR";
  else if (/\bUSD\b/i.test(raw) || /\bdollars?\b/i.test(raw) || (raw.includes("$") && !/\bA\$|AUD|C\$|CAD|R\$|BRL|MX\$|MXN|HK\$|S\$/.test(raw)))
    currency = "USD";

  let s = raw;
  try {
    s = s.replace(/\p{Sc}/gu, "");
  } catch {
    s = s.replace(/[\s€$£¥₹₽₩₪₺₴₸₦₱฿₫﷼₵₲￠￡￥]+/g, "");
  }
  s = s.replace(/^\s*[A-Za-z]{2,3}\s*/i, "").replace(/\s*[A-Za-z]{2,3}\s*$/i, "");
  const currencyWords =
    /\s*(zł|kr|Ft|lei|leva|Rp|Kč|Kc|pesos?|dollars?|pounds?|euros?|reais?|rand|francs?|yuan|yen|rupees?|baht|won|ringgit|rupiah|liras?|dinars?|riyals?|shekels?|dirhams?)\s*/gi;
  s = s.replace(currencyWords, "");
  let cleaned = s.replace(/[^\d.,]/g, "").replace(/\s/g, "");
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    cleaned = lastComma > lastDot ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (lastComma > -1) {
    const afterComma = cleaned.length - lastComma - 1;
    cleaned = afterComma === 2 ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  }
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? { value: num, currency } : null;
}

/** Fallback rates: 1 unit of currency = X EUR. Same as old site's currencyRates. */
const DEFAULT_RATES_TO_EUR: Record<string, number> = {
  USD: 0.84,
  EUR: 1,
  GBP: 1.17,
  AUD: 0.59,
  CAD: 0.62,
  CHF: 1.09,
  JPY: 0.0054,
  MXN: 0.049,
  BRL: 0.16,
  INR: 0.0095,
  PLN: 0.24,
  SEK: 0.094,
  NOK: 0.089,
  DKK: 0.13,
  TRY: 0.025,
  HUF: 0.0025,
  CZK: 0.039,
  RON: 0.2,
  BGN: 0.51,
  RUB: 0.0085,
  CNY: 0.12,
  HKD: 0.11,
  SGD: 0.62,
  KRW: 0.00065,
  THB: 0.024,
  IDR: 0.000061,
  ZAR: 0.046,
};

/** Get rate: 1 unit of currency = X EUR. Uses static fallback (same as old site before fetch). Unknown currency defaults to USD (0.84). */
function getRateToEur(currency: string): number {
  if (!currency || typeof currency !== "string") return 0.84;
  const code = currency.toUpperCase().trim();
  if (code === "EUR") return 1;
  return DEFAULT_RATES_TO_EUR[code] ?? 0.84;
}

/** Parse price string and return value in EUR for sorting. UI always shows original price. */
export function getPriceInEur(priceStr: string | null | undefined): number | null {
  const parsed = parsePriceAndCurrency(priceStr);
  if (!parsed) return null;
  const rate = getRateToEur(parsed.currency);
  const eur = parsed.value * rate;
  return Number.isFinite(eur) ? Math.round(eur * 100) / 100 : null;
}

/** 1 EUR = this many USD (fallback). */
const EUR_TO_USD = 1 / 0.84;

/**
 * Parse price string and return value in USD for UI tier coloring.
 * All supported currencies (EUR, GBP, AUD, CAD, CHF, JPY, MXN, BRL, INR, PLN, SEK, NOK, DKK,
 * TRY, HUF, CZK, RON, BGN, RUB, CNY, HKD, SGD, KRW, THB, IDR, ZAR, USD) are converted via the
 * rate table to EUR, then EUR to USD. Unknown currencies are treated as USD.
 */
export function getPriceInUsd(priceStr: string | null | undefined): number | null {
  const eur = getPriceInEur(priceStr);
  if (eur == null) return null;
  const usd = eur * EUR_TO_USD;
  return Number.isFinite(usd) ? Math.round(usd * 100) / 100 : null;
}

export type PriceTier = "cheap" | "slightly-expensive" | "expensive" | "very-expensive";

/** Tier by USD-equivalent: $1–$9 cheap, $10–$19 slightly-expensive, $20–$49 expensive, $50+ very-expensive. */
export function getPriceTier(priceStr: string | null | undefined): PriceTier | null {
  const usd = getPriceInUsd(priceStr);
  if (usd == null || usd < 0) return null;
  if (usd < 10) return "cheap";
  if (usd < 20) return "slightly-expensive";
  if (usd < 50) return "expensive";
  return "very-expensive";
}
