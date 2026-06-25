import React, { useEffect } from 'react'
import { usePortfolioStore } from '../store'
import { KpiCard, CoinBadge, useFmt, fmt, pct, Spinner, Empty } from '../components/ui'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const COLORS = ['#F7931A','#627EEA','#F3BA2F','#9945FF','#0033AD','#E6007A','#E84142','#8247E5','#2A5ADA','#00AAE4']

export default function Portfolio() {
  const { summary, loading, fetchSummary, fetchPrices } = usePortfolioStore()
  const { fmtMoney, fmtCoinPriceFull, fmtQty, btcUnit, currency } = useFmt()

  useEffect(() => { fetchPrices(); fetchSummary() }, [])

  if (loading && !summary) return <Spinner />

  const s         = summary || {}
  const portfolio = s.portfolio || []
  const totalVal  = s.totalValue || 0
  const pieData   = portfolio.slice(0, 10).map(p => ({ name: p.symbol, value: p.currentValue }))
  const barData   = portfolio.slice(0, 8).map(p => ({ name: p.symbol, roi: parseFloat(p.roi.toFixed(1)) }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Portfólio</h1>
        <span className="text-xs text-zinc-600 border border-zinc-800 rounded px-2 py-1">
          {currency} · BTC em {btcUnit}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Investido" value={fmtMoney(s.totalInvested, s.totalInvestedUsd)} />
        <KpiCard label="Valor Atual"     value={fmtMoney(s.totalValue, s.totalValueUsd)} />
        <KpiCard label="P/L Total"       value={fmtMoney(s.totalPL, s.totalPlUsd)} color={(s.totalPL||0) >= 0 ? 'up' : 'down'} />
        <KpiCard label="ROI"             value={pct(s.totalROI || 0)} color={(s.totalROI||0) >= 0 ? 'up' : 'down'} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-medium mb-4">Alocação por ativo</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} dataKey="value" paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, _, props) => {
                  const item = portfolio.find(p => p.symbol === props.name)
                  return fmtMoney(v, item?.currentValueUsd)
                }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty text="Sem dados" />}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium mb-4">ROI por ativo (%)</h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top:5, right:10, bottom:5, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fontSize:11, fill:'#71717a' }} />
                <YAxis tick={{ fontSize:11, fill:'#71717a' }} tickFormatter={v => v+'%'} />
                <Tooltip formatter={v => v+'%'} contentStyle={{ background:'#18181b', border:'1px solid #27272a', borderRadius:8 }} />
                <Bar dataKey="roi" radius={[4,4,0,0]}>
                  {barData.map((d, i) => <Cell key={i} fill={d.roi >= 0 ? '#1D9E75' : '#E84142'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty text="Sem dados" />}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 text-sm font-medium">Detalhamento por ativo</div>
        <table className="w-full">
          <thead>
            <tr>
              <th>Ativo</th>
              <th>{btcUnit === 'SATS' ? 'Qtd. (sats)' : 'Qtd.'}</th>
              <th>Preço Atual</th>
              <th>Preço Médio</th>
              <th>Custo Base</th>
              <th>Valor Atual</th>
              <th>P/L</th>
              <th>ROI</th>
              <th>Alocação</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.map(p => {
              const alloc = totalVal > 0 ? (p.currentValue / totalVal) * 100 : 0
              return (
                <tr key={p.symbol}>
                  <td>
                    <div className="flex items-center gap-2">
                      <CoinBadge symbol={p.symbol} />
                      <span className="font-medium">{p.symbol}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{fmtQty(p.symbol, p.qty)}</td>
                  <td className="font-mono text-xs">{fmtCoinPriceFull(p.currentPrice, p.currentPriceUsd)}</td>
                  <td className="font-mono text-xs">{fmtCoinPriceFull(p.avgCost, p.avgCostUsd)}</td>
                  <td className="font-mono text-xs muted">{fmtMoney(p.costBasis, p.costBasisUsd)}</td>
                  <td className="font-mono text-xs">{fmtMoney(p.currentValue, p.currentValueUsd)}</td>
                  <td className={`font-mono text-xs ${p.pl >= 0 ? 'up' : 'down'}`}>
                    {fmtMoney(p.pl, p.plUsd)}
                  </td>
                  <td className={p.roi >= 0 ? 'up' : 'down'}>{pct(p.roi)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: alloc+'%' }} />
                      </div>
                      <span className="text-xs muted">{fmt(alloc,1)}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!portfolio.length && <tr><td colSpan={9}><Empty text="Nenhum ativo. Adicione transações." /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
