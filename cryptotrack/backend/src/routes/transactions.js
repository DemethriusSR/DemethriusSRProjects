const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { asset, type, from, to, limit = 200, offset = 0 } = req.query;

  let sql = 'SELECT * FROM transactions WHERE user_id = ?';
  const params = [req.user.id];

  if (asset) {
    sql += ' AND asset = ?';
    params.push(asset.toUpperCase());
  }

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
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
    .prepare(
      'SELECT COUNT(*) as n FROM transactions WHERE user_id = ?'
    )
    .get(req.user.id).n;

  res.json({
    data: rows,
    total
  });
});

router.post(
  '/',
  body('date').isISO8601(),
  body('type').isIn([
    'Compra',
    'Venda',
    'Swap',
    'DeFi',
    'Hold'
  ]),
  body('asset').trim().isLength({
    min: 2,
    max: 10
  }),
  body('qty').isFloat({ min: 0 }),
  body('price').isFloat({ min: 0 }),
  body('fee').optional().isFloat({ min: 0 }),
  async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ errors: errors.array() });
    }

    const {
      date,
      type,
      asset,
      qty,
      price,
      fee = 0,
      exchange,
      origin_asset,
      origin_qty,
      obs
    } = req.body;

    const total = qty * price;

    const result = db.prepare(`
      INSERT INTO transactions
      (
        user_id,
        date,
        type,
        asset,
        qty,
        price,
        fee,
        total,
        exchange,
        origin_asset,
        origin_qty,
        obs
      )
      VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      date,
      type,
      asset.toUpperCase(),
      qty,
      price,
      fee,
      total,
      exchange,
      origin_asset,
      origin_qty,
      obs
    );

    const row = db
      .prepare(
        'SELECT * FROM transactions WHERE id = ?'
      )
      .get(result.lastInsertRowid);

    res.status(201).json(row);
  }
);

router.put(
  '/:id',
  param('id').isInt(),
  body('date').optional().isISO8601(),
  body('type').optional().isIn([
    'Compra',
    'Venda',
    'Swap',
    'DeFi',
    'Hold'
  ]),
  body('qty').optional().isFloat({ min: 0 }),
  body('price').optional().isFloat({ min: 0 }),
  async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ errors: errors.array() });
    }

    const existing = db.prepare(`
      SELECT *
      FROM transactions
      WHERE id = ?
      AND user_id = ?
    `).get(
      req.params.id,
      req.user.id
    );

    if (!existing) {
      return res
        .status(404)
        .json({
          error: 'Transação não encontrada'
        });
    }

    const fields = {
      ...existing,
      ...req.body
    };

    fields.total =
      fields.qty * fields.price;

    if (fields.asset) {
      fields.asset =
        fields.asset.toUpperCase();
    }

    db.prepare(`
      UPDATE transactions
      SET
        date=?,
        type=?,
        asset=?,
        qty=?,
        price=?,
        fee=?,
        total=?,
        exchange=?,
        origin_asset=?,
        origin_qty=?,
        obs=?
      WHERE id=?
      AND user_id=?
    `).run(
      fields.date,
      fields.type,
      fields.asset,
      fields.qty,
      fields.price,
      fields.fee,
      fields.total,
      fields.exchange,
      fields.origin_asset,
      fields.origin_qty,
      fields.obs,
      req.params.id,
      req.user.id
    );

    res.json(
      db.prepare(
        'SELECT * FROM transactions WHERE id = ?'
      ).get(req.params.id)
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

  if (
    !Array.isArray(ids) ||
    ids.length === 0
  ) {
    return res.status(400).json({
      error: 'Nenhuma transação selecionada'
    });
  }

  const validIds = ids
    .map(Number)
    .filter(Number.isInteger);

  if (!validIds.length) {
    return res.status(400).json({
      error: 'IDs inválidos'
    });
  }

  const placeholders =
    validIds.map(() => '?').join(',');

  const result = db.prepare(`
    DELETE FROM transactions
    WHERE user_id = ?
    AND id IN (${placeholders})
  `).run(
    req.user.id,
    ...validIds
  );

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
router.delete(
  '/:id',
  param('id').isInt(),
  async (req, res) => {

    const result = db.prepare(`
      DELETE FROM transactions
      WHERE id = ?
      AND user_id = ?
    `).run(
      req.params.id,
      req.user.id
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Transação não encontrada'
      });
    }

    res.json({
      ok: true
    });
  }
);

module.exports = router;