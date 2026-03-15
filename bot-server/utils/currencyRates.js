/**
 * Exchange rates to EUR (VDS Frankfurt). Fetched from Frankfurter (ECB data), updated regularly.
 * Used only in backend for sorting; frontend always shows original currency.
 */

/** Currencies requested from Frankfurter (ECB). Unsupported ones use DEFAULT_RATES_TO_EUR. */
const CURRENCIES = [
  'USD', 'GBP', 'CHF', 'JPY', 'AUD', 'CAD', 'MXN', 'BRL', 'INR', 'PLN', 'SEK', 'NOK', 'DKK'
];

/** Fallback: 1 unit of currency = X EUR (used before first fetch or on API failure). */
const DEFAULT_RATES_TO_EUR = {
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
  RON: 0.20,
  BGN: 0.51,
  RUB: 0.0085,
  CNY: 0.12,
  HKD: 0.11,
  SGD: 0.62,
  KRW: 0.00065,
  THB: 0.024,
  IDR: 0.000061,
  ZAR: 0.046
};

let ratesToEur = { ...DEFAULT_RATES_TO_EUR };
let lastFetch = 0;
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest';

/**
 * Fetch latest rates from Frankfurter (ECB). Base EUR: response.rates[C] = amount of C per 1 EUR.
 * So 1 C = 1/rates[C] EUR → rateToEur[C] = 1/rates[C].
 */
async function fetchRatesToEur() {
  const symbols = CURRENCIES.filter(c => c !== 'EUR').join(',');
  const url = `${FRANKFURTER_URL}?from=EUR&to=${symbols}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.rates || typeof data.rates !== 'object') throw new Error('Invalid response');
    const next = { EUR: 1 };
    for (const [currency, amountPerEur] of Object.entries(data.rates)) {
      const n = parseFloat(amountPerEur, 10);
      if (Number.isFinite(n) && n > 0) next[currency] = 1 / n;
    }
    ratesToEur = { ...DEFAULT_RATES_TO_EUR, ...next };
    lastFetch = Date.now();
    return ratesToEur;
  } catch (err) {
    console.warn('[currencyRates] Fetch failed, using fallback:', err.message);
    return ratesToEur;
  }
}

/**
 * Get rate: 1 unit of currency = X EUR. Uses cache; triggers refresh if stale.
 */
function getRateToEur(currency) {
  if (!currency || typeof currency !== 'string') return 1;
  const code = currency.toUpperCase().trim();
  if (code === 'EUR') return 1;
  if (ratesToEur[code] != null) return ratesToEur[code];
  return DEFAULT_RATES_TO_EUR[code] != null ? DEFAULT_RATES_TO_EUR[code] : 1;
}

/**
 * Ensure cache is filled (e.g. on first use). Call from startup and periodically.
 */
async function refreshIfStale() {
  if (Date.now() - lastFetch > CACHE_MS) await fetchRatesToEur();
}

module.exports = {
  fetchRatesToEur,
  getRateToEur,
  refreshIfStale,
  DEFAULT_RATES_TO_EUR
};
