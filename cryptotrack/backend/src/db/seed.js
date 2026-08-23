const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./database');

function runSeeds() {

  console.log('🌱 Iniciando Seed...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
  let adminPassword = process.env.ADMIN_PASSWORD;
  let generatedPassword = false;

  if (!adminPassword) {
    // Sem senha definida no .env: gera uma senha aleatória forte em vez de
    // usar um valor fixo/previsível. Só é exibida uma vez, no log do boot.
    adminPassword = crypto.randomBytes(9).toString('base64url');
    generatedPassword = true;
  }

  const existingUser =
    db.prepare(`
      SELECT id
      FROM users
      WHERE email = ?
    `).get(
      adminEmail
    );

  let userId;

  if (!existingUser) {

    const hash =
      bcrypt.hashSync(
        adminPassword,
        10
      );

    const result =
      db.prepare(`
        INSERT INTO users (
          email,
          name,
          password,
          role
        )
        VALUES (?, ?, ?, 'ADMIN')
      `).run(
        adminEmail,
        'Administrador',
        hash
      );

    userId =
      result.lastInsertRowid;

    console.log('✅ Usuário admin criado:', adminEmail);
    if (generatedPassword) {
      console.log('🔑 Senha gerada automaticamente (guarde agora, não será exibida novamente):');
      console.log(`   ${adminPassword}`);
      console.log('   Dica: defina ADMIN_PASSWORD no seu .env para controlar essa senha você mesmo.');
    }

  } else {

    userId =
      existingUser.id;

    // Duas correções importantes para instalações que já tinham um admin
    // criado ANTES dessas mudanças (ex: pelo seed antigo, ou antes da
    // migração da coluna role):
    //
    // 1) A migração `ALTER TABLE users ADD COLUMN role DEFAULT 'USER'`
    //    aplica 'USER' a todas as linhas já existentes — inclusive o admin
    //    original. Sem este passo, ele perderia o acesso de administrador
    //    silenciosamente na primeira subida após a migração.
    // 2) Trocar ADMIN_PASSWORD no .env só tem efeito na CRIAÇÃO do usuário;
    //    como ele já existe, sincronizamos a senha aqui sempre que a env
    //    estiver definida explicitamente — assim, redefinir a senha no
    //    .env + reiniciar o container passa a funcionar de verdade.
    const updates = ["role = 'ADMIN'", 'active = 1'];
    const params = [];

    if (process.env.ADMIN_PASSWORD) {
      updates.push('password = ?');
      params.push(bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10));
    }

    params.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    console.log('ℹ️ Usuário admin já existe — role/active sincronizados' + (process.env.ADMIN_PASSWORD ? ' e senha atualizada a partir do ADMIN_PASSWORD do .env' : ''));
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