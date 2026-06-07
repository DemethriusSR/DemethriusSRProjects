import React, { useState } from 'react'
import { Modal, COINS } from './ui'
import { usePortfolioStore } from '../store'

const today = () => new Date().toISOString().split('T')[0]

export default function TransactionModal({ onClose }) {
  const { addTransaction } = usePortfolioStore()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: today(), type: 'Compra', asset: 'BTC',
    qty: '', price: '', fee: '0', exchange: '', origin_asset: '', origin_qty: '', obs: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const total = (parseFloat(form.qty) || 0) * (parseFloat(form.price) || 0)

  async function handleSubmit() {
    if (!form.qty || !form.price) return
    setSaving(true)
    try {
      await addTransaction({
        ...form,
        qty: parseFloat(form.qty),
        price: parseFloat(form.price),
        fee: parseFloat(form.fee) || 0,
        origin_qty: form.origin_qty ? parseFloat(form.origin_qty) : null
      })
      onClose()
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Nova Transação" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Data</label>
            <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Tipo</label>
            <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
              {['Compra','Venda','Swap','DeFi','Hold'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Ativo</label>
            <select className="input" value={form.asset} onChange={e => set('asset', e.target.value)}>
              {COINS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Quantidade</label>
            <input className="input font-mono" type="number" step="any" placeholder="0.00000000" value={form.qty} onChange={e => set('qty', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Preço unit. (R$)</label>
            <input className="input font-mono" type="number" step="any" placeholder="0,00" value={form.price} onChange={e => set('price', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Taxa (R$)</label>
            <input className="input font-mono" type="number" step="any" placeholder="0,00" value={form.fee} onChange={e => set('fee', e.target.value)} />
          </div>
        </div>

        {form.type === 'Swap' && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Ativo de origem</label>
              <select className="input" value={form.origin_asset} onChange={e => set('origin_asset', e.target.value)}>
                <option value="">Selecione</option>
                {COINS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Qtd. de origem</label>
              <input className="input font-mono" type="number" step="any" value={form.origin_qty} onChange={e => set('origin_qty', e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Exchange / Plataforma</label>
            <input className="input" placeholder="Binance, Foxbit, Coinbase..." value={form.exchange} onChange={e => set('exchange', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Observações</label>
            <input className="input" placeholder="Opcional" value={form.obs} onChange={e => set('obs', e.target.value)} />
          </div>
        </div>

        {total > 0 && (
          <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg text-sm">
            <span className="text-zinc-400">Total da operação</span>
            <span className="font-semibold font-mono">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <><i className="ti ti-loader-2 animate-spin" /> Salvando...</> : <><i className="ti ti-check" /> Salvar</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}
