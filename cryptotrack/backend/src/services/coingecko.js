const axios = require('axios');

const BASE_URL = 'https://api.coingecko.com/api/v3';

const COIN_IDS = {
  PEPE: 'pepe',
  SHIB: 'shiba-inu',
  TON: 'the-open-network',
  UNI: 'uniswap',
  AAVE: 'aave',
  DOT: 'polkadot'
};

async function fetchCoinGeckoPrices() {
  const ids = Object.values(COIN_IDS).join(',');

  const { data } = await axios.get(`${BASE_URL}/simple/price`, {
    params: {
      ids,
      vs_currencies: 'usd',
      include_24hr_change: 'true'
    }
  });

  const result = {};

  for (const [symbol, id] of Object.entries(COIN_IDS)) {
    if (data[id]) {
      result[symbol] = {
        usd: data[id].usd
      };
    }
  }

  return result;
}

module.exports = { fetchCoinGeckoPrices };