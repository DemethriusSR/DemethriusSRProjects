const db = require('./db/database');
const { runSeeds } = require('./db/seed')

function initDatabase() {
  const hasTables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'
  `).get();

  if (!hasTables) {
    console.log('🌱 Rodando seeds iniciais...');
    runSeeds();
  } else {
    console.log('📦 Banco já inicializado');
  }
}

module.exports = { initDatabase };