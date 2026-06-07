import React, { useState, useRef } from 'react'
import { useAuthStore, usePortfolioStore } from '../store'
import { exportTransactionsXLSX, importXLSXToServer } from '../services/xlsx'

function Section({ title, children }) {
  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-3">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { user, logout } = useAuthStore()
  const { fetchTransactions, fetchSummary, priceStatus, fetchPrices } = usePortfolioStore()
  const fileRef = useRef()
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  async function handleExport() {
    setExporting(true)
    try { await exportTransactionsXLSX() }
    catch { alert('Erro ao exportar') }
    finally { setExporting(false) }
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await importXLSXToServer(file)
      setImportResult(result)
      await fetchTransactions()
      await fetchSummary()
    } catch { alert('Erro ao importar arquivo. Verifique o formato.') }
    finally { setImporting(false); e.target.value = '' }
  }

  async function handleRefreshPrices() {
    setRefreshing(true)
    await fetchPrices(true)
    setRefreshing(false)
  }

  const statusColor = { live:'text-emerald-400', loading:'text-amber-400', error:'text-red-400', idle:'text-zinc-500' }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Configurações</h1>

      <Section title="Conta">
        <Row label="Nome" desc={user?.name}><span className="text-xs text-zinc-500">{user?.email}</span></Row>
        <Row label="Sair da conta" desc="Encerra a sessão atual">
          <button className="btn btn-danger" onClick={logout}><i className="ti ti-logout" /> Sair</button>
        </Row>
      </Section>

      <Section title="Dados — Importar / Exportar">
        <Row label="Exportar XLSX" desc="Baixa todas as transações e posições DeFi em planilha Excel">
          <button className="btn" onClick={handleExport} disabled={exporting}>
            <i className={`ti ${exporting ? 'ti-loader-2 animate-spin' : 'ti-table-export'}`} />
            {exporting ? 'Gerando...' : 'Exportar'}
          </button>
        </Row>

        <Row label="Importar XLSX" desc="Importa transações de uma planilha (.xlsx). Colunas: Data, Tipo, Ativo, Quantidade, Preço, Taxa, Exchange">
          <div className="flex flex-col items-end gap-2">
            <button className="btn" onClick={() => fileRef.current.click()} disabled={importing}>
              <i className={`ti ${importing ? 'ti-loader-2 animate-spin' : 'ti-table-import'}`} />
              {importing ? 'Importando...' : 'Importar'}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </div>
        </Row>

        {importResult && (
          <div className={`p-3 rounded-lg border text-sm ${importResult.errors?.length ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
            <p className="font-medium">{importResult.imported} transações importadas com sucesso.</p>
            {importResult.errors?.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-zinc-400">{importResult.errors.length} linhas ignoradas:</p>
                {importResult.errors.slice(0,5).map((e,i) => (
                  <p key={i} className="text-xs text-amber-400">Linha {e.row}: {e.reason}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Cotações">
        <Row
          label="Status da API CoinGecko"
          desc="Preços atualizados automaticamente a cada 60 segundos">
          <span className={`text-sm font-medium ${statusColor[priceStatus]}`}>
            {priceStatus === 'live' ? '● Ao vivo' : priceStatus === 'loading' ? '● Atualizando...' : priceStatus === 'error' ? '● Erro' : '● Aguardando'}
          </span>
        </Row>
        <Row label="Forçar atualização" desc="Busca os preços agora, ignorando o cache">
          <button className="btn" onClick={handleRefreshPrices} disabled={refreshing}>
            <i className={`ti ${refreshing ? 'ti-loader-2 animate-spin' : 'ti-refresh'}`} />
            Atualizar agora
          </button>
        </Row>
      </Section>

      <Section title="Sobre">
        <Row label="CryptoTrack" desc="Controle de portfólio cripto — React + Node.js + SQLite">
          <span className="text-xs text-zinc-600">v1.0.0</span>
        </Row>
        <Row label="Preços" desc="CoinGecko API (gratuita, sem API key)">
          <a href="https://www.coingecko.com" target="_blank" rel="noreferrer" className="text-xs text-brand-500 hover:underline">coingecko.com</a>
        </Row>
      </Section>
    </div>
  )
}
