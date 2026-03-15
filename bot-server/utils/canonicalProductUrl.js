/**
 * Canonical product URL for matching and duplicate detection.
 * Strips query (?...) and hash (#...), normalizes path (no trailing slash).
 * Used so requests and leaks match by product link only; name/title is ignored.
 * Returns empty string for invalid or non-http(s) URLs.
 */

function canonicalProductUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    u.search = '';
    u.hash = '';
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    // Normalize default ports so https://x.com/p and https://x.com:443/p match
    if (u.port === '80' && u.protocol === 'http:') u.port = '';
    if (u.port === '443' && u.protocol === 'https:') u.port = '';
    return u.toString();
  } catch (_) {
    return '';
  }
}

module.exports = { canonicalProductUrl };
