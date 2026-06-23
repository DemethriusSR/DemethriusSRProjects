function calcPortfolio(txns, prices, usdBrl = 5.7) {
  const holdings = {};

  for (const t of txns) {
    const asset = t.asset?.toUpperCase();

    if (!asset) continue;

    if (!holdings[asset]) {
      holdings[asset] = {
        qty: 0,
        costBasis: 0
      };
    }

    const h = holdings[asset];

    const qty = Number(t.qty || 0);
    const total = Number(t.total || 0);
    const fee = Number(t.fee || 0);

    switch (t.type) {

      case 'Compra':
        h.qty += qty;
        h.costBasis += total + fee;
        break;

      case 'Venda': {
        const avgCost =
          h.qty > 0
            ? h.costBasis / h.qty
            : 0;

        h.qty -= qty;
        h.costBasis -= avgCost * qty;

        if (h.qty < 0) {
          h.qty = 0;
          h.costBasis = 0;
        }
        break;
      }

      case 'Swap': {

        const originAsset = t.origin_asset?.toUpperCase();

        if (
          originAsset &&
          holdings[originAsset]
        ) {
          const origin = holdings[originAsset];

          const avg =
            origin.qty > 0
              ? origin.costBasis / origin.qty
              : 0;

          const movedCost =
            avg * Number(t.origin_qty || 0);

          origin.qty -= Number(t.origin_qty || 0);
          origin.costBasis -= movedCost;

          h.qty += qty;
          h.costBasis += movedCost;
        }

        break;
      }
    }
  }

  const portfolio = [];

  for (const [symbol, h] of Object.entries(holdings)) {

    if (h.qty <= 0) continue;

    const market = prices?.data?.[symbol];

    const currentPrice =
      Number(market?.priceBrl || 0);

    const currentPriceUsd =
      Number(market?.priceUsd || 0);

    const currentValue =
      h.qty * currentPrice;

    const currentValueUsd =
      h.qty * currentPriceUsd;

    const avgCost =
      h.qty > 0
        ? h.costBasis / h.qty
        : 0;

    const avgCostUsd =
      avgCost / usdBrl;

    const pl =
      currentValue - h.costBasis;

    const plUsd =
      currentValueUsd -
      (h.costBasis / usdBrl);

    const roi =
      h.costBasis > 0
        ? (pl / h.costBasis) * 100
        : 0;

    portfolio.push({
      symbol,

      qty: h.qty,

      costBasis: h.costBasis,
      costBasisUsd: h.costBasis / usdBrl,

      avgCost,
      avgCostUsd,

      currentPrice,
      currentPriceUsd,

      currentValue,
      currentValueUsd,

      pl,
      plUsd,

      roi
    });
  }

  portfolio.sort(
    (a, b) =>
      b.currentValue - a.currentValue
  );

  return portfolio;
}

module.exports = {
  calcPortfolio
};