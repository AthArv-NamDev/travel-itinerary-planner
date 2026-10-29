import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

const TripsCtx = createContext(null)
export const useTrips = () => useContext(TripsCtx)

/** Keeps the trip list (sidebar + dashboard) in sync across pages. */
export function TripsProvider({ children }) {
  const { user } = useAuth()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    try {
      setTrips(await api.listTrips())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) refresh()
  }, [user, refresh])

  const patchLocal = useCallback((id, patch) => {
    setTrips((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const removeLocal = useCallback((id) => setTrips((ts) => ts.filter((t) => t.id !== id)), [])

  const value = useMemo(
    () => ({ trips, loading, error, refresh, patchLocal, removeLocal }),
    [trips, loading, error, refresh, patchLocal, removeLocal],
  )
  return <TripsCtx.Provider value={value}>{children}</TripsCtx.Provider>
}
