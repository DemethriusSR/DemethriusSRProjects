import React from 'react'
import { usePrefsStore } from '../store'

export const COIN_COLORS = {
  BTC:'#F7931A', ETH:'#627EEA', BNB:'#F3BA2F', SOL:'#9945FF', ADA:'#0033AD',
  DOT:'#E6007A', AVAX:'#E84142', MATIC:'#8247E5', LINK:'#2A5ADA', XRP:'#00AAE4',
  UNI:'#FF007A', ATOM:'#6F7390', LTC:'#345D9D', DOGE:'#C2A633', SHIB:'#E14D27',
  USDT:'#26A17B', USDC:'#2775CA', TRX:'#EB0029', TON:'#0098EA', PEPE:'#4CAF50',
}

export const COINS = [
  'BTC','ETH','BNB','SOL','ADA','DOT','AVAX','MATIC','LINK','XRP',
  'UNI','ATOM','LTC','DOGE','SHIB','USDT','USDC','TRX','TON','PEPE'
]

// ── Helpers puros (sem contexto) ──────────────────────────────────────────────
export function fmt(v, d = 2) {
  if (v == null || isNaN(v)) return '—'
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
}
export function fmtR(v)  { return 'R$ ' + fmt(v) }
export function fmtUSD(v) {
  if (v == null || isNaN(v)) return '—'
  return '$ ' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
export function pct(v) { return (v >= 0 ? '+' : '') + fmt(v, 1) + '%' }

// ── useFmt — hook principal de formatação ─────────────────────────────────────
/**
 * Retorna fmtMoney(brlValue) e fmtMoney2(brlValue, usdValue)
 *
 * REGRA:
 *   - Backend sempre armazena e retorna valores em BRL.
 *   - summary.portfolio já traz campos *Usd calculados pelo backend com câmbio real.
 *   - Para outros valores (ex: transações) usamos o usdRate do store como fallback.
 *   - Nunca dividimos por 0.
 */
export function useFmt() {
  const { currency, btcUnit, usdRate } = usePrefsStore()
  const isUSD = currency === 'USD'
  // Garante que sempre temos uma taxa válida (fallback = 5.70)
  const rate = usdRate > 0 ? usdRate : 5.70

  /**
   * fmtMoney(brlValue, usdValue?)
   * Se usdValue for passado, usa ele diretamente (mais preciso).
   * Caso contrário converte brlValue pela taxa.
   */
  function fmtMoney(brlValue, usdValue) {
    const rawBrl = brlValue ?? 0
    if (isNaN(rawBrl)) return '—'

    if (isUSD) {
      const v = (usdValue != null && !isNaN(usdValue)) ? usdValue : rawBrl / rate
      return '$ ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return 'R$ ' + rawBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  /** Formata quantidade de BTC respeitando btcUnit */
  function fmtBtc(qty) {
    if (qty == null || isNaN(qty)) return '—'
    if (btcUnit === 'SATS') {
      return Math.round(qty * 1e8).toLocaleString('pt-BR') + ' sats'
    }
    return qty.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 }) + ' BTC'
  }

  /**
   * fmtCoinPrice(symbol, priceBrl, priceUsd?)
   * Para BTC com SATS: mostra preço por satoshi.
   */
  function fmtCoinPrice(symbol, priceBrl, priceUsd) {
    if (symbol === 'BTC' && btcUnit === 'SATS') {
      const baseUsd = (priceUsd ?? priceBrl / rate)
      const satPrice = isUSD ? baseUsd / 1e8 : priceBrl / 1e8
      const satStr = satPrice.toLocaleString(isUSD ? 'en-US' : 'pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 8 })
      return (isUSD ? '$ ' : 'R$ ') + satStr
    }
    return fmtMoney(priceBrl, priceUsd)
  }

  /** Formata quantidade genérica (BTC usa fmtBtc, resto usa decimais fixas) */
  function fmtQty(symbol, qty) {
    if (symbol === 'BTC') return fmtBtc(qty)
    return fmt(qty, 6)
  }

  return {
    fmtMoney, fmtBtc, fmtCoinPrice, fmtQty,
    currency, btcUnit, isUSD, rate,
    symbol: isUSD ? 'USD' : 'BRL',
    prefix: isUSD ? '$' : 'R$',
  }
}

// ── CurrencySwap ──────────────────────────────────────────────────────────────
export function CurrencySwap() {
  const { currency, setCurrency, usdRate } = usePrefsStore()
  const isUSD = currency === 'USD'
  const rate  = usdRate > 0 ? usdRate : null

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={() => setCurrency(isUSD ? 'BRL' : 'USD')}
        title={`Trocar para ${isUSD ? 'Real (BRL)' : 'Dólar (USD)'}`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs font-semibold select-none"
        style={{
          background:   isUSD ? '#1a3a5c' : '#1a3d2b',
          borderColor:  isUSD ? '#2A5ADA44' : '#1D9E7544',
          color:        isUSD ? '#60a5fa'  : '#34d399',
        }}
      >
        <span style={{ opacity: isUSD ? 0.4 : 1 }}>BRL</span>
        <span className="text-zinc-600 text-xs">⇄</span>
        <span style={{ opacity: isUSD ? 1 : 0.4 }}>USD</span>
      </button>
      {rate && (
        <span className="text-zinc-600 text-xs pr-0.5">
          1 USD = R$ {rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )}
    </div>
  )
}

// ── Componentes genéricos ─────────────────────────────────────────────────────
export function KpiCard({ label, value, sub, color }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${color || ''}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  )
}

export function CoinBadge({ symbol, size = 28 }) {
  const color = COIN_COLORS[symbol] || '#888'
  return (
    <div style={{ width: size, height: size, background: color+'22', color, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize: size*0.38, fontWeight:600, flexShrink:0 }}>
      {symbol?.slice(0,2)}
    </div>
  )
}

export function TypeBadge({ type }) {
  const map = { Compra:'buy', Venda:'sell', Swap:'swap', DeFi:'defi', Hold:'hold' }
  return <span className={`badge badge-${map[type]||'hold'}`}>{type}</span>
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-brand-500 rounded-full animate-spin" />
    </div>
  )
}

export function Empty({ text = 'Nenhum dado encontrado.' }) {
  return <div className="text-center text-zinc-600 py-10 text-sm">{text}</div>
}

export function Modal({ title, onClose, children, width = '480px' }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="btn p-1.5"><i className="ti ti-x text-base" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
