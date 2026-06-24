import React, { useState, useRef } from 'react'
import { useAuthStore, usePortfolioStore, usePrefsStore } from '../store'
import { exportTransactionsXLSX, importXLSXToServer, confirmImportToServer, downloadImportTemplate, downloadDatabaseBackup } from '../services/xlsx'
import { CurrencySwap, Modal } from '../components/ui'

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
function ToggleGroup({ value, options, onChange }) {
  return (
    <div className="flex gap-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1">
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            value === opt.value ? 'bg-zinc-600 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function Settings() {
  const { user, logout } = useAuthStore()
  const { fetchTransactions, fetchSummary, priceStatus, fetchPrices } = usePortfolioStore()
  const { currency, btcUnit, setBtcUnit, usdRate } = usePrefsStore()
  const fileRef = useRef()
  const [importing, setImporting]       = useState(false)
  const [exporting, setExporting]       = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [refreshing, setRefreshing]     = useState(false)
  const [backingUp, setBackingUp]       = useState(false)
  const [dupConfirm, setDupConfirm]     = useState(null) // { rows, duplicatesCount, totalRows, duplicates }

  async function handleExport() {
    setExporting(true)
    try { await exportTransactionsXLSX() } catch { alert('Erro ao exportar') } finally { setExporting(false) }
  }

  async function handleImport(e) {
    const file = e.target.files[0]; if (!file) return
    setImporting(true); setImportResult(null)
    try {
      const result = await importXLSXToServer(file)
      if (result.needsConfirmation) {
        // Não importou nada ainda — guarda os rows já parseados para
        // reenviar com confirm=true caso o usuário confirme no modal.
        setDupConfirm(result)
      } else {
        setImportResult(result)
        await fetchTransactions(); await fetchSummary()
      }
    } catch { alert('Erro ao importar arquivo. Verifique o formato.') }
    finally { setImporting(false); e.target.value = '' }
  }

  async function handleConfirmImportWithDuplicates() {
    if (!dupConfirm) return
    setImporting(true)
    try {
      const result = await confirmImportToServer(dupConfirm.rows)
      setImportResult(result)
      setDupConfirm(null)
      await fetchTransactions(); await fetchSummary()
    } catch { alert('Erro ao importar arquivo.') }
    finally { setImporting(false) }
  }

  async function handleRefreshPrices() {
    setRefreshing(true); await fetchPrices(true); setRefreshing(false)
  }

  async function handleBackup() {
    setBackingUp(true)
    try { await downloadDatabaseBackup() } catch { alert('Erro ao gerar backup') } finally { setBackingUp(false) }
  }

  const statusColor = { live:'text-emerald-400', loading:'text-amber-400', error:'text-red-400', idle:'text-zinc-500' }
  const rate = usdRate > 0 ? usdRate : null

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Configurações</h1>

      <Section title="Conta">
        <Row label="Usuário" desc={user?.email}>
          <span className="text-xs text-zinc-500">{user?.name}</span>
        </Row>
        <Row label="Sair da conta" desc="Encerra a sessão atual">
          <button className="btn btn-danger" onClick={logout}><i className="ti ti-logout" /> Sair</button>
        </Row>
      </Section>

      <Section title="Visualização">
        <Row
          label="Moeda de exibição"
          desc={
            rate
              ? `Taxa de câmbio atual: 1 USD = R$ ${rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (via Banco Central)`
              : 'Taxa sendo carregada... acesse Preços para atualizar'
          }
        >
          <CurrencySwap />
        </Row>

        <Row
          label="Unidade do Bitcoin"
          desc={btcUnit === 'SATS'
            ? '1 BTC = 100.000.000 satoshis — ideal para frações pequenas'
            : 'Exibe quantidades e preços em BTC inteiro'}
        >
          <ToggleGroup
            value={btcUnit}
            options={[
              { value: 'BTC',  label: '₿ BTC'  },
              { value: 'SATS', label: '⚡ SATS' },
            ]}
            onChange={setBtcUnit}
          />
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
          <div className="flex items-center gap-2">
            <button className="btn border-dashed border-brand-500/50 text-brand-500 hover:bg-brand-500/10"
              onClick={downloadImportTemplate} title="Baixar planilha modelo">
              <i className="ti ti-file-spreadsheet" /> TemplateImport
            </button>
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
                {importResult.errors.slice(0,5).map((e,i) => <p key={i} className="text-xs text-amber-400">Linha {e.row}: {e.reason}</p>)}
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Backup">
        <Row label="Backup do banco de dados" desc="Baixa uma cópia completa do banco (.db) para guardar em local seguro">
          <button className="btn" onClick={handleBackup} disabled={backingUp}>
            <i className={`ti ${backingUp ? 'ti-loader-2 animate-spin' : 'ti-database-export'}`} />
            {backingUp ? 'Gerando...' : 'Baixar backup'}
          </button>
        </Row>
      </Section>

      <Section title="Cotações">
        <Row label="Status CoinGecko" desc="Preços em BRL e USD atualizados a cada 60 segundos">
          <span className={`text-sm font-medium ${statusColor[priceStatus]}`}>
            {priceStatus === 'live' ? '● Ao vivo' : priceStatus === 'loading' ? '● Atualizando...' : priceStatus === 'error' ? '● Erro na API' : '● Aguardando'}
          </span>
        </Row>
        <Row label="Forçar atualização" desc="Busca preços e taxa de câmbio agora, ignorando o cache">
          <button className="btn" onClick={handleRefreshPrices} disabled={refreshing}>
            <i className={`ti ${refreshing ? 'ti-loader-2 animate-spin' : 'ti-refresh'}`} /> Atualizar agora
          </button>
        </Row>
      </Section>

      <Section title="Sobre">
        <Row label="CryptoTrack" desc="React + Node.js + SQLite · preços via CoinGecko">
          <span className="text-xs text-zinc-600">v1.0.0</span>
        </Row>
        <Row label="Fonte de câmbio" desc="Taxa USD/BRL oficial obtida via API do Banco Central (PTAX)">
          <a href="https://www.bcb.gov.br" target="_blank" rel="noreferrer" className="text-xs text-brand-500 hover:underline">bcb.gov.br</a>
        </Row>
      </Section>

      {dupConfirm && (
        <Modal title="Transações duplicadas encontradas" onClose={() => setDupConfirm(null)} width="520px">
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Encontramos <span className="font-semibold text-amber-400">{dupConfirm.duplicatesCount}</span> de{' '}
              <span className="font-semibold text-zinc-200">{dupConfirm.totalRows}</span> linha(s) com a mesma
              combinação de <span className="font-mono text-zinc-300">Data + Ativo + Quantidade + Preço</span> já
              existente no seu histórico.
            </p>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-800">
              <table className="w-full text-xs">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left p-2">Data</th>
                    <th className="text-left p-2">Ativo</th>
                    <th className="text-left p-2">Qtd.</th>
                    <th className="text-left p-2">Preço</th>
                  </tr>
                </thead>
                <tbody>
                  {dupConfirm.duplicates.map((d, i) => (
                    <tr key={i} className="border-t border-zinc-800/50">
                      <td className="p-2 muted">{d.date}</td>
                      <td className="p-2">{d.asset}</td>
                      <td className="p-2 font-mono">{d.qty}</td>
                      <td className="p-2 font-mono">{d.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dupConfirm.duplicatesCount > dupConfirm.duplicates.length && (
              <p className="text-xs text-zinc-500">
                Mostrando {dupConfirm.duplicates.length} de {dupConfirm.duplicatesCount} duplicatas.
              </p>
            )}

            <p className="text-sm text-zinc-400">
              Deseja importar mesmo assim? Isso vai <span className="font-medium text-zinc-200">duplicar</span> essas
              transações no seu histórico.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button className="btn" onClick={() => setDupConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleConfirmImportWithDuplicates} disabled={importing}>
                {importing ? <><i className="ti ti-loader-2 animate-spin" /> Importando...</> : 'Importar mesmo assim'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
