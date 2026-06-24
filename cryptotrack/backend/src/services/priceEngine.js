const axios = require('axios');
const db = require('../db/database');

/* ─────────────────────────────
 * CONFIG
 * ───────────────────────────── */
const BINANCE_URL = 'https://api.binance.com/api/v3/ticker/24hr';
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const PTAX_URL =
  'https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?format=json';

const CACHE_TTL = 120;

/* ─────────────────────────────
 * ASSETS MAP
 * ───────────────────────────── */
const BINANCE_SYMBOLS = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  BNB: 'BNBUSDT',
  XRP: 'XRPUSDT',
  SOL: 'SOLUSDT',
  ADA: 'ADAUSDT',
  LTC: 'LTCUSDT',
  DOGE: 'DOGEUSDT',
  TRX: 'TRXUSDT',
  AVAX: 'AVAXUSDT'
};

const COINGECKO_IDS = {
  PEPE: 'pepe',
  SHIB: 'shiba-inu',
  TON: 'the-open-network',
  UNI: 'uniswap',
  LINK: 'chainlink',
  ATOM: 'cosmos',
  DOT: 'polkadot'
};

let refreshPromise = null;

/* ─────────────────────────────
 * PTAX (BCB)
 * ───────────────────────────── */
async function getUsdBrl() {
  try {
    const { data } = await axios.get(PTAX_URL, { timeout: 8000 });

    const value = parseFloat(
      data?.[0]?.valor || data?.[0]?.value
    );

    if (!value) throw new Error('Resposta da API do BCB sem valor de cotação');

    db.prepare(`
      INSERT INTO exchange_rates (id, usd_brl, updated_at)
      VALUES (1, ?, strftime('%s','now'))
      ON CONFLICT(id) DO UPDATE SET
        usd_brl=excluded.usd_brl,
        updated_at=excluded.updated_at
    `).run(value);

    return value;
  } catch (e) {
    console.error('Falha ao buscar taxa USD/BRL no BCB:', e.message);
    const row = db.prepare(`SELECT usd_brl FROM exchange_rates WHERE id=1`).get();
    return row?.usd_brl || 5.0;
  }
}

/* ─────────────────────────────
 * BINANCE
 * ───────────────────────────── */
async function fetchBinance() {
  try {
    // Filtra só os pares que usamos: sem o parâmetro `symbols`, a Binance
    // retorna TODOS os pares (peso 80 e payload enorme), o que aumenta
    // bastante a chance de timeout/erro e zera os preços silenciosamente.
    const symbolsParam = JSON.stringify(Object.values(BINANCE_SYMBOLS));

    const { data } = await axios.get(BINANCE_URL, {
      params: { symbols: symbolsParam },
      timeout: 10000
    });

    const map = {};
    for (const item of data) {
      for (const [symbol, pair] of Object.entries(BINANCE_SYMBOLS)) {
        if (item.symbol === pair) {
          map[symbol] = {
            priceUsd: parseFloat(item.lastPrice),
            change24h: parseFloat(item.priceChangePercent)
          };
        }
      }
    }
    return map;
  } catch (e) {
    console.error('Falha ao buscar preços na Binance:', e.message);
    return {};
  }
}

/* ─────────────────────────────
 * COINGECKO
 * ───────────────────────────── */
async function fetchCoinGecko() {
  try {
    const ids = Object.values(COINGECKO_IDS).join(',');

    const { data } = await axios.get(COINGECKO_URL, {
      params: {
        ids,
        vs_currencies: 'usd',
        include_24hr_change: 'true'
      },
      timeout: 12000
    });

    const map = {};

    for (const [symbol, id] of Object.entries(COINGECKO_IDS)) {
      const price = data?.[id]?.usd;
      if (price) {
        map[symbol] = {
          priceUsd: price,
          change24h: data[id].usd_24h_change ?? 0
        };
      }
    }

    return map;
  } catch (e) {
    console.error('Falha ao buscar preços na CoinGecko:', e.message);
    return {};
  }
}

/* ─────────────────────────────
 * MAIN ENGINE
 * ───────────────────────────── */
async function fetchPrices() {
  const usdBrl = await getUsdBrl();

  // fetchBinance/fetchCoinGecko já tratam seus próprios erros e retornam {}
  // em caso de falha, então uma fonte fora do ar não derruba a outra.
  const [binance, gecko] = await Promise.all([
    fetchBinance(),
    fetchCoinGecko()
  ]);

  const prices = { ...binance };

  // merge altcoins (não sobrescreve símbolo já coberto pela Binance)
  for (const [k, v] of Object.entries(gecko)) {
    if (!prices[k]) prices[k] = v;
  }

  const result = {};

  for (const [symbol, info] of Object.entries(prices)) {
    const priceUsd = info?.priceUsd;
    if (!priceUsd || priceUsd <= 0) continue;

    result[symbol] = {
      priceUsd,
      priceBrl: priceUsd * usdBrl,
      change24h: info.change24h ?? 0
    };
  }

  return {
    data: result,
    __rate: { usdBrl }
  };
}

/* ─────────────────────────────
 * CACHE
 * ───────────────────────────── */
function getCached() {
  const rows = db.prepare(`
    SELECT symbol, price_brl, price_usd, change_24h_usd
    FROM price_cache
  `).all();

  const map = {};
  for (const r of rows) {
    map[r.symbol] = {
      priceBrl: r.price_brl,
      priceUsd: r.price_usd,
      change24h: r.change_24h_usd
    };
  }

  const rateRow = db.prepare(`SELECT usd_brl FROM exchange_rates WHERE id=1`).get();
  const usdBrl = rateRow?.usd_brl || 5.0;

  return { data: map, __rate: { usdBrl } };
}

/* ─────────────────────────────
 * PUBLIC API
 * ───────────────────────────── */
async function getPrices(force = false) {
  if (!force) return getCached();

  if (!refreshPromise) {
    refreshPromise = fetchPrices()
      .then((res) => {
        const upsert = db.prepare(`
          INSERT INTO price_cache (symbol, price_brl, price_usd, change_24h_usd, updated_at)
          VALUES (?, ?, ?, ?, strftime('%s','now'))
          ON CONFLICT(symbol) DO UPDATE SET
            price_brl=excluded.price_brl,
            price_usd=excluded.price_usd,
            change_24h_usd=excluded.change_24h_usd,
            updated_at=excluded.updated_at
        `);

        const tx = db.transaction((data) => {
          for (const [symbol, p] of Object.entries(data)) {
            upsert.run(symbol, p.priceBrl, p.priceUsd, p.change24h ?? 0);
          }
        });

        tx(res.data);

        // Retorna o cache completo (não só os símbolos buscados agora).
        // Se uma fonte falhou nesta rodada, o símbolo mantém o último
        // preço bom salvo no banco em vez de desaparecer/zerar.
        const cached = getCached();
        return { data: cached.data, __rate: res.__rate };
      })
      .finally(() => (refreshPromise = null));
  }

  return refreshPromise;
}

module.exports = { getPrices, getUsdBrl };