const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { signToken, requireAuth } = require('../middleware/auth');

router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2 }),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, name, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    try {
      const stmt = db.prepare('INSERT INTO users (email, name, password) VALUES (?, ?, ?)');
      const result = stmt.run(email, name, hash);
      const token = signToken({ id: result.lastInsertRowid, email, name });
      res.status(201).json({ token, user: { id: result.lastInsertRowid, email, name } });
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
      }
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }
);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  }
);

router.get('/me', requireAuth, async (req, res) => {
  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
