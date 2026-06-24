const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH =
  process.env.DB_PATH ||
  path.join(__dirname, '../../data/cryptotrack.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Performance / segurança
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ────────────────────────────────────────────────
 * SCHEMA PRINCIPAL (FONTE DA VERDADE)
 * ──────────────────────────────────────────────── */
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Compra','Venda','Swap','DeFi','Hold')),
  asset TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  fee REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  exchange TEXT,
  origin_asset TEXT,
  origin_qty REAL,
  obs TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS defi_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  protocol TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Staking','Yield Farming','Liquidity Pool')),
  asset TEXT NOT NULL,
  deposited REAL NOT NULL DEFAULT 0,
  apy REAL NOT NULL DEFAULT 0,
  rewards REAL NOT NULL DEFAULT 0,
  exit_date TEXT,
  withdrawn REAL,
  obs TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

/* ────────────────────────────────────────────────
 * PRICE CACHE (CORRIGIDO E PADRONIZADO)
 * ──────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS price_cache (
  symbol TEXT PRIMARY KEY,
  price_brl REAL NOT NULL DEFAULT 0,
  price_usd REAL NOT NULL DEFAULT 0,
  change_24h_usd REAL DEFAULT 0,
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

/* ────────────────────────────────────────────────
 * EXCHANGE RATE (USD/BRL)
 * ──────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS exchange_rates (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  usd_brl REAL NOT NULL DEFAULT 5.70,
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

INSERT OR IGNORE INTO exchange_rates (id, usd_brl)
VALUES (1, 5.70);

/* ────────────────────────────────────────────────
 * INDEXES
 * ──────────────────────────────────────────────── */
CREATE INDEX IF NOT EXISTS idx_txn_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_txn_asset ON transactions(user_id, asset);
CREATE INDEX IF NOT EXISTS idx_defi_user ON defi_positions(user_id);
`);

module.exports = db;
module.exports.DB_PATH = DB_PATH;