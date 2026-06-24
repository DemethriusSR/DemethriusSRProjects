const router = require('express').Router();
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { getPrices } = require('../services/priceEngine');
const { calcPortfolio } = require('../services/portfolioCalculator');

router.use(requireAuth);

// O frontend (store.js / Prices.jsx) já consome esta rota via
// GET /api/portfolio/prices?refresh=true — ela não existia antes,
// o que causava 404 em todo fetchPrices() e exibia "Erro na API".
router.get('/prices', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';

    const prices = await getPrices(forceRefresh);

    const result = {};
    for (const [symbol, p] of Object.entries(prices.data || {})) {
      result[symbol] = {
        price: p.priceBrl,
        priceUsd: p.priceUsd,
        change24h: p.change24h ?? 0
      };
    }

    result.__rate = prices.__rate || { usdBrl: 5.0 };

    res.json(result);
  } catch (err) {
    console.error('Erro ao buscar cotações:', err);
    res.status(500).json({ error: 'Erro ao buscar cotações' });
  }
});

router.get('/summary', async (req, res) => {

  try {

    const prices =
      await getPrices(true);

    const usdBrl =
      prices?.__rate?.usdBrl || 5.7;

    const txns = db.prepare(`
      SELECT *
      FROM transactions
      WHERE user_id = ?
      ORDER BY date ASC
    `).all(req.user.id);

    const portfolio =
      calcPortfolio(
        txns,
        prices,
        usdBrl
      );

    const totalInvested =
      portfolio.reduce(
        (acc, p) =>
          acc + p.costBasis,
        0
      );

    const totalInvestedUsd =
      portfolio.reduce(
        (acc, p) =>
          acc + p.costBasisUsd,
        0
      );

    const totalValue =
      portfolio.reduce(
        (acc, p) =>
          acc + p.currentValue,
        0
      );

    const totalValueUsd =
      portfolio.reduce(
        (acc, p) =>
          acc + p.currentValueUsd,
        0
      );

    const totalPL =
      totalValue -
      totalInvested;

    const totalPlUsd =
      totalValueUsd -
      totalInvestedUsd;

    const totalROI =
      totalInvested > 0
        ? (
          totalPL /
          totalInvested
        ) * 100
        : 0;

    res.json({

      usdBrl,

      totalInvested,
      totalInvestedUsd,

      totalValue,
      totalValueUsd,

      totalPL,
      totalPlUsd,

      totalROI,

      transactionCount:
        txns.length,

      assetsCount:
        portfolio.length,

      portfolio
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error:
        'Erro ao calcular portfólio'
    });
  }
});

module.exports = router;