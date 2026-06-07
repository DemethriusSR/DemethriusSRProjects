import { useState, useCallback } from 'react'

export function useAsync(fn) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const run = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn(...args)
      return result
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Erro inesperado'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [fn])

  return { run, loading, error }
}

export function useInterval(fn, ms) {
  const saved = { current: fn }
  saved.current = fn

  const start = useCallback(() => {
    const id = setInterval(() => saved.current(), ms)
    return () => clearInterval(id)
  }, [ms])

  return start
}
