import React, { useEffect, useState } from 'react'
import { usePortfolioStore } from '../store'
import { KpiCard, CoinBadge, TypeBadge, useFmt, fmt, pct, Spinner, Empty } from '../components/ui'
import TransactionModal from '../components/TransactionModal'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#F7931A','#627EEA','#F3BA2F','#9945FF','#0033AD','#E6007A','#E84142','#8247E5','#2A5ADA','#00AAE4']

export default function Dashboard() {
  const { summary, loading, fetchSummary, fetchPrices, transactions, fetchTransactions } = usePortfolioStore()
  const { fmtMoney, fmtQty, isUSD } = useFmt()
  const [modal, setModal] = useState(false)

  useEffect(() => {
    fetchPrices()       // busca preços + taxa USD/BRL primeiro
    fetchSummary()      // depois o summary (que também retorna usdBrl)
    fetchTransactions()
  }, [])

  if (loading && !summary) return <Spinner />

  const s         = summary || {}
  const portfolio = s.portfolio || []
  const recent    = [...(transactions || [])].slice(0, 6)
  const pieData   = portfolio.slice(0, 8).map(p => ({ name: p.symbol, value: p.currentValue }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Visão geral do seu portfólio</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <i className="ti ti-plus" /> Nova transação
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Total Investido"
          value={fmtMoney(s.totalInvested, s.totalInvestedUsd)}
          sub={`${s.transactionCount || 0} transações`}
        />
        <KpiCard
          label="Valor Atual"
          value={fmtMoney(s.totalValue, s.totalValueUsd)}
          sub={`${s.assetsCount || 0} ativos`}
        />
        <KpiCard
          label="Lucro / Prejuízo"
          value={fmtMoney(s.totalPL, s.totalPlUsd)}
          color={(s.totalPL || 0) >= 0 ? 'up' : 'down'}
          sub={(s.totalPL || 0) >= 0 ? '▲ acima do custo' : '▼ abaixo do custo'}
        />
        <KpiCard
          label="ROI Total"
          value={pct(s.totalROI || 0)}
          color={(s.totalROI || 0) >= 0 ? 'up' : 'down'}
          sub="Retorno acumulado"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-medium mb-4">Distribuição do portfólio</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, _, props) => {
                    const item = portfolio.find(p => p.symbol === props.name)
                    return fmtMoney(v, item?.currentValueUsd)
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {pieData.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className="w-2 h-2 rounded-sm" style={{ background: COLORS[i] }} />{d.name}
                  </span>
                ))}
              </div>
            </>
          ) : <Empty text="Adicione transações para ver a alocação" />}
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 text-sm font-medium">Ativos em destaque</div>
          <table className="w-full">
            <thead><tr><th>Ativo</th><th>Valor</th><th>ROI</th></tr></thead>
            <tbody>
              {portfolio.slice(0, 6).map(p => (
                <tr key={p.symbol}>
                  <td><div className="flex items-center gap-2"><CoinBadge symbol={p.symbol} />{p.symbol}</div></td>
                  <td className="font-mono text-xs">{fmtMoney(p.currentValue, p.currentValueUsd)}</td>
                  <td className={p.roi >= 0 ? 'up' : 'down'}>{pct(p.roi)}</td>
                </tr>
              ))}
              {!portfolio.length && <tr><td colSpan={3}><Empty text="Nenhuma posição ainda" /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Últimas transações</h2>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr><th>Data</th><th>Tipo</th><th>Ativo</th><th>Qtd.</th><th>Preço</th><th>Total</th><th>Exchange</th></tr></thead>
            <tbody>
              {recent.map(t => (
                <tr key={t.id}>
                  <td className="muted">{t.date}</td>
                  <td><TypeBadge type={t.type} /></td>
                  <td><div className="flex items-center gap-2"><CoinBadge symbol={t.asset} size={22} />{t.asset}</div></td>
                  <td className="font-mono text-xs">{fmtQty(t.asset, t.qty)}</td>
                  <td className="font-mono text-xs">{fmtMoney(t.price)}</td>
                  <td className="font-mono text-xs">{fmtMoney(t.total)}</td>
                  <td className="muted">{t.exchange || '—'}</td>
                </tr>
              ))}
              {!recent.length && <tr><td colSpan={7}><Empty text="Nenhuma transação. Clique em Nova transação." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <TransactionModal onClose={() => { setModal(false); fetchSummary() }} />}
    </div>
  )
}
