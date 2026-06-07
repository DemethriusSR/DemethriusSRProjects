const axios = require('axios');
const db = require('../db/database');

const BASE_URL =
  process.env.COINGECKO_BASE_URL ||
  'https://api.coingecko.com/api/v3';

const CACHE_TTL =
  parseInt(process.env.PRICE_CACHE_TTL || '120');

const FOREX_URL =
  process.env.FOREX_URL ||
  'https://economia.awesomeapi.com.br/json/last/USD-BRL';

/* ────────────────────────────────────────────────
 * COINS MAP
 * ──────────────────────────────────────────────── */
const COIN_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  ADA: 'cardano',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  POL: 'polygon-network',
  LINK: 'chainlink',
  XRP: 'ripple',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
  SHIB: 'shiba-inu',
  USDT: 'tether',
  USDC: 'usd-coin',
  TRX: 'tron',
  TON: 'the-open-network',
  PEPE: 'pepe'
};

const ID_TO_SYMBOL = Object.fromEntries(
  Object.entries(COIN_IDS).map(([sym, id]) => [id, sym])
);

let refreshPromise = null;

/* ────────────────────────────────────────────────
 * EXCHANGE RATE (USD/BRL)
 * ──────────────────────────────────────────────── */
async function fetchUsdBrlRate() {
  try {
    const { data } = await axios.get(FOREX_URL, {
      timeout: 10000
    });

    const rate = Number(data?.USDBRL?.bid);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('Invalid FX rate');
    }

    saveExchangeRate(rate);
    return rate;
  } catch (err) {
    console.error('[FOREX ERROR]', err.message);
    return getExchangeRate();
  }
}

function saveExchangeRate(rate) {
  if (!rate || rate <= 0) return;

  db.prepare(`
    UPDATE exchange_rates
    SET usd_brl = ?,
        updated_at = strftime('%s','now')
    WHERE id = 1
  `).run(rate);
}

function getExchangeRate() {
  const row = db.prepare(`
    SELECT usd_brl
    FROM exchange_rates
    WHERE id = 1
  `).get();

  return Number(row?.usd_brl || 5.5);
}

/* ────────────────────────────────────────────────
 * FETCH PRICES
 * ──────────────────────────────────────────────── */
async function fetchAndCachePrices() {
  const ids = Object.values(COIN_IDS).join(',');

  const [cryptoRes, fx] = await Promise.all([
    axios.get(`${BASE_URL}/simple/price`, {
      params: {
        ids,
        vs_currencies: 'usd',
        include_24hr_change: 'true'
      },
      timeout: 15000,
      headers: { Accept: 'application/json' }
    }),
    fetchUsdBrlRate()
  ]);

  const data = cryptoRes?.data;

  /* ───── VALIDAÇÃO CRÍTICA ───── */
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    throw new Error('CoinGecko retornou dados vazios');
  }

  const usdBrl = Number.isFinite(fx) ? fx : 5.5;

  const upsert = db.prepare(`
    INSERT INTO price_cache (
      symbol,
      price_brl,
      price_usd,
      change_24h_usd,
      updated_at
    )
    VALUES (?, ?, ?, ?, strftime('%s','now'))
    ON CONFLICT(symbol) DO UPDATE SET
      price_brl = excluded.price_brl,
      price_usd = excluded.price_usd,
      change_24h_usd = excluded.change_24h_usd,
      updated_at = excluded.updated_at
  `);

  const tx = db.transaction((entries) => {
    for (const [id, value] of entries) {
      const symbol = ID_TO_SYMBOL[id];
      if (!symbol) continue;

      const priceUsd = Number(value?.usd);
      if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
        console.warn(`[INVALID PRICE] ${symbol}`);
        continue;
      }

      const change24hUsd = Number(value?.usd_24h_change ?? 0);

      const priceBrl = priceUsd * usdBrl;

      upsert.run(
        symbol,
        Number(priceBrl.toFixed(8)),
        Number(priceUsd.toFixed(8)),
        Number(change24hUsd.toFixed(4))
      );
    }
  });

  tx(Object.entries(data));

  return getCachedPrices();
}

/* ────────────────────────────────────────────────
 * CACHE READ
 * ──────────────────────────────────────────────── */
function getCachedPrices() {
  const rows = db.prepare(`
    SELECT symbol, price_brl, price_usd, change_24h_usd, updated_at
    FROM price_cache
  `).all();

  const result = {};

  for (const r of rows) {
    result[r.symbol] = {
      priceBrl: Number(r.price_brl || 0),
      priceUsd: Number(r.price_usd || 0),
      change24hUsd: Number(r.change_24h_usd || 0),
      updatedAt: Number(r.updated_at || 0)
    };
  }

  result.__rate = {
    usdBrl: getExchangeRate()
  };

  return result;
}

/* ────────────────────────────────────────────────
 * CACHE VALIDATION (ROBUSTO)
 * ──────────────────────────────────────────────── */
function isCacheStale() {
  const row = db.prepare(`
    SELECT updated_at
    FROM price_cache
    ORDER BY updated_at DESC
    LIMIT 1
  `).get();

  if (!row?.updated_at) return true;

  const age = Date.now() / 1000 - row.updated_at;

  return age > CACHE_TTL;
}

/* ────────────────────────────────────────────────
 * PUBLIC API
 * ──────────────────────────────────────────────── */
async function getPrices(forceRefresh = false) {
  if (!forceRefresh && !isCacheStale()) {
    return getCachedPrices();
  }

  if (!refreshPromise) {
    refreshPromise = fetchAndCachePrices()
      .catch((err) => {
        console.error('[CoinGecko ERROR]', err.message);
        return getCachedPrices();
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

module.exports = {
  getPrices,
  getExchangeRate
};