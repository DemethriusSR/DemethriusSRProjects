# 🪙 CryptoTrack

Aplicação fullstack para controle de portfólio de criptomoedas.

**Stack:** React 18 + Tailwind CSS · Node.js + Express · SQLite · Docker

---

## 📦 Estrutura do projeto

```
cryptotrack/
├── docker-compose.yml          # Orquestração completa
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js           # Entrypoint Express
│       ├── db/
│       │   └── database.js     # Schema SQLite + conexão
│       ├── middleware/
│       │   └── auth.js         # JWT
│       ├── routes/
│       │   ├── auth.js         # POST /register, /login, GET /me
│       │   ├── transactions.js # CRUD transações
│       │   ├── portfolio.js    # Cálculo P&L + preços
│       │   ├── defi.js         # Posições DeFi
│       │   └── export.js       # Import/Export XLSX
│       └── services/
│           └── coingecko.js    # API de preços + cache
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx             # Roteamento
        ├── store.js            # Estado global (Zustand)
        ├── main.jsx
        ├── index.css
        ├── components/
        │   ├── ui.jsx          # Componentes reutilizáveis
        │   ├── Sidebar.jsx
        │   └── TransactionModal.jsx
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── Transactions.jsx
        │   ├── Portfolio.jsx
        │   ├── DeFi.jsx
        │   ├── Prices.jsx
        │   ├── Settings.jsx
        │   └── Login.jsx
        ├── hooks/
        │   └── useAsync.js
        └── services/
            ├── api.js          # Axios + interceptors
            └── xlsx.js         # Import/Export planilhas
```

---

## 🚀 Rodando com Docker (recomendado)

```bash
# 1. Clone ou extraia o projeto
cd cryptotrack

# 2. Suba tudo com um comando
docker-compose up -d --build

# Acesse:
# Frontend → http://localhost:3000
# API      → http://localhost:3001
# Health   → http://localhost:3001/health
```

Para parar:
```bash
docker-compose down
```

Para ver logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## 🛠️ Rodando localmente (desenvolvimento)

### Backend

```bash
cd backend
cp .env.example .env          # Edite as variáveis se necessário
npm install
npm run dev                   # nodemon — hot reload
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # Vite dev server → http://localhost:3000
```

---

## 🔌 API — Endpoints

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro |
| POST | `/api/auth/login` | Login → JWT |
| GET  | `/api/auth/me` | Perfil autenticado |

### Transações *(requer Bearer token)*
| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/api/transactions` | Listar (filtros: asset, type, from, to) |
| POST   | `/api/transactions` | Criar |
| PUT    | `/api/transactions/:id` | Editar |
| DELETE | `/api/transactions/:id` | Remover |

### Portfólio *(requer Bearer token)*
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/portfolio/summary` | P&L completo + preços atuais |
| GET | `/api/portfolio/prices` | Cotações em cache ou ao vivo |
| GET | `/api/portfolio/history/:symbol` | Histórico de um ativo |

### DeFi *(requer Bearer token)*
| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/api/defi` | Listar posições |
| POST   | `/api/defi` | Criar posição |
| PATCH  | `/api/defi/:id/rewards` | Atualizar recompensas |
| PATCH  | `/api/defi/:id/close` | Encerrar posição |
| DELETE | `/api/defi/:id` | Remover |

### Import / Export
| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/api/export/transactions` | Exportar JSON para XLSX |
| GET    | `/api/export/defi` | Exportar DeFi |
| POST   | `/api/export/transactions` | Importar array de linhas |

---

## 📊 Funcionalidades

- ✅ Dashboard com KPIs: total investido, valor atual, P&L, ROI
- ✅ Registro de Compra, Venda, Swap, DeFi, Hold
- ✅ Cálculo de preço médio e P&L por ativo (FIFO)
- ✅ Controle de posições DeFi: Staking, Yield Farming, Liquidity Pool
- ✅ Cotações ao vivo via CoinGecko (atualiza a cada 60s, com cache SQLite)
- ✅ Importação e exportação de planilhas XLSX
- ✅ Autenticação JWT multi-usuário
- ✅ Gráficos de alocação e ROI (Recharts)
- ✅ Filtros e busca em transações

---

## ⚙️ Variáveis de ambiente

### Backend (`.env`)
| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3001` | Porta da API |
| `DB_PATH` | `./data/cryptotrack.db` | Caminho do banco SQLite |
| `JWT_SECRET` | *(obrigatório em produção)* | Chave secreta JWT |
| `PRICE_CACHE_TTL` | `60` | Segundos entre atualizações de preço |

### Frontend (`.env`)
| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VITE_API_URL` | `/api` | URL base da API |

---

## 🔒 Segurança em produção

1. Troque `JWT_SECRET` por uma string longa e aleatória
2. Configure HTTPS no nginx ou use um reverse proxy (Traefik, Caddy)
3. Restrinja o CORS no `server.js` para seu domínio
4. O banco SQLite fica em volume Docker — faça backup do volume `sqlite_data`

---

## 🧩 Próximos passos sugeridos

- [ ] Notificações de alertas de preço
- [ ] Suporte a múltiplas moedas fiduciárias (USD, EUR)
- [ ] Relatório de imposto de renda (planilha GCAP)
- [ ] Integração com exchanges via API (Binance, Coinbase)
- [ ] PWA / app mobile
