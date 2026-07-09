import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore, usePortfolioStore } from '../store'
import { CurrencySwap } from './ui'

const links = [
  { to: '/',             icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/transactions', icon: 'ti-arrows-exchange',   label: 'Transações' },
  { to: '/transfers',    icon: 'ti-wallet',            label: 'Transferências' },
  { to: '/portfolio',    icon: 'ti-chart-pie',         label: 'Portfólio' },
  { to: '/defi',         icon: 'ti-atom',              label: 'DeFi' },
  { to: '/prices',       icon: 'ti-trending-up',       label: 'Preços' },
  { to: '/settings',     icon: 'ti-settings',          label: 'Configurações' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { priceStatus }  = usePortfolioStore()
  const navigate = useNavigate()

  function handleLogout() { logout(); navigate('/login') }

  const dotColor = { live:'bg-emerald-400', loading:'bg-amber-400', error:'bg-red-400', idle:'bg-zinc-600' }

  return (
    <aside className="w-52 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <i className="ti ti-currency-bitcoin text-amber-500 text-2xl" />
          <span className="font-semibold text-base tracking-tight">CryptoTrack</span>
        </div>
      </div>

      {/* Currency swap */}
      <div className="px-3 py-2.5 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Moeda</span>
          <CurrencySwap />
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-0.5">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <i className={`ti ${l.icon} text-lg`} />
            {l.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className={`w-2 h-2 rounded-full ${dotColor[priceStatus]}`} />
          <span className="text-xs text-zinc-500">
            {priceStatus === 'live' ? 'Ao vivo · CoinGecko' : priceStatus === 'loading' ? 'Atualizando...' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-7 h-7 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center text-xs font-semibold">
            {user?.name?.slice(0,1).toUpperCase()}
          </div>
          <span className="text-xs text-zinc-400 flex-1 truncate">{user?.name}</span>
          <button onClick={handleLogout} className="text-zinc-600 hover:text-zinc-300 transition-colors" title="Sair">
            <i className="ti ti-logout text-base" />
          </button>
        </div>
      </div>
    </aside>
  )
}
