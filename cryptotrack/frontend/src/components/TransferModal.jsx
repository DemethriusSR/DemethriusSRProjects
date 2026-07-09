import React, { useState } from 'react'
import { Modal, COINS, HARDWALLETS } from './ui'
import { usePortfolioStore } from '../store'

const today = () => new Date().toISOString().split('T')[0]

export default function TransferModal({ onClose }) {
  const { addTransfer } = usePortfolioStore()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: today(), direction: 'Entrada', asset: 'BTC',
    qty: '', wallet_type: 'COLD', hardwallet: HARDWALLETS.COLD[0],
    counterparty: '', fee: '0', tx_hash: '', obs: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function setWalletType(type) {
    setForm(f => ({ ...f, wallet_type: type, hardwallet: HARDWALLETS[type][0] }))
  }

  async function handleSubmit() {
    if (!form.qty || !form.hardwallet) return
    setSaving(true)
    try {
      await addTransfer({
        ...form,
        qty: parseFloat(form.qty),
        fee: parseFloat(form.fee) || 0
      })
      onClose()
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Nova Transferência" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Data</label>
            <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Tipo</label>
            <select className="input" value={form.direction} onChange={e => set('direction', e.target.value)}>
              <option value="Entrada">Entrada (recebido)</option>
              <option value="Saída">Saída (enviado)</option>
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
            <label className="text-xs text-zinc-500 block mb-1">Tipo de carteira</label>
            <select className="input" value={form.wallet_type} onChange={e => setWalletType(e.target.value)}>
              <option value="HOT">Hot Wallet</option>
              <option value="COLD">Cold Wallet</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Hardwallet</label>
            <select className="input" value={form.hardwallet} onChange={e => set('hardwallet', e.target.value)}>
              {HARDWALLETS[form.wallet_type].map(w => <option key={w}>{w}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Exchange / Origem-Destino</label>
            <input className="input" placeholder="Binance, Foxbit, Coinbase..." value={form.counterparty} onChange={e => set('counterparty', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Taxa de rede (R$)</label>
            <input className="input font-mono" type="number" step="any" placeholder="0,00" value={form.fee} onChange={e => set('fee', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">TX Hash</label>
            <input className="input font-mono" placeholder="0x... / hash da transação" value={form.tx_hash} onChange={e => set('tx_hash', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Observações</label>
            <input className="input" placeholder="Opcional" value={form.obs} onChange={e => set('obs', e.target.value)} />
          </div>
        </div>

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
