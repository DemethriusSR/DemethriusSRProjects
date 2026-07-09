const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

/*
=========================================
LIST (com filtros: asset, tx_hash, direction, from, to)
=========================================
*/
router.get('/', async (req, res) => {
  const { asset, tx_hash, direction, from, to, limit = 200, offset = 0 } = req.query;

  let sql = 'SELECT * FROM transfers WHERE user_id = ?';
  const params = [req.user.id];

  if (asset) {
    sql += ' AND asset = ?';
    params.push(asset.toUpperCase());
  }

  if (tx_hash) {
    sql += ' AND tx_hash LIKE ?';
    params.push(`%${tx_hash}%`);
  }

  if (direction) {
    sql += ' AND direction = ?';
    params.push(direction);
  }

  if (from) {
    sql += ' AND date >= ?';
    params.push(from);
  }

  if (to) {
    sql += ' AND date <= ?';
    params.push(to);
  }

  sql += ' ORDER BY date DESC, id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const rows = db.prepare(sql).all(...params);

  const total = db
    .prepare('SELECT COUNT(*) as n FROM transfers WHERE user_id = ?')
    .get(req.user.id).n;

  res.json({
    data: rows,
    total
  });
});

/*
=========================================
CREATE
=========================================
*/
router.post(
  '/',
  body('date').isISO8601(),
  body('direction').isIn(['Entrada', 'Saída']),
  body('asset').trim().isLength({ min: 2, max: 10 }),
  body('qty').isFloat({ min: 0 }),
  body('wallet_type').isIn(['HOT', 'COLD']),
  body('hardwallet').trim().isLength({ min: 1 }),
  body('fee').optional().isFloat({ min: 0 }),
  body('tx_hash').optional().trim(),
  async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      date,
      direction,
      asset,
      qty,
      wallet_type,
      hardwallet,
      counterparty,
      fee = 0,
      tx_hash,
      obs
    } = req.body;

    const result = db.prepare(`
      INSERT INTO transfers
      (
        user_id,
        date,
        direction,
        asset,
        qty,
        wallet_type,
        hardwallet,
        counterparty,
        fee,
        tx_hash,
        obs
      )
      VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      date,
      direction,
      asset.toUpperCase(),
      qty,
      wallet_type,
      hardwallet,
      counterparty || null,
      fee,
      tx_hash || null,
      obs || null
    );

    const row = db
      .prepare('SELECT * FROM transfers WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json(row);
  }
);

/*
=========================================
UPDATE
=========================================
*/
router.put(
  '/:id',
  param('id').isInt(),
  body('date').optional().isISO8601(),
  body('direction').optional().isIn(['Entrada', 'Saída']),
  body('qty').optional().isFloat({ min: 0 }),
  body('wallet_type').optional().isIn(['HOT', 'COLD']),
  async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const existing = db.prepare(`
      SELECT * FROM transfers WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Transferência não encontrada' });
    }

    const fields = { ...existing, ...req.body };

    if (fields.asset) {
      fields.asset = fields.asset.toUpperCase();
    }

    db.prepare(`
      UPDATE transfers
      SET
        date=?,
        direction=?,
        asset=?,
        qty=?,
        wallet_type=?,
        hardwallet=?,
        counterparty=?,
        fee=?,
        tx_hash=?,
        obs=?
      WHERE id=?
      AND user_id=?
    `).run(
      fields.date,
      fields.direction,
      fields.asset,
      fields.qty,
      fields.wallet_type,
      fields.hardwallet,
      fields.counterparty,
      fields.fee,
      fields.tx_hash,
      fields.obs,
      req.params.id,
      req.user.id
    );

    res.json(
      db.prepare('SELECT * FROM transfers WHERE id = ?').get(req.params.id)
    );
  }
);

/*
=========================================
DELETE BULK
=========================================
*/
router.delete('/bulk', async (req, res) => {

  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Nenhuma transferência selecionada' });
  }

  const validIds = ids.map(Number).filter(Number.isInteger);

  if (!validIds.length) {
    return res.status(400).json({ error: 'IDs inválidos' });
  }

  const placeholders = validIds.map(() => '?').join(',');

  const result = db.prepare(`
    DELETE FROM transfers
    WHERE user_id = ?
    AND id IN (${placeholders})
  `).run(req.user.id, ...validIds);

  res.json({
    ok: true,
    deleted: result.changes
  });
});

/*
=========================================
DELETE INDIVIDUAL
=========================================
*/
router.delete('/:id', param('id').isInt(), async (req, res) => {

  const result = db.prepare(`
    DELETE FROM transfers
    WHERE id = ?
    AND user_id = ?
  `).run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Transferência não encontrada' });
  }

  res.json({ ok: true });
});

module.exports = router;
