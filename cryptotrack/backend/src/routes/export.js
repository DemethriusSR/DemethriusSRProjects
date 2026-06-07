const router = require('express').Router();
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Export all transactions as JSON (frontend converts to XLSX with SheetJS)
router.get('/transactions', async (req, res) => {
  const rows = db.prepare(`
    SELECT date, type, asset, qty, price, fee, total, exchange, origin_asset, origin_qty, obs
    FROM transactions WHERE user_id = ? ORDER BY date ASC
  `).all(req.user.id);
  res.json(rows);
});

// Export DeFi positions
router.get('/defi', async (req, res) => {
  const rows = db.prepare(`
    SELECT start_date, protocol, type, asset, deposited, apy, rewards, exit_date, withdrawn, obs
    FROM defi_positions WHERE user_id = ? ORDER BY start_date ASC
  `).all(req.user.id);
  res.json(rows);
});

// Bulk import transactions from XLSX (parsed on frontend, sent as JSON array)
router.post('/transactions', async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ error: 'Nenhum dado para importar' });

  const VALID_TYPES = ['Compra','Venda','Swap','DeFi','Hold'];
  const insert = db.prepare(`
    INSERT INTO transactions (user_id, date, type, asset, qty, price, fee, total, exchange, origin_asset, origin_qty, obs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  const errors = [];

  const run = db.transaction(() => {
    for (const [i, r] of rows.entries()) {
      if (!r.date || !VALID_TYPES.includes(r.type) || !r.asset) {
        errors.push({ row: i + 1, reason: 'Campos obrigatórios ausentes (date, type, asset)' });
        continue;
      }
      const qty   = parseFloat(r.qty)   || 0;
      const price = parseFloat(r.price) || 0;
      const fee   = parseFloat(r.fee)   || 0;
      insert.run(req.user.id, r.date, r.type, r.asset.toUpperCase(), qty, price, fee, qty * price,
                 r.exchange || null, r.origin_asset || null, r.origin_qty ? parseFloat(r.origin_qty) : null, r.obs || null);
      imported++;
    }
  });

  run();
  res.json({ imported, errors });
});

module.exports = router;
