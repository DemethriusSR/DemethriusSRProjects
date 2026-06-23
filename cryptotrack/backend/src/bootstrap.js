const db = require('./db/database');
const { runSeeds } = require('./db/seed');

function initDatabase() {

  const userCount =
    db.prepare(`
      SELECT COUNT(*) AS total
      FROM users
    `).get();

  if (
    !userCount ||
    userCount.total === 0
  ) {

    console.log(
      '🌱 Executando seed inicial...'
    );

    runSeeds();

  } else {

    console.log(
      '📦 Banco já inicializado'
    );
  }
}

module.exports = {
  initDatabase
};