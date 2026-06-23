import { create } from 'zustand'
import api from './services/api'

// ── Preferências ──────────────────────────────────────────────────────────────
export const usePrefsStore = create((set) => ({
  currency: localStorage.getItem('ct_currency') || 'BRL',
  btcUnit: localStorage.getItem('ct_btcUnit') || 'BTC',
  usdRate: parseFloat(localStorage.getItem('ct_usdRate') || '0'), // persiste entre sessões

  setCurrency: (v) => { localStorage.setItem('ct_currency', v); set({ currency: v }) },
  setBtcUnit: (v) => { localStorage.setItem('ct_btcUnit', v); set({ btcUnit: v }) },
  setUsdRate: (v) => {
    if (v && v > 0) {
      localStorage.setItem('ct_usdRate', String(v));
      set({ usdRate: v });
    }
  },
}))

// ── Auth ──────────────────────────────────────────────────────────────────────
export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('ct_user') || 'null'),
  token: localStorage.getItem('ct_token'),

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('ct_token', data.token)
    localStorage.setItem('ct_user', JSON.stringify(data.user))
    set({ user: data.user, token: data.token })
    return data
  },

  register: async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    localStorage.setItem('ct_token', data.token)
    localStorage.setItem('ct_user', JSON.stringify(data.user))
    set({ user: data.user, token: data.token })
    return data
  },

  logout: () => {
    localStorage.removeItem('ct_token')
    localStorage.removeItem('ct_user')
    set({ user: null, token: null })
  }
}))

// ── Portfolio ─────────────────────────────────────────────────────────────────
export const usePortfolioStore = create((set, get) => ({
  summary: null,
  prices: {},
  transactions: [],
  defi: [],
  loading: false,
  priceStatus: 'idle',

  fetchSummary: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/portfolio/summary')
      set({ summary: data, loading: false })
      // summary já traz usdBrl calculado pelo backend
      if (data.usdBrl && data.usdBrl > 0) {
        usePrefsStore.getState().setUsdRate(data.usdBrl)
      }
    } catch { set({ loading: false }) }
  },

  fetchPrices: async (refresh = false) => {
    set({ priceStatus: 'loading' })
    try {
      const { data } = await api.get(`/portfolio/prices${refresh ? '?refresh=true' : ''}`)
      set({ prices: data, priceStatus: 'live' })
      // __rate é injetado pelo backend com a taxa atual
      if (data.__rate?.usdBrl > 0) {
        usePrefsStore.getState().setUsdRate(data.__rate.usdBrl)
      }
    } catch { set({ priceStatus: 'error' }) }
  },

  fetchTransactions: async () => {
    const { data } = await api.get('/transactions')
    set({ transactions: data.data })
  },

  addTransaction: async (payload) => {
    const { data } = await api.post('/transactions', payload)
    await get().fetchSummary()
    await get().fetchTransactions()
    return data
  },

  deleteTransaction: async (id) => {
    await api.delete(`/transactions/${id}`)
    await get().fetchSummary()
    await get().fetchTransactions()
  },

  deleteTransactionsBulk: async (ids) => {

    await api.delete('/transactions/bulk',
      {
        data: { ids }
      }
    );

    const state = get();

    set({
      transactions:
        state.transactions.filter(
          t => !ids.includes(t.id)
        )
    });

    await get().fetchSummary();
  },

  fetchDefi: async () => {
    const { data } = await api.get('/defi')
    set({ defi: data })
  },

  addDefi: async (payload) => {
    const { data } = await api.post('/defi', payload)
    await get().fetchDefi()
    return data
  },

  closeDefi: async (id, exit_date, withdrawn) => {
    await api.patch(`/defi/${id}/close`, { exit_date, withdrawn })
    await get().fetchDefi()
  },

  deleteDefiBulk: async (ids) => {

    await api.delete(
      '/defi/bulk',
      {
        data: { ids }
      }
    );

    await get().fetchDefi();
  },

  deleteDefi: async (id) => {
    await api.delete(`/defi/${id}`)
    await get().fetchDefi()
  }
}))
