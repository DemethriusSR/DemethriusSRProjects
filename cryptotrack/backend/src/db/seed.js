/**
 * Seed script — popula o banco com dados de demonstração.
 * Uso: node src/db/seed.js
 */
const db = require('./database');
const bcrypt = require('bcryptjs');

console.log('🌱 Iniciando seed...');

// 1. Usuário demo
const hash = bcrypt.hashSync('admin123', 10);
let userId;
try {
  const r = db.prepare(`INSERT INTO users (email, name, password) VALUES (?, ?, ?)`).run('admin@admin.com', 'Admin User', hash);
  userId = r.lastInsertRowid;
  console.log(`✅ Usuário criado: admin@admin.com / admin123 (id=${userId})`);
} catch {
  userId = db.prepare(`SELECT id FROM users WHERE email = ?`).get('admin@admin.com')?.id;
  console.log(`ℹ️  Usuário já existe, usando id=${userId}`);
}

// 2. Transações
const txns = [
  { date:'2024-01-10', type:'Compra', asset:'BTC', qty:0.05,   price:220000, fee:15, exchange:'Binance' },
  { date:'2024-02-14', type:'Compra', asset:'ETH', qty:0.8,    price:13000,  fee:8,  exchange:'Binance' },
  { date:'2024-03-01', type:'Compra', asset:'SOL', qty:12,      price:600,    fee:3,  exchange:'Foxbit'  },
  { date:'2024-04-05', type:'Compra', asset:'BNB', qty:2,       price:1800,   fee:4,  exchange:'Binance' },
  { date:'2024-05-20', type:'Compra', asset:'BTC', qty:0.02,   price:340000, fee:12, exchange:'Binance' },
  { date:'2024-06-10', type:'Venda',  asset:'SOL', qty:4,       price:780,    fee:5,  exchange:'Foxbit'  },
  { date:'2024-07-15', type:'Compra', asset:'LINK',qty:50,      price:65,     fee:4,  exchange:'Coinbase'},
  { date:'2024-08-22', type:'Swap',   asset:'ADA', qty:3000,    price:2.5,    fee:2,  exchange:'Binance', origin_asset:'BNB', origin_qty:1 },
  { date:'2024-09-30', type:'Compra', asset:'POL',qty:500,    price:3.1,    fee:2,  exchange:'Binance' },
  { date:'2024-10-12', type:'Compra', asset:'ETH', qty:0.3,    price:16000,  fee:6,  exchange:'Binance' },
];

const insert = db.prepare(`
  INSERT INTO transactions (user_id, date, type, asset, qty, price, fee, total, exchange, origin_asset, origin_qty)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertMany = db.transaction(rows => rows.forEach(r => insert.run(userId, r.date, r.type, r.asset, r.qty, r.price, r.fee||0, r.qty*r.price, r.exchange, r.origin_asset||null, r.origin_qty||null)));
insertMany(txns);
console.log(`✅ ${txns.length} transações inseridas`);

// 3. DeFi positions
const defis = [
  { start_date:'2024-03-01', protocol:'Aave',       type:'Staking',         asset:'ETH',  deposited:15000, apy:4.2, rewards:450 },
  { start_date:'2024-05-10', protocol:'PancakeSwap', type:'Yield Farming',   asset:'BNB',  deposited:5000,  apy:18.5,rewards:620 },
  { start_date:'2024-06-01', protocol:'Uniswap V3',  type:'Liquidity Pool',  asset:'ETH',  deposited:12000, apy:11.2,rewards:980 },
  { start_date:'2024-08-15', protocol:'Lido',        type:'Staking',         asset:'ETH',  deposited:8000,  apy:3.8, rewards:210, exit_date:'2024-11-15', withdrawn:8800 },
];

const insertDefi = db.prepare(`
  INSERT INTO defi_positions (user_id, start_date, protocol, type, asset, deposited, apy, rewards, exit_date, withdrawn)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertManyDefi = db.transaction(rows => rows.forEach(r => insertDefi.run(userId, r.start_date, r.protocol, r.type, r.asset, r.deposited, r.apy, r.rewards, r.exit_date||null, r.withdrawn||null)));
insertManyDefi(defis);
console.log(`✅ ${defis.length} posições DeFi inseridas`);

console.log('\n🎉 Seed concluído!');
console.log('   Login: admin@admin.com');
console.log('   Senha: admin123');
