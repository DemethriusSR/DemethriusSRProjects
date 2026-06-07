const router = require('express').Router();
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { getPrices } = require('../services/priceEngine');

router.use(requireAuth);

function calcPortfolio(txns, prices, usdBrl) {
  const holdings = {};

  for (const t of txns) {
    if (!t.asset || !t.qty) continue; // validação crítica

    const s = t.asset;

    if (!holdings[s]) {
      holdings[s] = { qty: 0, cost: 0 };
    }

    const h = holdings[s];

    const totalBrl = t.total || 0;
    const fee = t.fee || 0;

    if (t.type === 'Compra') {
      h.qty += t.qty;
      h.cost += totalBrl + fee;
    }

    if (t.type === 'Venda') {
      const avg = h.qty ? h.cost / h.qty : 0;
      h.qty -= t.qty;
      h.cost -= avg * t.qty;
    }
  }

  const portfolio = [];

  for (const [symbol, h] of Object.entries(holdings)) {
    if (h.qty <= 0) continue;

    const price = prices.data?.[symbol];
    const priceBrl = price?.priceBrl || 0;

    const value = h.qty * priceBrl;

    portfolio.push({
      symbol,
      qty: h.qty,
      cost: h.cost,
      value,
      pl: value - h.cost,
      roi: h.cost ? ((value - h.cost) / h.cost) * 100 : 0
    });
  }

  return portfolio;
}

router.get('/summary', async (req, res) => {
  const prices = await getPrices(true);

  const txns = db.prepare(`
    SELECT * FROM transactions WHERE user_id=?
  `).all(req.user.id);

  const portfolio = calcPortfolio(txns, prices);

  const total = portfolio.reduce((a, b) => a + b.value, 0);
  const invested = portfolio.reduce((a, b) => a + b.cost, 0);

  res.json({
    totalInvested: invested,
    totalValue: total,
    roi: invested ? ((total - invested) / invested) * 100 : 0,
    portfolio
  });
});

module.exports = router;