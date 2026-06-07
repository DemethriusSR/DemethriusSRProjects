import React, { useEffect } from 'react'
import { usePortfolioStore } from '../store'
import { COIN_COLORS, useFmt, fmt, Spinner, Empty } from '../components/ui'

const COIN_NAMES = {
  BTC:'Bitcoin', ETH:'Ethereum', BNB:'BNB', SOL:'Solana', ADA:'Cardano',
  DOT:'Polkadot', AVAX:'Avalanche', MATIC:'Polygon', LINK:'Chainlink',
  XRP:'Ripple', UNI:'Uniswap', ATOM:'Cosmos', LTC:'Litecoin',
  DOGE:'Dogecoin', SHIB:'Shiba Inu', USDT:'Tether', USDC:'USD Coin',
  TRX:'TRON', TON:'Toncoin', PEPE:'Pepe'
}

export default function Prices() {
  const { prices, priceStatus, fetchPrices } = usePortfolioStore()
  const { fmtCoinPrice, btcUnit, currency } = useFmt()

  useEffect(() => { fetchPrices() }, [])

  // Remove a chave interna __rate da exibição
  const entries = Object.entries(prices)
    .filter(([sym]) => sym !== '__rate')
    .sort((a, b) => (b[1].price || 0) - (a[1].price || 0))

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cotações</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Atualizado a cada 60s · CoinGecko ·{' '}
            <span className="text-zinc-400 font-medium">{currency}</span>
            {' · BTC em '}
            <span className="text-zinc-400 font-medium">{btcUnit}</span>
          </p>
        </div>
        <button className="btn" onClick={() => fetchPrices(true)}>
          <i className={`ti ti-refresh ${priceStatus === 'loading' ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Ativo</th>
              <th>Preço {btcUnit === 'SATS' ? '(por sat)' : `(${currency})`}</th>
              <th>Var. 24h</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {priceStatus === 'loading' && !entries.length ? (
              <tr><td colSpan={5}><Spinner /></td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={5}><Empty text="Nenhuma cotação disponível. Verifique a conexão com a API." /></td></tr>
            ) : entries.map(([sym, d], i) => (
              <tr key={sym}>
                <td className="muted text-xs">{i + 1}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: (COIN_COLORS[sym]||'#888')+'22', color: COIN_COLORS[sym]||'#888' }}>
                      {sym.slice(0,2)}
                    </div>
                    <div>
                      <div className="font-medium">{sym}</div>
                      <div className="text-xs muted">{COIN_NAMES[sym] || ''}</div>
                    </div>
                  </div>
                </td>
                <td className="font-mono font-medium">
                  {fmtCoinPrice(sym, d.price, d.priceUsd)}
                </td>
                <td className={d.change24h >= 0 ? 'up' : 'down'}>
                  {d.change24h >= 0 ? '▲' : '▼'} {fmt(Math.abs(d.change24h), 2)}%
                </td>
                <td>
                  <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Ao vivo
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
