/**
 * FX Rate Service
 * Fetches and caches exchange rates from exchangerate-api or open.er-api.com (free, no key needed).
 * Cache TTL: 5 minutes.
 */

const axios = require('axios');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let ratesCache = {
  base: null,
  rates: {},
  fetchedAt: null,
};

const FREE_FX_API = 'https://open.er-api.com/v6/latest';

/**
 * Refresh rates from the external API (base = USD).
 */
async function refreshRates(base = 'USD') {
  try {
    const response = await axios.get(`${FREE_FX_API}/${base}`, { timeout: 10000 });
    if (response.data && response.data.rates) {
      ratesCache = {
        base,
        rates: response.data.rates,
        fetchedAt: Date.now(),
      };
      console.log(`[fx] Rates refreshed for base ${base} at ${new Date().toISOString()}`);
    }
  } catch (err) {
    console.error('[fx] Failed to refresh rates:', err.message);
  }
}

/**
 * Check if cache is still valid.
 */
function isCacheValid() {
  return ratesCache.fetchedAt && Date.now() - ratesCache.fetchedAt < CACHE_TTL_MS;
}

/**
 * Get all rates for a base currency (from cache, refreshing if stale).
 */
async function getRates(base = 'USD') {
  if (!isCacheValid() || ratesCache.base !== base) {
    await refreshRates(base);
  }
  return { base: ratesCache.base, rates: ratesCache.rates, fetchedAt: ratesCache.fetchedAt };
}

/**
 * Get exchange rate from one currency to another.
 * Returns the rate such that: amount * rate = converted amount.
 */
async function getRate(from, to) {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  if (fromUpper === toUpper) return 1;

  // Always use USD as intermediate base
  if (!isCacheValid()) {
    await refreshRates('USD');
  }

  const rates = ratesCache.rates;

  if (!rates[fromUpper] || !rates[toUpper]) {
    throw new Error(`Currency not found: ${fromUpper} or ${toUpper}`);
  }

  // Convert: from -> USD -> to
  const fromToUsd = 1 / rates[fromUpper];
  const usdToTarget = rates[toUpper];
  return fromToUsd * usdToTarget;
}

module.exports = { refreshRates, getRates, getRate };
