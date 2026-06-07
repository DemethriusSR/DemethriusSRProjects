const axios = require('axios');

const BINANCE_URL = 'https://api.binance.com/api/v3/ticker/price';

const SYMBOL_MAP = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  BNB: 'BNBUSDT',
  XRP: 'XRPUSDT',
  SOL: 'SOLUSDT',
  ADA: 'ADAUSDT',
  LTC: 'LTCUSDT',
  DOGE: 'DOGEUSDT',
  LINK: 'LINKUSDT',
  MATIC: 'MATICUSDT',
  AVAX: 'AVAXUSDT',
  TRX: 'TRXUSDT',
  ATOM: 'ATOMUSDT'
};

async function fetchBinancePrices() {
  const { data } = await axios.get(BINANCE_URL, { timeout: 10000 });

  const result = {};

  for (const item of data) {
    for (const [symbol, pair] of Object.entries(SYMBOL_MAP)) {
      if (item.symbol === pair) {
        result[symbol] = {
          usd: Number(item.price)
        };
      }
    }
  }

  return result;
}

module.exports = { fetchBinancePrices };