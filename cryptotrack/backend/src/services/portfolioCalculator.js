function calcPortfolio(txns, prices, usdBrl = 5.5) {
  const holdings = {};

  for (const t of txns) {
    const asset = t.asset;

    if (!holdings[asset]) {
      holdings[asset] = {
        qty: 0,
        costBasis: 0,
        sold: 0,
        saleRevenue: 0
      };
    }

    const h = holdings[asset];

    const priceBrl = t.currency === 'USD' ? t.price * usdBrl : t.price;
    const totalBrl = t.currency === 'USD' ? t.total * usdBrl : t.total;
    const feeBrl = t.currency === 'USD' ? (t.fee || 0) * usdBrl : (t.fee || 0);

    if (t.type === 'Compra') {
      h.qty += t.qty;
      h.costBasis += totalBrl + feeBrl;
    }

    if (t.type === 'Venda') {
      const avg = h.qty ? h.costBasis / h.qty : 0;
      h.qty -= t.qty;
      h.costBasis -= avg * t.qty;
      h.saleRevenue += totalBrl - feeBrl;
    }

    if (t.type === 'Swap') {
      const origin = t.origin_asset;
      if (origin && holdings[origin]) {
        const o = holdings[origin];
        const avg = o.qty ? o.costBasis / o.qty : 0;
        const costMoved = avg * (t.origin_qty || 0);

        o.qty -= t.origin_qty || 0;
        o.costBasis -= costMoved;

        h.qty += t.qty;
        h.costBasis += costMoved;
      }
    }
  }

  const portfolio = [];

  for (const [symbol, h] of Object.entries(holdings)) {
    if (h.qty <= 0) continue;

    const p = prices[symbol];

    const priceBrl = Number.isFinite(p?.priceBrl) ? p.priceBrl : 0;
    const priceUsd = Number.isFinite(p?.priceUsd) ? p.priceUsd : 0;

    const currentValue = h.qty * priceBrl;
    const pl = currentValue - h.costBasis;

    portfolio.push({
      symbol,
      qty: h.qty,

      costBasis: h.costBasis,
      avgCost: h.qty ? h.costBasis / h.qty : 0,

      currentPrice: priceBrl,
      currentPriceUsd: priceUsd,

      currentValue,
      currentValueUsd: priceUsd * h.qty,

      pl,
      roi: h.costBasis ? (pl / h.costBasis) * 100 : 0
    });
  }

  return portfolio;
}

module.exports = { calcPortfolio };