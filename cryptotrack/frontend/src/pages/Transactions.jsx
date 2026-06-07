import React, { useEffect, useState } from 'react'
import { usePortfolioStore } from '../store'
import { CoinBadge, TypeBadge, useFmt, fmt, Spinner, Empty } from '../components/ui'
import TransactionModal from '../components/TransactionModal'

const TYPES = ['Todas','Compra','Venda','Swap','DeFi','Hold']

export default function Transactions() {
  const { transactions, fetchTransactions, deleteTransaction, loading } = usePortfolioStore()
  const { fmtMoney, fmtBtc, btcUnit } = useFmt()
  const [modal, setModal] = useState(false)
  const [filter, setFilter] = useState('Todas')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchTransactions() }, [])

  const filtered = transactions.filter(t => {
    if (filter !== 'Todas' && t.type !== filter) return false
    if (search && !t.asset.includes(search.toUpperCase()) && !(t.exchange||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function handleDelete(id) {
    if (!confirm('Remover esta transação?')) return
    setDeleting(id)
    await deleteTransaction(id)
    setDeleting(null)
  }

  function fmtQty(sym, qty) {
    if (sym === 'BTC') return fmtBtc(qty)
    return fmt(qty, 6)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Transações</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{transactions.length} registros</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <i className="ti ti-plus" /> Nova transação
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter===t ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm" />
          <input className="input pl-9 w-52" placeholder="Filtrar por ativo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th>Data</th><th>Tipo</th><th>Ativo</th>
              <th>Qtd.{btcUnit === 'SATS' ? ' (sats p/ BTC)' : ''}</th>
              <th>Preço unit.</th><th>Taxa</th><th>Total c/ Taxa</th>
              <th>Exchange</th><th>Obs.</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10}><Spinner /></td></tr>
            ) : filtered.length ? filtered.map(t => (
              <tr key={t.id}>
                <td className="muted text-xs">{t.date}</td>
                <td><TypeBadge type={t.type} /></td>
                <td><div className="flex items-center gap-2"><CoinBadge symbol={t.asset} size={22} /><span className="font-medium">{t.asset}</span></div></td>
                <td className="font-mono text-xs">{fmtQty(t.asset, t.qty)}</td>
                <td className="font-mono text-xs">{fmtMoney(t.price)}</td>
                <td className="font-mono text-xs muted">{fmtMoney(t.fee)}</td>
                <td className="font-mono text-xs">{fmtMoney(t.total + t.fee)}</td>
                <td className="muted text-xs">{t.exchange || '—'}</td>
                <td className="muted text-xs max-w-24 truncate" title={t.obs}>{t.obs || '—'}</td>
                <td>
                  <button className="btn btn-danger p-1.5" onClick={() => handleDelete(t.id)} disabled={deleting === t.id}>
                    <i className={`ti ${deleting === t.id ? 'ti-loader-2 animate-spin' : 'ti-trash'} text-sm`} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={10}><Empty text="Nenhuma transação encontrada." /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && <TransactionModal onClose={() => { setModal(false); fetchTransactions() }} />}
    </div>
  )
}
