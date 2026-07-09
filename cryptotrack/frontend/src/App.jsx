import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './store'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Transfers from './pages/Transfers'
import Portfolio from './pages/Portfolio'
import DeFi from './pages/DeFi'
import Prices from './pages/Prices'
import Login from './pages/Login'
import Settings from './pages/Settings'

function PrivateLayout() {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-zinc-950">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<PrivateLayout />}>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/transactions"  element={<Transactions />} />
          <Route path="/transfers"     element={<Transfers />} />
          <Route path="/portfolio"     element={<Portfolio />} />
          <Route path="/defi"          element={<DeFi />} />
          <Route path="/prices"        element={<Prices />} />
          <Route path="/settings"      element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
