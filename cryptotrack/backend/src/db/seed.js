const bcrypt = require('bcryptjs');
const db = require('./database');

function runSeeds() {

  console.log('🌱 Iniciando Seed...');

  const existingUser =
    db.prepare(`
      SELECT id
      FROM users
      WHERE email = ?
    `).get(
      'admin@admin.com'
    );

  let userId;

  if (!existingUser) {

    const hash =
      bcrypt.hashSync(
        'admin123',
        10
      );

    const result =
      db.prepare(`
        INSERT INTO users (
          email,
          name,
          password
        )
        VALUES (?, ?, ?)
      `).run(
        'admin@admin.com',
        'Administrador',
        hash
      );

    userId =
      result.lastInsertRowid;

    console.log('✅ Usuário admin criado');

  } else {

    userId =
      existingUser.id;

    console.log('ℹ️ Usuário admin já existe');
  }

  const txCount =
    db.prepare(`
      SELECT COUNT(*) total
      FROM transactions
      WHERE user_id = ?
    `).get(userId);

  if (
    txCount.total === 0
  ) {

    const insert =
      db.prepare(`
      INSERT INTO transactions (
        user_id,
        date,
        type,
        asset,
        qty,
        price,
        fee,
        total,
        exchange
      )
      VALUES (
        ?,?,?,?,?,?,?,?,?
      )
    `);

    const seedTx = [
      [
        userId,
        '2024-01-10',
        'Compra',
        'BTC',
        0.05,
        220000,
        15,
        11000,
        'Binance'
      ],

      [
        userId,
        '2024-02-14',
        'Compra',
        'ETH',
        0.8,
        13000,
        8,
        10400,
        'Binance'
      ],

      [
        userId,
        '2024-03-01',
        'Compra',
        'SOL',
        12,
        600,
        3,
        7200,
        'Foxbit'
      ]
    ];

    const tx =
      db.transaction(rows => {
        rows.forEach(
          row =>
            insert.run(...row)
        );
      });

    tx(seedTx);

    console.log('✅ Transações seed inseridas');

  } else {

    console.log('ℹ️ Seed de transações ignorada');
  }

  const defiCount =
    db.prepare(`
      SELECT COUNT(*) total
      FROM defi_positions
      WHERE user_id = ?
    `).get(userId);

  if (
    defiCount.total === 0
  ) {

    const insertDefi =
      db.prepare(`
      INSERT INTO defi_positions (
        user_id,
        start_date,
        protocol,
        type,
        asset,
        deposited,
        apy,
        rewards,
        exit_date,
        withdrawn
      )
      VALUES (
        ?,?,?,?,?,?,?,?,?,?
      )
    `);

    insertDefi.run(
      userId,
      '2024-03-01',
      'Aave',
      'Staking',
      'ETH',
      15000,
      4.2,
      450,
      null,
      null
    );

    insertDefi.run(
      userId,
      '2024-05-10',
      'PancakeSwap',
      'Yield Farming',
      'BNB',
      5000,
      18.5,
      620,
      null,
      null
    );

    console.log('✅ Posições DeFi inseridas');
  }

  console.log('🎉 Seed concluído');
}

module.exports = {
  runSeeds
};