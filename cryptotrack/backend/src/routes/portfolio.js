const router = require('express').Router();
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { getPrices } = require('../services/priceEngine');
const { calcPortfolio } = require('../services/portfolioCalculator');

router.use(requireAuth);
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