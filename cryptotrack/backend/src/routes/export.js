const router = require('express').Router();
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const fs = require('fs');
const os = require('os');
const path = require('path');

router.use(requireAuth);

// Backup manual do banco de dados completo (todos os usuários, todas as
// tabelas). Usa db.backup() do better-sqlite3, que faz uma cópia
// consistente mesmo com o banco em uso (WAL ativo, escritas concorrentes),
// em vez de simplesmente ler o arquivo .db do disco.
router.get('/backup', async (req, res) => {
  const tmpPath = path.join(
    os.tmpdir(),
    `cryptotrack-backup-${Date.now()}.db`
  );

  try {
    await db.backup(tmpPath);

    const filename = `cryptotrack-backup-${new Date().toISOString().split('T')[0]}.db`;

    res.download(tmpPath, filename, (err) => {
      // Limpa o arquivo temporário independente de sucesso ou falha no download
      fs.unlink(tmpPath, () => {});
      if (err) console.error('Erro ao enviar backup:', err.message);
    });
  } catch (err) {
    console.error('Erro ao gerar backup do banco:', err.message);
    fs.unlink(tmpPath, () => {});
    res.status(500).json({ error: 'Erro ao gerar backup do banco de dados' });
  }
});

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
//
// Fluxo de proteção contra duplicatas:
// 1) Primeira chamada (sem confirm=true): valida os dados e verifica se
//    alguma linha já existe no banco (mesma data+ativo+qtd+preço). Se
//    houver duplicatas, NADA é inserido — retorna { needsConfirmation:
//    true, duplicates, totalRows } para o frontend exibir um alerta.
// 2) Segunda chamada (com confirm=true, reenviando os mesmos rows):
//    insere tudo, incluindo as duplicatas, pois o usuário já confirmou.
router.post('/transactions', async (req, res) => {
  const { rows, confirm } = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ error: 'Nenhum dado para importar' });

  const VALID_TYPES = ['Compra','Venda','Swap','DeFi','Hold'];

  // Validação prévia (sem tocar no banco) para poder checar duplicatas
  // só com as linhas que de fato seriam inseridas.
  const validRows = [];
  const errors = [];

  rows.forEach((r, i) => {
    if (!r.date || !VALID_TYPES.includes(r.type) || !r.asset) {
      errors.push({ row: i + 1, reason: 'Campos obrigatórios ausentes (date, type, asset)' });
      return;
    }
    validRows.push({
      date: r.date,
      type: r.type,
      asset: r.asset.toUpperCase(),
      qty: parseFloat(r.qty) || 0,
      price: parseFloat(r.price) || 0,
      fee: parseFloat(r.fee) || 0,
      exchange: r.exchange || null,
      origin_asset: r.origin_asset || null,
      origin_qty: r.origin_qty ? parseFloat(r.origin_qty) : null,
      obs: r.obs || null,
    });
  });

  if (!confirm) {
    const existing = db.prepare(`
      SELECT date, asset, qty, price FROM transactions WHERE user_id = ?
    `).all(req.user.id);

    const existingKeys = new Set(
      existing.map(e => `${e.date}|${e.asset}|${e.qty}|${e.price}`)
    );

    const duplicates = validRows.filter(r =>
      existingKeys.has(`${r.date}|${r.asset}|${r.qty}|${r.price}`)
    );

    if (duplicates.length > 0) {
      return res.json({
        needsConfirmation: true,
        duplicatesCount: duplicates.length,
        totalRows: validRows.length,
        duplicates: duplicates.slice(0, 20), // amostra para exibir na UI
      });
    }
  }

  const insert = db.prepare(`
    INSERT INTO transactions (user_id, date, type, asset, qty, price, fee, total, exchange, origin_asset, origin_qty, obs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;

  const run = db.transaction(() => {
    for (const r of validRows) {
      insert.run(req.user.id, r.date, r.type, r.asset, r.qty, r.price, r.fee, r.qty * r.price,
                 r.exchange, r.origin_asset, r.origin_qty, r.obs);
      imported++;
    }
  });

  run();
  res.json({ imported, errors });
});

module.exports = router;
