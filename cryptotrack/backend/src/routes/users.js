const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, param, validationResult } = require('express-validator');
const db = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Todo este módulo é restrito a administradores.
router.use(requireAuth, requireAdmin);

const PUBLIC_FIELDS = 'id, email, name, role, active, created_at';

// ── Listar usuários ─────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const users = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users ORDER BY created_at DESC`).all();
  res.json({ data: users });
});

// ── Criar usuário (convite) ─────────────────────────────────────────────
// Gera uma senha temporária aleatória em vez de o admin definir a senha do
// outro usuário — evita que o admin conheça/reutilize a senha de outra conta.
router.post('/',
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2 }),
  body('role').optional().isIn(['ADMIN', 'USER']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, name, role = 'USER' } = req.body;
    const tempPassword = crypto.randomBytes(9).toString('base64url');
    const hash = await bcrypt.hash(tempPassword, 10);

    try {
      const result = db.prepare(
        'INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)'
      ).run(email, name, hash, role);

      const user = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(result.lastInsertRowid);

      // A senha temporária só existe nesta resposta — o admin deve repassá-la
      // ao usuário por um canal seguro (ou o usuário troca no primeiro login,
      // caso um fluxo de "trocar senha" seja adicionado depois).
      res.status(201).json({ user, tempPassword });
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
      }
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }
);

// ── Editar usuário (nome, role, active) ─────────────────────────────────
router.patch('/:id',
  param('id').isInt(),
  body('name').optional().trim().isLength({ min: 2 }),
  body('role').optional().isIn(['ADMIN', 'USER']),
  body('active').optional().isBoolean(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const targetId = Number(req.params.id);
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { name, role, active } = req.body;

    // Autoproteção: admin não pode remover o próprio acesso de admin nem se
    // desativar — evita perder o acesso administrativo por engano.
    const isSelf = targetId === req.user.id;
    if (isSelf && role && role !== 'ADMIN') {
      return res.status(400).json({ error: 'Você não pode remover seu próprio acesso de administrador' });
    }
    if (isSelf && active === false) {
      return res.status(400).json({ error: 'Você não pode desativar sua própria conta' });
    }

    // Autoproteção: não deixa rebaixar/desativar o último admin ativo do sistema.
    if ((role === 'USER' || active === false) && target.role === 'ADMIN') {
      const activeAdmins = db.prepare(
        "SELECT COUNT(*) AS total FROM users WHERE role = 'ADMIN' AND active = 1"
      ).get().total;
      if (activeAdmins <= 1) {
        return res.status(400).json({ error: 'Não é possível remover o último administrador ativo' });
      }
    }

    const updates = [];
    const params = [];
    if (name != null)   { updates.push('name = ?');   params.push(name); }
    if (role != null)   { updates.push('role = ?');   params.push(role); }
    if (active != null) { updates.push('active = ?'); params.push(active ? 1 : 0); }

    if (!updates.length) return res.status(400).json({ error: 'Nada para atualizar' });

    params.push(targetId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const user = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(targetId);
    res.json({ user });
  }
);

// ── Resetar senha (gera nova senha temporária) ──────────────────────────
router.post('/:id/reset-password', param('id').isInt(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const targetId = Number(req.params.id);
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

  const tempPassword = crypto.randomBytes(9).toString('base64url');
  const hash = await bcrypt.hash(tempPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, targetId);

  res.json({ tempPassword });
});

// ── Excluir usuário ──────────────────────────────────────────────────────
router.delete('/:id', param('id').isInt(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const targetId = Number(req.params.id);

  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
  }

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (target.role === 'ADMIN') {
    const activeAdmins = db.prepare(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'ADMIN' AND active = 1"
    ).get().total;
    if (activeAdmins <= 1) {
      return res.status(400).json({ error: 'Não é possível excluir o último administrador' });
    }
  }

  // ON DELETE CASCADE no schema já remove transações/defi/transfers do usuário.
  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  res.json({ ok: true });
});

module.exports = router;
