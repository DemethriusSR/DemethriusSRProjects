const axios = require('axios');

const PTAX_URL =
  'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/' +
  'CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao=';

async function fetchPTAX() {
  const today = new Date().toISOString().split('T')[0];

  const url = `${PTAX_URL}'${today}'&$format=json`;

  const { data } = await axios.get(url, { timeout: 10000 });

  const quotes = data?.value || [];

  if (!quotes.length) return 5.0;

  const last = quotes[quotes.length - 1];

  return Number(last?.cotacaoVenda || 5.0);
}

module.exports = { fetchPTAX };