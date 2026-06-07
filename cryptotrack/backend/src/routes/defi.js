const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM defi_positions WHERE user_id = ? ORDER BY start_date DESC
  `).all(req.user.id);

  const totalDeposited = rows.filter(r => !r.exit_date).reduce((a, b) => a + b.deposited, 0);
  const totalRewards   = rows.reduce((a, b) => a + (b.rewards || 0), 0);

  res.json({ data: rows, totalDeposited, totalRewards });
});

router.post('/',
  body('start_date').isISO8601(),
  body('protocol').trim().isLength({ min: 1 }),
  body('type').isIn(['Staking', 'Yield Farming', 'Liquidity Pool']),
  body('asset').trim().isLength({ min: 2 }),
  body('deposited').isFloat({ min: 0 }),
  body('apy').isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { start_date, protocol, type, asset, deposited, apy, rewards = 0, obs } = req.body;
    const result = db.prepare(`
      INSERT INTO defi_positions (user_id, start_date, protocol, type, asset, deposited, apy, rewards, obs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, start_date, protocol, type, asset.toUpperCase(), deposited, apy, rewards, obs);

    res.status(201).json(db.prepare('SELECT * FROM defi_positions WHERE id = ?').get(result.lastInsertRowid));
  }
);

router.patch('/:id/rewards',
  param('id').isInt(),
  body('rewards').isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const result = db.prepare(`
      UPDATE defi_positions SET rewards = ? WHERE id = ? AND user_id = ?
    `).run(req.body.rewards, req.params.id, req.user.id);

    if (result.changes === 0) return res.status(404).json({ error: 'Posição não encontrada' });
    res.json(db.prepare('SELECT * FROM defi_positions WHERE id = ?').get(req.params.id));
  }
);

router.patch('/:id/close',
  param('id').isInt(),
  body('exit_date').isISO8601(),
  body('withdrawn').isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const result = db.prepare(`
      UPDATE defi_positions SET exit_date = ?, withdrawn = ? WHERE id = ? AND user_id = ?
    `).run(req.body.exit_date, req.body.withdrawn, req.params.id, req.user.id);

    if (result.changes === 0) return res.status(404).json({ error: 'Posição não encontrada' });
    res.json(db.prepare('SELECT * FROM defi_positions WHERE id = ?').get(req.params.id));
  }
);

router.delete('/:id', param('id').isInt(), async (req, res) => {
  const result = db.prepare('DELETE FROM defi_positions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Posição não encontrada' });
  res.json({ ok: true });
});

module.exports = router;
