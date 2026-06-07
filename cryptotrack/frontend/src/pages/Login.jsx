import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'

export default function Login() {
  const navigate = useNavigate()
  const { login, register } = useAuthStore()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name:'', email:'', password:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k,v) => setForm(f => ({...f, [k]:v}))

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await register(form.name, form.email, form.password)
      navigate('/')
    } catch (e) {
      setError(e.response?.data?.error || 'Erro. Verifique os dados.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <i className="ti ti-currency-bitcoin text-amber-500 text-4xl" />
          </div>
          <h1 className="text-2xl font-semibold">CryptoTrack</h1>
          <p className="text-zinc-500 text-sm mt-1">Controle total do seu portfólio cripto</p>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex gap-1 bg-zinc-800 rounded-lg p-1 mb-2">
            {['login','register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode===m ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {m === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Nome</label>
              <input className="input" placeholder="Seu nome" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
          )}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">E-mail</label>
            <input className="input" type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Senha</label>
            <input className="input" type="password" placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'} value={form.password} onChange={e => set('password', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button className="btn btn-primary w-full justify-center py-2.5" onClick={handleSubmit} disabled={loading}>
            {loading ? <><i className="ti ti-loader-2 animate-spin" /> Aguarde...</> : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4">
          Dados armazenados localmente com segurança
        </p>
      </div>
    </div>
  )
}
