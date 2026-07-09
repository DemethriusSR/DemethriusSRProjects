require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { getPrices } = require('./services/priceEngine');
const { initDatabase } = require('./bootstrap');

initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Muitas tentativas. Tente em 15 minutos.' } }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/portfolio',   require('./routes/portfolio'));
app.use('/api/defi',        require('./routes/defi'));
app.use('/api/transfers',   require('./routes/transfers'));
app.use('/api/export',      require('./routes/export'));

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// force=true é necessário: com force=false a função só lê o cache (getCached())
// e nunca busca preços/taxa novos, deixando tudo "congelado" no valor do boot.
cron.schedule('*/3 * * * *', async () => {
  try { await getPrices(true); } catch (e) { console.error('Erro no refresh agendado de preços:', e.message); }
});

app.listen(PORT, () => {
  console.log(`\n🚀 CryptoTrack API rodando na porta ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
  getPrices(true).catch(() => {});
});
